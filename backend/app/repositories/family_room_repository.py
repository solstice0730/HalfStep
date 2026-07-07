from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models.family_room import FamilyChatMessage, FamilyRoom, FamilyRoomMember
from app.models.user import User


def get_family_room_by_owner(db: Session, owner_user_id: int) -> FamilyRoom | None:
    statement = select(FamilyRoom).where(FamilyRoom.owner_user_id == owner_user_id)
    return db.scalar(statement)


def get_family_room_by_id(db: Session, room_id: int) -> FamilyRoom | None:
    return db.get(FamilyRoom, room_id)


def get_family_room_by_invite_code(db: Session, invite_code: str) -> FamilyRoom | None:
    statement = select(FamilyRoom).where(FamilyRoom.invite_code == invite_code)
    return db.scalar(statement)


def invite_code_exists(db: Session, invite_code: str) -> bool:
    statement = select(FamilyRoom.id).where(FamilyRoom.invite_code == invite_code)
    return db.scalar(statement) is not None


def create_family_room(
    db: Session,
    *,
    baby_id: str,
    owner_user_id: int,
    name: str,
    invite_code: str,
) -> FamilyRoom:
    room = FamilyRoom(
        baby_id=baby_id,
        owner_user_id=owner_user_id,
        name=name,
        invite_code=invite_code,
    )
    db.add(room)
    db.flush()
    return room


def get_family_room_member(
    db: Session,
    *,
    room_id: int,
    user_id: int,
) -> FamilyRoomMember | None:
    statement = select(FamilyRoomMember).where(
        FamilyRoomMember.family_room_id == room_id,
        FamilyRoomMember.user_id == user_id,
    )
    return db.scalar(statement)


def add_family_room_member(
    db: Session,
    *,
    room_id: int,
    user_id: int,
    role: str,
) -> FamilyRoomMember:
    member = FamilyRoomMember(
        family_room_id=room_id,
        user_id=user_id,
        role=role,
    )
    db.add(member)
    db.flush()
    return member


def count_family_room_members(db: Session, room_id: int) -> int:
    statement = select(func.count()).select_from(FamilyRoomMember).where(
        FamilyRoomMember.family_room_id == room_id,
    )
    return db.scalar(statement) or 0


def list_family_room_members(db: Session, room_id: int) -> list[tuple[FamilyRoomMember, User]]:
    statement = (
        select(FamilyRoomMember, User)
        .join(User, User.id == FamilyRoomMember.user_id)
        .where(FamilyRoomMember.family_room_id == room_id)
        .order_by(FamilyRoomMember.joined_at.asc(), FamilyRoomMember.id.asc())
    )
    return list(db.execute(statement).all())


def create_family_chat_message(
    db: Session,
    *,
    room_id: int,
    user_id: int,
    content: str | None,
    image_url: str | None = None,
) -> FamilyChatMessage:
    message = FamilyChatMessage(
        family_room_id=room_id,
        user_id=user_id,
        content=content,
        image_url=image_url,
    )
    db.add(message)
    db.flush()
    return message


def list_family_chat_messages(
    db: Session,
    *,
    room_id: int,
    cursor: int | None,
    limit: int,
) -> list[tuple[FamilyChatMessage, User]]:
    statement = (
        select(FamilyChatMessage, User)
        .join(User, User.id == FamilyChatMessage.user_id)
        .where(FamilyChatMessage.family_room_id == room_id)
        .order_by(FamilyChatMessage.id.desc())
        .limit(limit)
    )
    if cursor is not None:
        statement = statement.where(FamilyChatMessage.id < cursor)

    return list(db.execute(statement).all())
