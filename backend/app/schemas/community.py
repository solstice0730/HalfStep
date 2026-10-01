from datetime import datetime

from pydantic import BaseModel, Field, field_validator


class CommunityPostCreate(BaseModel):
    category: str
    title: str = Field(min_length=2, max_length=150)
    content: str = Field(min_length=2, max_length=10000)
    imageUrls: list[str] = Field(default_factory=list, max_length=5)
    babyAgeMonths: int | None = Field(default=None, ge=0, le=24)
    isAnonymous: bool = False

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str) -> str:
        return value.strip().upper()

    @field_validator("title", "content")
    @classmethod
    def strip_text(cls, value: str) -> str:
        return value.strip()


class CommunityPostUpdate(BaseModel):
    category: str | None = None
    title: str | None = Field(default=None, min_length=2, max_length=150)
    content: str | None = Field(default=None, min_length=2, max_length=10000)
    imageUrls: list[str] | None = Field(default=None, max_length=5)
    babyAgeMonths: int | None = Field(default=None, ge=0, le=24)
    isAnonymous: bool | None = None
    # babyAgeMonths를 "월령 무관"으로 되돌리고 싶을 때 true
    clearBabyAge: bool = False

    @field_validator("category")
    @classmethod
    def normalize_category(cls, value: str | None) -> str | None:
        return value.strip().upper() if value else value

    @field_validator("title", "content")
    @classmethod
    def strip_text(cls, value: str | None) -> str | None:
        return value.strip() if value is not None else value


class CommunityAuthor(BaseModel):
    userId: str | None = None
    nickname: str
    isAnonymous: bool


class CommunityPostListItem(BaseModel):
    id: str
    category: str
    title: str
    preview: str
    babyAgeMonths: int | None
    author: CommunityAuthor
    likeCount: int = 0
    isLiked: bool = False
    isBookmarked: bool = False
    commentCount: int = 0
    imageCount: int
    createdAt: datetime


class CommunityPostDetail(CommunityPostListItem):
    content: str
    imageUrls: list[str]
    updatedAt: datetime


class ReactionState(BaseModel):
    likeCount: int
    isLiked: bool
    isBookmarked: bool


class SimilarPost(BaseModel):
    id: str
    title: str
    preview: str


class CommunityPostCreated(BaseModel):
    id: str
    similarPosts: list[SimilarPost] = Field(default_factory=list)


class CommunityCommentCreate(BaseModel):
    content: str = Field(min_length=1, max_length=1000)
    isAnonymous: bool = False

    @field_validator("content")
    @classmethod
    def strip_content(cls, value: str) -> str:
        stripped = value.strip()
        if not stripped:
            raise ValueError("content must not be blank")
        return stripped


class CommunityCommentResponse(BaseModel):
    id: str
    postId: str
    content: str
    author: CommunityAuthor
    isMine: bool
    createdAt: datetime
