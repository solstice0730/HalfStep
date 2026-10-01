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
