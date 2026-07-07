import secrets
import string

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.repositories.family_room_repository import (
    add_family_room_member,
    count_family_room_members,
    create_family_chat_message,
    create_family_room,
    get_family_room_by_id,
    get_family_room_by_invite_code,
    get_family_room_by_owner,
    get_family_room_member,
    invite_code_exists,
    list_family_chat_messages,
    list_family_room_members,
)
from app.schemas.family_room import (
    FamilyChatAuthorResponse,
    FamilyChatMessageCreateRequest,
    FamilyChatMessageResponse,
    FamilyChatMessagesResponse,
    FamilyRoomCreateRequest,
    FamilyRoomCreateResponse,
    FamilyRoomDetailResponse,
    FamilyRoomJoinRequest,
    FamilyRoomJoinResponse,
    FamilyRoomMemberResponse,
)
from app.services.file_storage import save_family_chat_image

router = APIRouter(prefix="/family-rooms", tags=["family-rooms"])

MAX_FAMILY_ROOM_MEMBERS = 10
MAX_CHAT_MESSAGE_LIMIT = 100
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
        name=payload.name or "Family Room",
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
    _ensure_room_member(db, room_id=room_id, user_id=current_user.id)

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


@router.post("/{room_id}/chat/messages", status_code=status.HTTP_201_CREATED)
def create_chat_message(
    room_id: int,
    payload: FamilyChatMessageCreateRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _ensure_room_member(db, room_id=room_id, user_id=current_user.id)

    message = create_family_chat_message(
        db,
        room_id=room_id,
        user_id=current_user.id,
        content=payload.content,
        image_url=None,
    )
    db.commit()
    db.refresh(message)

    response = FamilyChatMessageResponse(
        id=str(message.id),
        author=FamilyChatAuthorResponse(
            userId=str(current_user.id),
            nickname=current_user.nickname,
        ),
        content=message.content,
        imageUrl=message.image_url,
        createdAt=message.created_at,
    )
    return {"success": True, "data": response.model_dump()}


@router.post("/{room_id}/chat/image-messages", status_code=status.HTTP_201_CREATED)
async def create_chat_image_message(
    room_id: int,
    content: str | None = Form(default=None, max_length=2000),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _ensure_room_member(db, room_id=room_id, user_id=current_user.id)

    normalized_content = content.strip() if content is not None else None
    if normalized_content == "":
        normalized_content = None
    image_url = await save_family_chat_image(room_id, image)

    message = create_family_chat_message(
        db,
        room_id=room_id,
        user_id=current_user.id,
        content=normalized_content,
        image_url=image_url,
    )
    db.commit()
    db.refresh(message)

    response = FamilyChatMessageResponse(
        id=str(message.id),
        author=FamilyChatAuthorResponse(
            userId=str(current_user.id),
            nickname=current_user.nickname,
        ),
        content=message.content,
        imageUrl=message.image_url,
        createdAt=message.created_at,
    )
    return {"success": True, "data": response.model_dump()}


@router.get("/{room_id}/chat/messages", status_code=status.HTTP_200_OK)
def get_chat_messages(
    room_id: int,
    cursor: int | None = Query(default=None, ge=1),
    limit: int = Query(default=50, ge=1, le=MAX_CHAT_MESSAGE_LIMIT),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    _ensure_room_member(db, room_id=room_id, user_id=current_user.id)

    rows = list_family_chat_messages(
        db,
        room_id=room_id,
        cursor=cursor,
        limit=limit + 1,
    )
    has_next = len(rows) > limit
    visible_rows = rows[:limit]
    next_cursor = str(visible_rows[-1][0].id) if has_next and visible_rows else None
    messages = [
        FamilyChatMessageResponse(
            id=str(message.id),
            author=FamilyChatAuthorResponse(
                userId=str(user.id),
                nickname=user.nickname,
            ),
            content=message.content,
            imageUrl=message.image_url,
            createdAt=message.created_at,
        )
        for message, user in reversed(visible_rows)
    ]

    response = FamilyChatMessagesResponse(
        messages=messages,
        nextCursor=next_cursor,
        hasNext=has_next,
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


def _ensure_room_member(db: Session, *, room_id: int, user_id: int) -> None:
    room = get_family_room_by_id(db, room_id)
    if room is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="NOT_FOUND",
        )

    member = get_family_room_member(
        db,
        room_id=room.id,
        user_id=user_id,
    )
    if member is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="FORBIDDEN",
        )
