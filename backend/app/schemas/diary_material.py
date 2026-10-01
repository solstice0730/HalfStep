from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, Field, field_validator


class DiaryMaterialCreate(BaseModel):
    babyId: int = Field(gt=0)
    date: date
    source: Literal["CHAT", "MEMO"]
    content: str = Field(min_length=1, max_length=4000)

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("content must not be blank")
        return stripped


class DiaryMaterialResponse(BaseModel):
    id: int
    babyId: int
    date: date
    source: str
    content: str
    createdAt: datetime


class DiaryMaterialCounts(BaseModel):
    chat: int
    memo: int


class DiaryMaterialList(BaseModel):
    items: list[DiaryMaterialResponse]
    counts: DiaryMaterialCounts


class DiaryMemoUpsert(BaseModel):
    babyId: int = Field(gt=0)
    date: date
    content: str = Field(max_length=4000)
