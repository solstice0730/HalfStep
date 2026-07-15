from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, JSON, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Baby(Base):
    __tablename__ = "babies"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    birth_date: Mapped[date] = mapped_column(Date)
    gender: Mapped[str] = mapped_column(String(20), default="UNKNOWN")
    profile_image_url: Mapped[str] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())


class BabyCaregiver(Base):
    __tablename__ = "baby_caregivers"
    __table_args__ = (UniqueConstraint("baby_id", "user_id", name="uq_baby_caregiver"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    baby_id: Mapped[int] = mapped_column(ForeignKey("babies.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(20), default="CAREGIVER")
    relation: Mapped[str] = mapped_column(String(50), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class CareLog(Base):
    __tablename__ = "care_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    baby_id: Mapped[int] = mapped_column(ForeignKey("babies.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    log_type: Mapped[str] = mapped_column(String(20), index=True)
    occurred_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    ended_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=True)
    amount_ml: Mapped[int] = mapped_column(Integer, nullable=True)
    feeding_type: Mapped[str] = mapped_column(String(20), nullable=True)
    diaper_type: Mapped[str] = mapped_column(String(20), nullable=True)
    memo: Mapped[str] = mapped_column(Text, nullable=True)
    extra_data: Mapped[dict] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    baby: Mapped[Baby] = relationship()
