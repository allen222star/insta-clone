import re
from datetime import datetime, timezone

from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from .models import Comment, Follow, Hashtag, Like, Message, Notification, Post, PostHashtag, Save, User

HASHTAG_RE = re.compile(r"(?<!\w)#(\w{1,50})", re.UNICODE)
USERNAME_RE = re.compile(r"^[a-zA-Z0-9._]{3,30}$")


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_hashtags(caption: str) -> list[str]:
    names = []
    seen = set()
    for match in HASHTAG_RE.finditer(caption or ""):
        name = match.group(1).lower()
        if name not in seen:
            seen.add(name)
            names.append(name)
    return names


def remove_post(db: Session, post: Post) -> None:
    """Delete a post and related rows that SQLite cannot cascade safely.

    Shared DMs use empty content + post_id. messages.post_id is ON DELETE SET NULL,
    which then fails ck_messages_body (content empty AND post_id null).
    """
    db.query(Message).filter(Message.post_id == post.id, Message.content == "").delete(
        synchronize_session=False
    )
    db.query(Message).filter(Message.post_id == post.id).update(
        {Message.post_id: None}, synchronize_session=False
    )
    db.query(Notification).filter(Notification.post_id == post.id).delete(synchronize_session=False)
    db.delete(post)


def attach_hashtags(db: Session, post: Post, caption: str) -> None:
    db.query(PostHashtag).filter(PostHashtag.post_id == post.id).delete()
    for name in parse_hashtags(caption):
        tag = db.query(Hashtag).filter(Hashtag.name == name).first()
        if not tag:
            tag = Hashtag(name=name)
            db.add(tag)
            db.flush()
        db.add(PostHashtag(post_id=post.id, hashtag_id=tag.id))


def is_following(db: Session, follower_id: int, following_id: int) -> bool:
    if follower_id == following_id:
        return False
    return (
        db.query(Follow)
        .filter(Follow.follower_id == follower_id, Follow.following_id == following_id)
        .first()
        is not None
    )


def user_counts(db: Session, user_id: int) -> dict:
    posts_count = db.query(func.count(Post.id)).filter(Post.user_id == user_id).scalar() or 0
    followers_count = db.query(func.count(Follow.id)).filter(Follow.following_id == user_id).scalar() or 0
    following_count = db.query(func.count(Follow.id)).filter(Follow.follower_id == user_id).scalar() or 0
    return {
        "posts_count": posts_count,
        "followers_count": followers_count,
        "following_count": following_count,
    }


def user_brief(user: User) -> dict:
    return {
        "id": user.id,
        "username": user.username,
        "avatar_url": user.avatar_url,
        "full_name": user.full_name,
    }


def user_public(db: Session, user: User, me: User | None) -> dict:
    data = {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "bio": user.bio,
        "website": user.website,
        "avatar_url": user.avatar_url,
        "is_me": bool(me and me.id == user.id),
        "is_following": bool(me and is_following(db, me.id, user.id)),
        "is_private": bool(user.is_private),
        **user_counts(db, user.id),
    }
    return data


def user_me(db: Session, user: User) -> dict:
    data = user_public(db, user, user)
    data["email"] = user.email
    data["is_admin"] = bool(user.is_admin)
    data["created_at"] = user.created_at
    return data


def post_card(db: Session, post: Post, me: User | None) -> dict:
    like_count = db.query(func.count(Like.id)).filter(Like.post_id == post.id).scalar() or 0
    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post.id).scalar() or 0
    liked = False
    saved = False
    if me:
        liked = db.query(Like).filter(Like.post_id == post.id, Like.user_id == me.id).first() is not None
        saved = db.query(Save).filter(Save.post_id == post.id, Save.user_id == me.id).first() is not None
    imgs = [img.image_url for img in sorted(post.images, key=lambda x: x.sort_order)] if post.images else []
    if not imgs and post.image_url:
        imgs = [post.image_url]
    return {
        "id": post.id,
        "image_url": imgs[0] if imgs else post.image_url,
        "images": imgs,
        "caption": post.caption,
        "location": post.location,
        "created_at": post.created_at,
        "like_count": like_count,
        "comment_count": comment_count,
        "liked_by_me": liked,
        "saved_by_me": saved,
        "user": user_brief(post.user),
    }


def comment_out(comment: Comment) -> dict:
    return {
        "id": comment.id,
        "content": comment.content,
        "created_at": comment.created_at,
        "user": user_brief(comment.user),
    }


def page(items: list, limit: int, offset: int, total: int | None = None) -> dict:
    has_more = (offset + limit) < total if total is not None else len(items) == limit
    return {"items": items, "limit": limit, "offset": offset, "has_more": has_more}


def find_user(db: Session, username_or_email: str) -> User | None:
    value = username_or_email.strip()
    return (
        db.query(User)
        .filter(or_(User.username == value.lower(), User.email == value.lower(), User.email == value))
        .first()
    )
