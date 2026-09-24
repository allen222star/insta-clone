from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..auth import create_access_token, hash_password, verify_password
from ..database import get_db
from ..deps import get_current_user
from ..helpers import USERNAME_RE, now_iso, user_me
from ..models import User, UserSettings
from ..schemas import LoginIn, PasswordIn, SignupIn

router = APIRouter(prefix="/api/auth", tags=["auth"])


def token_payload(db: Session, user: User) -> dict:
    return {
        "access_token": create_access_token(user.id, user.username),
        "token_type": "bearer",
        "user": user_me(db, user),
    }


@router.post("/signup", status_code=status.HTTP_201_CREATED)
def signup(body: SignupIn, db: Session = Depends(get_db)):
    username = body.username.strip().lower()
    email = str(body.email).strip().lower()
    if not USERNAME_RE.match(username):
        raise HTTPException(
            status_code=400,
            detail="사용자 이름은 3–30자의 영문, 숫자, 마침표, 밑줄만 사용할 수 있습니다.",
        )
    if db.query(User).filter(User.username == username).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 사용자 이름입니다.")
    if db.query(User).filter(User.email == email).first():
        raise HTTPException(status_code=409, detail="이미 사용 중인 이메일입니다.")
    user = User(
        username=username,
        email=email,
        hashed_password=hash_password(body.password),
        full_name=(body.full_name or "").strip()[:100],
        bio="",
        website="",
        avatar_url=None,
        is_private=False,
        is_admin=False,
        created_at=now_iso(),
    )
    db.add(user)
    db.flush()
    db.add(UserSettings(user_id=user.id))
    db.commit()
    db.refresh(user)
    return token_payload(db, user)


@router.post("/login")
def login(body: LoginIn, db: Session = Depends(get_db)):
    ident = body.username.strip().lower()
    user = db.query(User).filter((User.username == ident) | (User.email == ident)).first()
    if not user or not verify_password(body.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="사용자 이름 또는 비밀번호가 올바르지 않습니다.")
    return token_payload(db, user)


@router.get("/me")
def me(current: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return user_me(db, current)


@router.post("/password")
def change_password(body: PasswordIn, db: Session = Depends(get_db), current: User = Depends(get_current_user)):
    if not verify_password(body.old_password, current.hashed_password):
        raise HTTPException(status_code=400, detail="이전 비밀번호가 올바르지 않습니다.")
    current.hashed_password = hash_password(body.new_password)
    db.commit()
    return {"ok": True}
