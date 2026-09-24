from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..helpers import now_iso, page, user_brief
from ..models import Message, Post, User
from ..notify import add_notification
from ..schemas import MessageIn


def message_out(m: Message) -> dict:
    return {
        "id": m.id,
        "sender_id": m.sender_id,
        "receiver_id": m.receiver_id,
        "content": m.content,
        "is_read": m.is_read,
        "created_at": m.created_at,
        "post": {"id": m.post.id, "image_url": m.post.image_url} if m.post else None,
    }

router = APIRouter(prefix="/api/messages", tags=["messages"])


def get_other(db: Session, username: str) -> User:
    user = db.query(User).filter(User.username == username.lower()).first()
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    return user


@router.get("/conversations")
def conversations(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    msgs = (
        db.query(Message)
        .filter(or_(Message.sender_id == me.id, Message.receiver_id == me.id))
        .order_by(Message.created_at.desc())
        .all()
    )
    seen = set()
    result = []
    for m in msgs:
        other_id = m.receiver_id if m.sender_id == me.id else m.sender_id
        if other_id in seen:
            continue
        seen.add(other_id)
        other = db.get(User, other_id)
        unread = (
            db.query(Message)
            .filter(Message.sender_id == other_id, Message.receiver_id == me.id, Message.is_read.is_(False))
            .count()
        )
        result.append(
            {
                "user": user_brief(other),
                "last_message": m.content or ("게시물을 보냈습니다" if m.post_id else ""),
                "last_at": m.created_at,
                "unread_count": unread,
            }
        )
    return result


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    count = db.query(Message).filter(Message.receiver_id == me.id, Message.is_read.is_(False)).count()
    return {"count": count}


@router.get("/{username}")
def thread(
    username: str,
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    other = get_other(db, username)
    if other.id == me.id:
        raise HTTPException(status_code=400, detail="자기 자신과는 대화할 수 없습니다.")
    q = (
        db.query(Message)
        .filter(
            or_(
                (Message.sender_id == me.id) & (Message.receiver_id == other.id),
                (Message.sender_id == other.id) & (Message.receiver_id == me.id),
            )
        )
        .order_by(Message.created_at.asc())
    )
    total = q.count()
    items = q.offset(offset).limit(limit).all()
    db.query(Message).filter(
        Message.sender_id == other.id, Message.receiver_id == me.id, Message.is_read.is_(False)
    ).update({"is_read": True})
    db.commit()
    return page([message_out(m) for m in items], limit, offset, total)


@router.post("/{username}", status_code=status.HTTP_201_CREATED)
def send_message(
    username: str,
    body: MessageIn,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    other = get_other(db, username)
    if other.id == me.id:
        raise HTTPException(status_code=400, detail="자기 자신과는 대화할 수 없습니다.")
    content = (body.content or "").strip()
    post = None
    if body.post_id:
        post = db.query(Post).filter(Post.id == body.post_id).first()
        if not post:
            raise HTTPException(status_code=404, detail="게시물을 찾을 수 없습니다.")
    if not content and not post:
        raise HTTPException(status_code=400, detail="메시지 내용이 필요합니다.")
    msg = Message(
        sender_id=me.id,
        receiver_id=other.id,
        content=content,
        post_id=post.id if post else None,
        is_read=False,
        created_at=now_iso(),
    )
    db.add(msg)
    add_notification(db, other.id, me.id, "message")
    db.commit()
    db.refresh(msg)
    msg.post = post
    return message_out(msg)
