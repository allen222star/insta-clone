from sqlalchemy.orm import Session

from .helpers import now_iso
from .models import Notification, UserSettings

NOTIFY_FLAG = {
    "like": "notify_likes",
    "comment": "notify_comments",
    "follow": "notify_follows",
    "message": "notify_messages",
}


def visible_types(prefs: UserSettings | None) -> list[str]:
    types = []
    for ntype, flag in NOTIFY_FLAG.items():
        if prefs is None or getattr(prefs, flag, True):
            types.append(ntype)
    return types


def add_notification(db: Session, user_id: int, actor_id: int, ntype: str, post_id: int | None = None) -> None:
    if user_id == actor_id:
        return
    if ntype not in NOTIFY_FLAG:
        return
    prefs = db.get(UserSettings, user_id)
    flag = NOTIFY_FLAG[ntype]
    if prefs is not None and not getattr(prefs, flag, True):
        return
    db.add(
        Notification(
            user_id=user_id,
            actor_id=actor_id,
            type=ntype,
            post_id=post_id,
            is_read=False,
            created_at=now_iso(),
        )
    )
