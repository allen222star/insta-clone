from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user
from ..models import User, UserSettings
from ..schemas import LANGS, SettingsIn

router = APIRouter(prefix="/api/settings", tags=["settings"])


def settings_out(user: User, row: UserSettings | None) -> dict:
    return {
        "is_private": bool(user.is_private),
        "show_activity": True if row is None else bool(row.show_activity),
        "suggest_account": True if row is None else bool(row.suggest_account),
        "language": "ko" if row is None else row.language,
        "notifications": {
            "likes": True if row is None else bool(row.notify_likes),
            "comments": True if row is None else bool(row.notify_comments),
            "follows": True if row is None else bool(row.notify_follows),
            "messages": True if row is None else bool(row.notify_messages),
            "stories": True if row is None else bool(row.notify_stories),
        },
    }


def get_or_create(db: Session, user: User) -> UserSettings:
    row = db.get(UserSettings, user.id)
    if row:
        return row
    row = UserSettings(user_id=user.id)
    db.add(row)
    db.flush()
    return row


@router.get("")
def get_settings(db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    row = get_or_create(db, me)
    db.commit()
    return settings_out(me, row)


@router.patch("")
def patch_settings(body: SettingsIn, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    row = get_or_create(db, me)
    if body.is_private is not None:
        me.is_private = body.is_private
    if body.show_activity is not None:
        row.show_activity = body.show_activity
    if body.suggest_account is not None:
        row.suggest_account = body.suggest_account
    if body.language is not None:
        if body.language not in LANGS:
            raise HTTPException(status_code=400, detail="지원하지 않는 언어입니다.")
        row.language = body.language
    if body.notifications:
        n = body.notifications
        if n.likes is not None:
            row.notify_likes = n.likes
        if n.comments is not None:
            row.notify_comments = n.comments
        if n.follows is not None:
            row.notify_follows = n.follows
        if n.messages is not None:
            row.notify_messages = n.messages
        if n.stories is not None:
            row.notify_stories = n.stories
    db.commit()
    db.refresh(me)
    return settings_out(me, row)
