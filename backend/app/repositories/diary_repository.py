import json
from datetime import date

from sqlalchemy.orm import Session

from app.models.diary import Diary, DiaryPhoto


def get_diary_by_id(db: Session, diary_id: int) -> Diary | None:
    return db.query(Diary).filter(Diary.id == diary_id).first()


def get_diary_by_date(db: Session, baby_id: int, diary_date: date) -> Diary | None:
    return (
        db.query(Diary)
        .filter(Diary.baby_id == baby_id, Diary.diary_date == diary_date)
        .first()
    )


def create_diary(
    db: Session,
    baby_id: int,
    user_id: int,
    diary_date: date,
    title: str,
    content: str,
    is_ai_generated: bool,
    highlights: list[str],
    notice: str | None,
    image_urls: list[str],
) -> Diary:
    diary = Diary(
        baby_id=baby_id,
        user_id=user_id,
        diary_date=diary_date,
        title=title,
        content=content,
        is_ai_generated=is_ai_generated,
        highlights=json.dumps(highlights, ensure_ascii=False),
        notice=notice,
    )
    db.add(diary)
    db.flush()

    for i, url in enumerate(image_urls):
        db.add(DiaryPhoto(diary_id=diary.id, image_url=url, sort_order=i))
    db.flush()
    return diary


def update_diary(
    db: Session,
    diary: Diary,
    title: str | None,
    content: str | None,
    image_urls: list[str] | None,
) -> Diary:
    if title is not None:
        diary.title = title
    if content is not None:
        diary.content = content
    if image_urls is not None:
        db.query(DiaryPhoto).filter(DiaryPhoto.diary_id == diary.id).delete()
        for i, url in enumerate(image_urls):
            db.add(DiaryPhoto(diary_id=diary.id, image_url=url, sort_order=i))
    db.flush()
    return diary


def delete_diary(db: Session, diary: Diary) -> None:
    db.delete(diary)
    db.flush()
