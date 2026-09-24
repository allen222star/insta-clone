from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session, joinedload

from ..database import get_db
from ..deps import get_current_user
from ..helpers import user_brief
from ..models import Notification, User, UserSettings
from ..notify import visible_types

router = APIRouter(prefix="/api/notifications", tags=["notifications"])


def notif_out(n: Notification) -> dict:
    return {
        "id": n.id,
        "type": n.type,
        "is_read": n.is_read,
        "created_at": n.created_at,
        "actor": user_brief(n.actor),
        "post": {"id": n.post.id, "image_url": n.post.image_url} if n.post else None,
    }


def _base_query(db: Session, me: User):
    prefs = db.get(UserSettings, me.id)
    types = visible_types(prefs)
    q = (
        db.query(Notification)
        .options(joinedload(Notification.actor), joinedload(Notification.post))
        .filter(Notification.user_id == me.id)
    )
    if not types:
        return q.filter(Notification.id == -1)
    return q.filter(Notification.type.in_(types))


@router.get("")
def list_notifications(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    items = _base_query(db, me).order_by(Notification.created_at.desc()).all()
    return [notif_out(n) for n in items]


@router.post("/read")
def mark_read(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    db.query(Notification).filter(Notification.user_id == me.id, Notification.is_read.is_(False)).update(
        {"is_read": True}
    )
    db.commit()
    return {"ok": True}


@router.get("/unread-count")
def unread_count(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    count = _base_query(db, me).filter(Notification.is_read.is_(False)).count()
    return {"count": count}
