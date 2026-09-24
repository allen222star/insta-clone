from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..deps import get_current_user, get_optional_user
from ..helpers import now_iso, user_brief
from ..media import save_image
from ..models import Follow, Story, User

router = APIRouter(prefix="/api/stories", tags=["stories"])


def story_out(story: Story) -> dict:
    return {
        "id": story.id,
        "image_url": story.image_url,
        "created_at": story.created_at,
        "expires_at": story.expires_at,
    }


@router.get("")
def list_stories(db: Session = Depends(get_db), me: User | None = Depends(get_optional_user)):
    now = now_iso()
    if me is None:
        user_ids = [row[0] for row in db.query(Story.user_id).filter(Story.expires_at > now).distinct().all()]
    else:
        following_ids = [row[0] for row in db.query(Follow.following_id).filter(Follow.follower_id == me.id).all()]
        user_ids = list(set(following_ids + [me.id]))
    if not user_ids:
        return []
    stories = (
        db.query(Story)
        .filter(Story.user_id.in_(user_ids), Story.expires_at > now)
        .order_by(Story.created_at.asc())
        .all()
    )
    grouped: dict[int, list[Story]] = {}
    for s in stories:
        grouped.setdefault(s.user_id, []).append(s)
    result = []
    for uid, items in grouped.items():
        user = items[0].user
        result.append(
            {
                "user": user_brief(user),
                "items": [story_out(s) for s in items],
                "latest_at": items[-1].created_at,
            }
        )
    result.sort(key=lambda g: g["latest_at"], reverse=True)
    if me is None:
        return result
    mine = [g for g in result if g["user"]["id"] == me.id]
    others = [g for g in result if g["user"]["id"] != me.id]
    return mine + others


@router.post("", status_code=status.HTTP_201_CREATED)
def create_story(
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    url = save_image(image, "stories")
    created = datetime.now(timezone.utc)
    expires = created + timedelta(hours=24)
    story = Story(
        user_id=me.id,
        image_url=url,
        created_at=created.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
        expires_at=expires.isoformat(timespec="milliseconds").replace("+00:00", "Z"),
    )
    db.add(story)
    db.commit()
    db.refresh(story)
    return story_out(story)


@router.delete("/{story_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_story(story_id: int, db: Session = Depends(get_db), me: User = Depends(get_current_user)):
    story = db.query(Story).filter(Story.id == story_id).first()
    if not story:
        raise HTTPException(status_code=404, detail="스토리를 찾을 수 없습니다.")
    if story.user_id != me.id:
        raise HTTPException(status_code=403, detail="스토리를 삭제할 권한이 없습니다.")
    db.delete(story)
    db.commit()
    return None
