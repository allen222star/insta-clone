from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user, get_optional_user
from ..helpers import attach_hashtags, comment_out, now_iso, page, post_card, remove_post, user_public
from ..media import save_image
from ..models import Comment, Follow, Hashtag, Like, Post, PostHashtag, PostImage, Save, User
from ..notify import add_notification
from ..schemas import CommentIn, PostEditIn

router = APIRouter(prefix="/api", tags=["posts"])

POST_LOAD = (joinedload(Post.user), joinedload(Post.images))


def get_post_or_404(db: Session, post_id: int) -> Post:
    post = db.query(Post).options(*POST_LOAD).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시물을 찾을 수 없습니다.")
    return post


def collect_images(image: UploadFile | None, images: list[UploadFile] | None) -> list[UploadFile]:
    files = [item for item in (images or []) if item is not None and item.filename]
    if files:
        return files[:10]
    if image is not None and image.filename:
        return [image]
    return []


@router.get("/posts/feed")
def feed(
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    if me is None:
        total = db.query(Post).count()
        posts = (
            db.query(Post)
            .options(*POST_LOAD)
            .order_by(Post.created_at.desc())
            .offset(offset)
            .limit(limit)
            .all()
        )
        data = page([post_card(db, p, None) for p in posts], limit, offset, total)
        data["fallback"] = True
        return data
    following_ids = [row[0] for row in db.query(Follow.following_id).filter(Follow.follower_id == me.id).all()]
    ids = following_ids + [me.id]
    scoped = db.query(Post).filter(Post.user_id.in_(ids))
    total = scoped.count()
    fallback = total == 0
    q = db.query(Post).options(*POST_LOAD)
    if fallback:
        q = q.order_by(Post.created_at.desc())
        total = db.query(Post).count()
    else:
        q = q.filter(Post.user_id.in_(ids)).order_by(Post.created_at.desc())
    posts = q.offset(offset).limit(limit).all()
    data = page([post_card(db, p, me) for p in posts], limit, offset, total)
    data["fallback"] = fallback
    return data


@router.get("/posts/explore")
def explore(
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    total = db.query(Post).count()
    posts = (
        db.query(Post)
        .options(*POST_LOAD)
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return page([post_card(db, p, me) for p in posts], limit, offset, total)


@router.get("/posts/tag/{name}")
def posts_by_tag(
    name: str,
    limit: int = Query(12, ge=1, le=50),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    tag = db.query(Hashtag).filter(Hashtag.name == name.lower().lstrip("#")).first()
    if not tag:
        return page([], limit, offset, 0)
    q = (
        db.query(Post)
        .join(PostHashtag, PostHashtag.post_id == Post.id)
        .filter(PostHashtag.hashtag_id == tag.id)
    )
    total = q.count()
    posts = (
        q.options(*POST_LOAD)
        .order_by(Post.created_at.desc())
        .offset(offset)
        .limit(limit)
        .all()
    )
    return page([post_card(db, p, me) for p in posts], limit, offset, total)


@router.get("/hashtags")
def search_hashtags(
    q: str = "",
    limit: int = Query(20, ge=1, le=50),
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    query = q.strip().lstrip("#").lower()
    if not query:
        return {"items": []}
    tags = db.query(Hashtag).filter(Hashtag.name.like(f"%{query}%")).limit(limit).all()
    items = []
    for tag in tags:
        count = db.query(PostHashtag).filter(PostHashtag.hashtag_id == tag.id).count()
        items.append({"name": tag.name, "posts_count": count})
    return {"items": items}


@router.get("/posts/{post_id}")
def get_post(post_id: int, db: Session = Depends(get_db), me: User | None = Depends(get_optional_user)):
    return post_card(db, get_post_or_404(db, post_id), me)


@router.post("/posts", status_code=status.HTTP_201_CREATED)
def create_post(
    image: UploadFile | None = File(None),
    images: list[UploadFile] | None = File(None),
    caption: str = Form(""),
    location: str = Form(""),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    files = collect_images(image, images)
    if not files:
        raise HTTPException(status_code=400, detail="이미지가 필요합니다.")
    urls = [save_image(f, "posts") for f in files]
    post = Post(
        user_id=me.id,
        image_url=urls[0],
        caption=caption or "",
        location=(location or "")[:100],
        created_at=now_iso(),
    )
    db.add(post)
    db.commit()
    db.refresh(post)
    for i, url in enumerate(urls):
        db.add(PostImage(post_id=post.id, image_url=url, sort_order=i))
    attach_hashtags(db, post, post.caption)
    db.commit()
    return post_card(db, get_post_or_404(db, post.id), me)


@router.patch("/posts/{post_id}")
def edit_post(
    post_id: int,
    body: PostEditIn,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)
    if post.user_id != me.id:
        raise HTTPException(status_code=403, detail="게시물을 수정할 권한이 없습니다.")
    if body.caption is not None:
        post.caption = body.caption
        attach_hashtags(db, post, post.caption)
    if body.location is not None:
        post.location = body.location[:100]
    db.commit()
    db.refresh(post)
    return post_card(db, post, me)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    if post.user_id != me.id:
        raise HTTPException(status_code=403, detail="게시물을 삭제할 권한이 없습니다.")
    remove_post(db, post)
    db.commit()
    return None


@router.post("/posts/{post_id}/like")
def like_post(post_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    existing = db.query(Like).filter(Like.post_id == post.id, Like.user_id == me.id).first()
    if not existing:
        db.add(Like(user_id=me.id, post_id=post.id, created_at=now_iso()))
        add_notification(db, post.user_id, me.id, "like", post.id)
        db.commit()
    like_count = db.query(Like).filter(Like.post_id == post.id).count()
    return {"liked": True, "like_count": like_count}


@router.delete("/posts/{post_id}/like")
def unlike_post(post_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    row = db.query(Like).filter(Like.post_id == post.id, Like.user_id == me.id).first()
    if row:
        db.delete(row)
        db.commit()
    like_count = db.query(Like).filter(Like.post_id == post.id).count()
    return {"liked": False, "like_count": like_count}


@router.get("/posts/{post_id}/likes")
def list_likes(
    post_id: int,
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    post = get_post_or_404(db, post_id)
    users = db.query(User).join(Like, Like.user_id == User.id).filter(Like.post_id == post.id).all()
    return {"items": [user_public(db, u, me) for u in users]}


@router.post("/posts/{post_id}/save")
def save_post(post_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    existing = db.query(Save).filter(Save.post_id == post.id, Save.user_id == me.id).first()
    if not existing:
        db.add(Save(user_id=me.id, post_id=post.id, created_at=now_iso()))
        db.commit()
    return {"saved": True}


@router.delete("/posts/{post_id}/save")
def unsave_post(post_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    post = get_post_or_404(db, post_id)
    row = db.query(Save).filter(Save.post_id == post.id, Save.user_id == me.id).first()
    if row:
        db.delete(row)
        db.commit()
    return {"saved": False}


@router.get("/posts/{post_id}/comments")
def list_comments(
    post_id: int,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User | None = Depends(get_optional_user),
):
    post = get_post_or_404(db, post_id)
    q = (
        db.query(Comment)
        .options(joinedload(Comment.user))
        .filter(Comment.post_id == post.id)
        .order_by(Comment.created_at.asc())
    )
    total = q.count()
    comments = q.offset(offset).limit(limit).all()
    return page([comment_out(c) for c in comments], limit, offset, total)


@router.post("/posts/{post_id}/comments", status_code=status.HTTP_201_CREATED)
def add_comment(
    post_id: int,
    body: CommentIn,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    post = get_post_or_404(db, post_id)
    content = body.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="댓글 내용을 입력해 주세요.")
    comment = Comment(user_id=me.id, post_id=post.id, content=content, created_at=now_iso())
    db.add(comment)
    add_notification(db, post.user_id, me.id, "comment", post.id)
    db.commit()
    comment = db.query(Comment).options(joinedload(Comment.user)).filter(Comment.id == comment.id).first()
    return comment_out(comment)


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_comment(comment_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    comment = db.query(Comment).filter(Comment.id == comment_id).first()
    if not comment:
        raise HTTPException(status_code=404, detail="댓글을 찾을 수 없습니다.")
    if comment.user_id != me.id and comment.post.user_id != me.id:
        raise HTTPException(status_code=403, detail="댓글을 삭제할 권한이 없습니다.")
    db.delete(comment)
    db.commit()
    return None
