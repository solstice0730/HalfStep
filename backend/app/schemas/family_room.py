from datetime import datetime

from pydantic import BaseModel, Field


class FamilyRoomCreateRequest(BaseModel):
    babyId: str = Field(min_length=1, max_length=64)
    name: str | None = Field(default=None, min_length=1, max_length=100)


class FamilyRoomJoinRequest(BaseModel):
    inviteCode: str = Field(min_length=1, max_length=20)


class FamilyRoomCreateResponse(BaseModel):
    id: str
    name: str
    inviteCode: str
    inviteLink: str
    createdAt: datetime


class FamilyRoomJoinResponse(BaseModel):
    roomId: str
    roomName: str
    role: str
    memberCount: int


class FamilyRoomMemberResponse(BaseModel):
    userId: str
    nickname: str | None = None
    role: str
    joinedAt: datetime


class FamilyRoomDetailResponse(BaseModel):
    id: str
    name: str
    inviteCode: str
    members: list[FamilyRoomMemberResponse]


class FamilyChatMessageCreateRequest(BaseModel):
    content: str = Field(min_length=1, max_length=2000)


class FamilyChatAuthorResponse(BaseModel):
    userId: str
    nickname: str | None = None


class FamilyChatMessageResponse(BaseModel):
    id: str
    author: FamilyChatAuthorResponse
    content: str
    createdAt: datetime


class FamilyChatMessagesResponse(BaseModel):
    messages: list[FamilyChatMessageResponse]
    nextCursor: str | None = None
    hasNext: bool
