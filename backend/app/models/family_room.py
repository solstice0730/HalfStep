from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class FamilyRoom(Base):
    __tablename__ = "family_rooms"
    __table_args__ = (
        UniqueConstraint("invite_code", name="uq_family_rooms_invite_code"),
        UniqueConstraint("owner_user_id", name="uq_family_rooms_owner_user_id"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    baby_id: Mapped[str] = mapped_column(String(64), index=True)
    owner_user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    name: Mapped[str] = mapped_column(String(100))
    invite_code: Mapped[str] = mapped_column(String(20), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )


class FamilyRoomMember(Base):
    __tablename__ = "family_room_members"
    __table_args__ = (
        UniqueConstraint("family_room_id", "user_id", name="uq_family_room_members_room_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_room_id: Mapped[int] = mapped_column(ForeignKey("family_rooms.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    role: Mapped[str] = mapped_column(String(20))
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class FamilyChatMessage(Base):
    __tablename__ = "family_chat_messages"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    family_room_id: Mapped[int] = mapped_column(ForeignKey("family_rooms.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
