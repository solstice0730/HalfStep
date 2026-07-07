import secrets
import string

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.family_room_repository import (
    add_family_room_member,
    count_family_room_members,
    create_family_room,
    get_family_room_by_id,
    get_family_room_by_invite_code,
    get_family_room_by_owner,
    get_family_room_member,
    invite_code_exists,
    list_family_room_members,
)
from app.schemas.family_room import (
    FamilyRoomCreateRequest,
    FamilyRoomCreateResponse,
    FamilyRoomDetailResponse,
    FamilyRoomJoinRequest,
    FamilyRoomJoinResponse,
    FamilyRoomMemberResponse,
)

router = APIRouter(prefix="/family-rooms", tags=["family-rooms"])

MAX_FAMILY_ROOM_MEMBERS = 10
INVITE_CODE_LENGTH = 6
INVITE_CODE_ALPHABET = string.ascii_uppercase + string.digits
INVITE_LINK_BASE_URL = "https://bangeoleum.com/join"


@router.post("", status_code=status.HTTP_201_CREATED)
def create_room(
    payload: FamilyRoomCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    if get_family_room_by_owner(db, current_user.id) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="DUPLICATE_FAMILY_ROOM",
        )

    room = create_family_room(
        db,
        baby_id=payload.babyId,
        owner_user_id=current_user.id,
        name=payload.name or "우리 가족방",
        invite_code=_generate_unique_invite_code(db),
    )
    add_family_room_member(
        db,
        room_id=room.id,
        user_id=current_user.id,
        role="ADMIN",
    )
    db.commit()
    db.refresh(room)

    response = FamilyRoomCreateResponse(
        id=str(room.id),
        name=room.name,
        inviteCode=room.invite_code,
        inviteLink=f"{INVITE_LINK_BASE_URL}/{room.invite_code}",
        createdAt=room.created_at,
    )
    return {"success": True, "data": response.model_dump()}


@router.post("/join", status_code=status.HTTP_200_OK)
def join_room(
    payload: FamilyRoomJoinRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    room = get_family_room_by_invite_code(db, payload.inviteCode.upper())
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="INVALID_INVITE_CODE",
        )

    existing_member = get_family_room_member(
        db,
        room_id=room.id,
        user_id=current_user.id,
    )
    if existing_member is not None:
        member_count = count_family_room_members(db, room.id)
        response = FamilyRoomJoinResponse(
            roomId=str(room.id),
            roomName=room.name,
            role=existing_member.role,
            memberCount=member_count,
        )
        return {"success": True, "data": response.model_dump()}

    member_count = count_family_room_members(db, room.id)
    if member_count >= MAX_FAMILY_ROOM_MEMBERS:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="FAMILY_ROOM_FULL",
        )

    member = add_family_room_member(
        db,
        room_id=room.id,
        user_id=current_user.id,
        role="MEMBER",
    )
    db.commit()

    response = FamilyRoomJoinResponse(
        roomId=str(room.id),
        roomName=room.name,
        role=member.role,
        memberCount=member_count + 1,
    )
    return {"success": True, "data": response.model_dump()}


@router.get("/{room_id}", status_code=status.HTTP_200_OK)
def get_room(
    room_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    room = get_family_room_by_id(db, room_id)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NOT_FOUND",
        )

    current_member = get_family_room_member(
        db,
        room_id=room.id,
        user_id=current_user.id,
    )
    if current_member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FORBIDDEN",
        )

    members = [
        FamilyRoomMemberResponse(
            userId=str(user.id),
            nickname=user.nickname,
            role=member.role,
            joinedAt=member.joined_at,
        )
        for member, user in list_family_room_members(db, room.id)
    ]
    response = FamilyRoomDetailResponse(
        id=str(room.id),
        name=room.name,
        inviteCode=room.invite_code,
        members=members,
    )
    return {"success": True, "data": response.model_dump()}


def _generate_unique_invite_code(db: Session) -> str:
    for _ in range(20):
        invite_code = "".join(secrets.choice(INVITE_CODE_ALPHABET) for _ in range(INVITE_CODE_LENGTH))
        if not invite_code_exists(db, invite_code):
            return invite_code

    raise HTTPException(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        detail="Could not generate invite code.",
    )
