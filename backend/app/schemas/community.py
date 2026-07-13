from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CommunityPostCreate(BaseModel):
    category: str
    title: str = Field(min_length=2, max_length=150)
    content: str = Field(min_length=2, max_length=10000)
    imageUrls: list[str] = Field(default_factory=list, max_length=5)
    isAnonymous: bool = False

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("title", "content")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class CommunityAuthor(BaseModel):
    userId: str | None = None
    nickname: str
    isAnonymous: bool


class CommunityPostListItem(BaseModel):
    id: str
    category: str
    title: str
    preview: str
    author: CommunityAuthor
    likeCount: int = 0
    commentCount: int = 0
    imageCount: int
    createdAt: datetime


class CommunityPostDetail(CommunityPostListItem):
    content: str
    imageUrls: list[str]
    isLiked: bool = False
    updatedAt: datetime


class SimilarPost(BaseModel):
    id: str
    title: str
    preview: str


class CommunityPostCreated(BaseModel):
    id: str
    similarPosts: list[SimilarPost] = Field(default_factory=list)
