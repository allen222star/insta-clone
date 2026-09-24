from .auth import hash_password
from .database import SessionLocal
from .helpers import now_iso
from .models import User, UserSettings

ADMIN_USERNAME = "admin"
ADMIN_EMAIL = "admin@insta.local"
ADMIN_PASSWORD = "pass123"


def ensure_admin() -> None:
    db = SessionLocal()
    try:
        row = db.query(User).filter(User.username == ADMIN_USERNAME).first()
        if row:
            if not row.is_admin:
                row.is_admin = True
                db.commit()
            return
        user = User(
            username=ADMIN_USERNAME,
            email=ADMIN_EMAIL,
            hashed_password=hash_password(ADMIN_PASSWORD),
            full_name="관리자",
            bio="",
            website="",
            avatar_url=None,
            is_private=False,
            is_admin=True,
            created_at=now_iso(),
        )
        db.add(user)
        db.flush()
        db.add(UserSettings(user_id=user.id, suggest_account=False))
        db.commit()
    finally:
        db.close()
