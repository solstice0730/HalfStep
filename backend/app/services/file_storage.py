from pathlib import Path
import secrets

from fastapi import HTTPException, UploadFile, status

from app.core.config import settings


ALLOWED_IMAGE_CONTENT_TYPES = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
}
MAX_IMAGE_BYTES = 10 * 1024 * 1024


async def save_family_chat_image(room_id: int, file: UploadFile) -> str:
    extension = ALLOWED_IMAGE_CONTENT_TYPES.get(file.content_type or "")
    if extension is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="UNSUPPORTED_FILE_TYPE",
        )

    content = await file.read()
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="FILE_TOO_LARGE",
        )

    relative_dir = Path("family-chat") / str(room_id)
    upload_dir = Path(settings.UPLOAD_DIR) / relative_dir
    upload_dir.mkdir(parents=True, exist_ok=True)

    filename = f"{secrets.token_urlsafe(16)}{extension}"
    destination = upload_dir / filename
    destination.write_bytes(content)

    public_path = f"/uploads/{relative_dir.as_posix()}/{filename}"
    return f"{settings.PUBLIC_BASE_URL.rstrip('/')}{public_path}"
