from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel


class DiaryCreate(BaseModel):
    babyId: int
    date: date
    title: str
    content: str
    isAiGenerated: bool = False
    highlights: list[str] = []
    notice: str | None = None
    imageUrls: list[str] = []


class DiaryUpdate(BaseModel):
    title: str | None = None
    content: str | None = None
    imageUrls: list[str] | None = None


class DiaryPhotoResponse(BaseModel):
    id: int
    imageUrl: str
    sortOrder: int

    model_config = {"from_attributes": True}


class DiaryResponse(BaseModel):
    id: int
    babyId: int
    date: date
    title: str
    content: str
    isAiGenerated: bool
    highlights: list[str]
    notice: str | None
    imageUrls: list[str]
    createdAt: datetime
    updatedAt: datetime

    model_config = {"from_attributes": True}
