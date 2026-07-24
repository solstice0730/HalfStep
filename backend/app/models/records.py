from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, JSON, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.baby import Baby


class CareLog(Base):
    __tablename__ = "care_logs"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    baby_id: Mapped[int] = mapped_column(ForeignKey("babies.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
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
