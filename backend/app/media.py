from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile

from .config import ALLOWED_IMAGE_TYPES, MAX_UPLOAD_BYTES, UPLOAD_DIR


def _image_type(file: UploadFile) -> str:
    content_type = (file.content_type or "").lower().split(";")[0].strip()
    if content_type in ALLOWED_IMAGE_TYPES:
        return content_type
    name = (file.filename or "").lower()
    for mime, ext in ALLOWED_IMAGE_TYPES.items():
        if name.endswith(ext) or (ext == ".jpg" and name.endswith(".jpeg")):
            return mime
    return content_type


def save_image(file: UploadFile, subdir: str = "") -> str:
    content_type = _image_type(file)
    if content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="이미지 파일(jpg, png, webp, gif)만 업로드할 수 있습니다.")
    data = file.file.read()
    if not data:
        raise HTTPException(status_code=400, detail="빈 파일입니다.")
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=400, detail="파일 크기는 10MB를 넘을 수 없습니다.")
    ext = ALLOWED_IMAGE_TYPES[content_type]
    folder = UPLOAD_DIR / subdir if subdir else UPLOAD_DIR
    folder.mkdir(parents=True, exist_ok=True)
    name = f"{uuid4().hex}{ext}"
    path: Path = folder / name
    path.write_bytes(data)
    rel = f"/uploads/{subdir}/{name}" if subdir else f"/uploads/{name}"
    return rel.replace("//", "/")
