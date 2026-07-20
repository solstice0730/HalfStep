from datetime import date, datetime

from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Diary(Base):
    __tablename__ = "diaries"
    __table_args__ = (
        UniqueConstraint("baby_id", "diary_date", name="uq_diaries_baby_date"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    baby_id: Mapped[int] = mapped_column(ForeignKey("babies.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    diary_date: Mapped[date] = mapped_column(Date, index=True)
    title: Mapped[str] = mapped_column(String(255))
    content: Mapped[str] = mapped_column(Text)
    is_ai_generated: Mapped[bool] = mapped_column(Boolean, default=False)
    highlights: Mapped[str | None] = mapped_column(Text, nullable=True)  # JSON string
    notice: Mapped[str | None] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

    photos = relationship("DiaryPhoto", back_populates="diary", cascade="all, delete-orphan")


class DiaryPhoto(Base):
    __tablename__ = "diary_photos"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    diary_id: Mapped[int] = mapped_column(ForeignKey("diaries.id", ondelete="CASCADE"), index=True)
    image_url: Mapped[str] = mapped_column(String(500))
    sort_order: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    diary = relationship("Diary", back_populates="photos")
