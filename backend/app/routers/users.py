from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, get_optional_user
from ..helpers import is_following, now_iso, page, post_card, user_me, user_public
from ..media import save_image
from ..models import Follow, Post, Save, User, UserSettings
from ..notify import add_notification

router = APIRouter(prefix="/api/users", tags=["users"])

POST_LOAD = (joinedload(Post.user), joinedload(Post.images))


def get_user_or_404(db: Session, username: str) -> User:
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


@router.get("/suggested")
def suggested(
    limit: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    following_ids = [row[0] for row in db.query(Follow.following_id).filter(Follow.follower_id == me.id).all()]
    follower_counts = (
        db.query(Follow.following_id, func.count(Follow.id).label("fc")).group_by(Follow.following_id).subquery()
    )
    q = (
        db.query(User)
        .outerjoin(UserSettings, UserSettings.user_id == User.id)
        .outerjoin(follower_counts, follower_counts.c.following_id == User.id)
        .filter(User.id != me.id)
        .filter(User.is_admin.is_(False))
        .filter(or_(UserSettings.suggest_account.is_(True), UserSettings.user_id.is_(None)))
    )
    if following_ids:
        q = q.filter(~User.id.in_(following_ids))
    users = q.order_by(func.coalesce(follower_counts.c.fc, 0).desc(), User.id.asc()).limit(limit).all()
    return [user_public(db, u, me) for u in users]


@router.get("/search")
def search_users(
    q: str = "",
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    query = q.strip()
    if not query:
        return {"items": [], "limit": limit, "offset": offset, "has_more": False}
    like = f"%{query.lower()}%"
    filt = ((User.username.like(like)) | (func.lower(User.full_name).like(like))) & User.is_admin.is_(False)
    total = db.query(User).filter(filt).count()
    users = db.query(User).filter(filt).offset(offset).limit(limit).all()
    return page([user_public(db, u, me) for u in users], limit, offset, total)


@router.get("/me/saved")
def my_saved(
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    q = (
        db.query(Post)
        .join(Save, Save.post_id == Post.id)
        .filter(Save.user_id == me.id)
        .order_by(Save.created_at.desc())
    )
    total = q.count()
    posts = q.options(*POST_LOAD).offset(offset).limit(limit).all()
    return page([post_card(db, p, me) for p in posts], limit, offset, total)


@router.patch("/me")
def update_me(
    full_name: str | None = Form(None),
    bio: str | None = Form(None),
    website: str | None = Form(None),
    avatar: UploadFile | None = File(None),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    if full_name is not None:
        me.full_name = full_name[:100]
    if bio is not None:
        me.bio = bio[:150]
    if website is not None:
        me.website = website[:255]
    if avatar is not None and avatar.filename:
        me.avatar_url = save_image(avatar, "avatars")
    db.commit()
    db.refresh(me)
    return user_me(db, me)


@router.get("/{username}")
def get_user(username: str, db: Session = Depends(get_db), me: User | None = Depends(get_optional_user)):
    return user_public(db, get_user_or_404(db, username), me)


@router.get("/{username}/posts")
def user_posts(
    username: str,
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    user = get_user_or_404(db, username)
    if user.is_private and (not me or (me.id != user.id and not is_following(db, me.id, user.id))):
        return page([], limit, offset, 0)
    q = db.query(Post).filter(Post.user_id == user.id)
    total = q.count()
    posts = q.options(*POST_LOAD).order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
    return page([post_card(db, p, me) for p in posts], limit, offset, total)


@router.get("/{username}/followers")
def followers(
    username: str,
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    user = get_user_or_404(db, username)
    users = db.query(User).join(Follow, Follow.follower_id == User.id).filter(Follow.following_id == user.id).all()
    return {"items": [user_public(db, u, me) for u in users]}


@router.get("/{username}/following")
def following(
    username: str,
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    user = get_user_or_404(db, username)
    users = db.query(User).join(Follow, Follow.following_id == User.id).filter(Follow.follower_id == user.id).all()
    return {"items": [user_public(db, u, me) for u in users]}


@router.post("/{username}/follow")
def follow(username: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    user = get_user_or_404(db, username)
    if user.id == me.id:
        raise HTTPException(status_code=409, detail="자기 자신은 팔로우할 수 없습니다.")
    existing = db.query(Follow).filter(Follow.follower_id == me.id, Follow.following_id == user.id).first()
    if not existing:
        db.add(Follow(follower_id=me.id, following_id=user.id, created_at=now_iso()))
        add_notification(db, user.id, me.id, "follow")
        db.commit()
    return user_public(db, user, me)


@router.delete("/{username}/follow")
def unfollow(username: str, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    user = get_user_or_404(db, username)
    row = db.query(Follow).filter(Follow.follower_id == me.id, Follow.following_id == user.id).first()
    if row:
        db.delete(row)
        db.commit()
    return user_public(db, user, me)
