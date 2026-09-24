from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_admin_user
from ..helpers import now_iso, page, post_card, remove_post
from ..models import Comment, Follow, Like, Message, Post, Story, User

router = APIRouter(prefix="/api/admin", tags=["admin"])

POST_LOAD = (joinedload(Post.user), joinedload(Post.images))


def _day_key(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%d")


def _count_on_day(db: Session, model, col, day: str) -> int:
    return db.query(func.count(model.id)).filter(col.like(f"{day}%")).scalar() or 0


def admin_user_out(db: Session, user: User) -> dict:
    posts_count = db.query(func.count(Post.id)).filter(Post.user_id == user.id).scalar() or 0
    return {
        "id": user.id,
        "username": user.username,
        "email": user.email,
        "full_name": user.full_name,
        "avatar_url": user.avatar_url,
        "is_private": bool(user.is_private),
        "is_admin": bool(user.is_admin),
        "created_at": user.created_at,
        "posts_count": posts_count,
    }


@router.get("/stats")
def stats(db: Session = Depends(get_db), _admin: User = Depends(get_admin_user)):
    now = datetime.now(timezone.utc)
    today = _day_key(now)
    week = _day_key(now - timedelta(days=6))
    series = []
    max_bar = 1
    for i in range(13, -1, -1):
        day = _day_key(now - timedelta(days=i))
        users = _count_on_day(db, User, User.created_at, day)
        posts = _count_on_day(db, Post, Post.created_at, day)
        max_bar = max(max_bar, users, posts)
        series.append({"date": day, "users": users, "posts": posts})
    return {
        "users": db.query(func.count(User.id)).scalar() or 0,
        "posts": db.query(func.count(Post.id)).scalar() or 0,
        "comments": db.query(func.count(Comment.id)).scalar() or 0,
        "likes": db.query(func.count(Like.id)).scalar() or 0,
        "follows": db.query(func.count(Follow.id)).scalar() or 0,
        "messages": db.query(func.count(Message.id)).scalar() or 0,
        "stories": db.query(func.count(Story.id)).filter(Story.expires_at > now_iso()).scalar() or 0,
        "users_today": _count_on_day(db, User, User.created_at, today),
        "posts_today": _count_on_day(db, Post, Post.created_at, today),
        "users_week": db.query(func.count(User.id)).filter(User.created_at >= week).scalar() or 0,
        "posts_week": db.query(func.count(Post.id)).filter(Post.created_at >= week).scalar() or 0,
        "series": series,
        "series_max": max_bar,
    }


@router.get("/users")
def list_users(
    q: str = "",
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    query = db.query(User)
    term = q.strip()
    if term:
        like = f"%{term.lower()}%"
        query = query.filter(
            or_(User.username.like(like), User.email.like(like), func.lower(User.full_name).like(like))
        )
    total = query.count()
    users = query.order_by(User.created_at.desc()).offset(offset).limit(limit).all()
    return page([admin_user_out(db, u) for u in users], limit, offset, total)


@router.delete("/users/{username}", status_code=status.HTTP_204_NO_CONTENT)
def delete_user(
    username: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_admin_user),
):
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    if user.id == admin.id or user.is_admin:
        raise HTTPException(status_code=409, detail="관리자 계정은 탈퇴 처리할 수 없습니다.")
    db.delete(user)
    db.commit()
    return None


@router.get("/posts")
def list_posts(
    q: str = "",
    limit: int = Query(20, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    query = db.query(Post).options(*POST_LOAD).join(User, User.id == Post.user_id)
    term = q.strip()
    if term:
        like = f"%{term.lower()}%"
        query = query.filter(or_(Post.caption.like(like), User.username.like(like)))
    total = query.count()
    posts = query.order_by(Post.created_at.desc()).offset(offset).limit(limit).all()
    return page([post_card(db, p, None) for p in posts], limit, offset, total)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(
    post_id: int,
    db: Session = Depends(get_db),
    _admin: User = Depends(get_admin_user),
):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시물을 찾을 수 없습니다.")
    remove_post(db, post)
    db.commit()
    return None
