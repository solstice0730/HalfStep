import json
from datetime import date

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.diary import Diary
from app.repositories.diary_repository import (
    create_diary,
    delete_diary,
    get_diary_by_date,
    get_diary_by_id,
    update_diary,
)
from app.schemas.diary import DiaryResponse


def _to_response(diary: Diary) -> DiaryResponse:
    highlights = []
    if diary.highlights:
        try:
            highlights = json.loads(diary.highlights)
        except (json.JSONDecodeError, ValueError):
            highlights = []

    image_urls = [photo.image_url for photo in sorted(diary.photos, key=lambda p: p.sort_order)]

    return DiaryResponse(
        id=diary.id,
        babyId=diary.baby_id,
        date=diary.diary_date,
        title=diary.title,
        content=diary.content,
        isAiGenerated=diary.is_ai_generated,
        highlights=highlights,
        notice=diary.notice,
        imageUrls=image_urls,
        createdAt=diary.created_at,
        updatedAt=diary.updated_at,
    )


def save_diary(
    db: Session,
    user_id: int,
    baby_id: int,
    diary_date: date,
    title: str,
    content: str,
    is_ai_generated: bool,
    highlights: list[str],
    notice: str | None,
    image_urls: list[str],
) -> DiaryResponse:
    # 같은 날짜 일지가 이미 있으면 덮어쓰기
    existing = get_diary_by_date(db, baby_id=baby_id, diary_date=diary_date)
    if existing:
        diary = update_diary(
            db, existing,
            title=title,
            content=content,
            image_urls=image_urls,
        )
        existing.is_ai_generated = is_ai_generated
        existing.highlights = __import__("json").dumps(highlights, ensure_ascii=False)
        existing.notice = notice
    else:
        diary = create_diary(
            db,
            baby_id=baby_id,
            user_id=user_id,
            diary_date=diary_date,
            title=title,
            content=content,
            is_ai_generated=is_ai_generated,
            highlights=highlights,
            notice=notice,
            image_urls=image_urls,
        )
    db.commit()
    db.refresh(diary)
    return _to_response(diary)


def get_diary(db: Session, user_id: int, diary_id: int) -> DiaryResponse:
    diary = _get_owned_diary(db, user_id, diary_id)
    return _to_response(diary)


def get_diary_by_date_service(db: Session, user_id: int, baby_id: int, diary_date: date) -> DiaryResponse | None:
    diary = get_diary_by_date(db, baby_id=baby_id, diary_date=diary_date)
    if diary is None:
        return None
    if diary.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied.")
    return _to_response(diary)


def edit_diary(
    db: Session,
    user_id: int,
    diary_id: int,
    title: str | None,
    content: str | None,
    image_urls: list[str] | None,
) -> DiaryResponse:
    diary = _get_owned_diary(db, user_id, diary_id)
    diary = update_diary(db, diary, title=title, content=content, image_urls=image_urls)
    db.commit()
    db.refresh(diary)
    return _to_response(diary)


def remove_diary(db: Session, user_id: int, diary_id: int) -> None:
    diary = _get_owned_diary(db, user_id, diary_id)
    delete_diary(db, diary)
    db.commit()


def _get_owned_diary(db: Session, user_id: int, diary_id: int) -> Diary:
    diary = get_diary_by_id(db, diary_id)
    if diary is None or diary.user_id != user_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Diary not found.")
    return diary
