from __future__ import annotations

from datetime import date, datetime
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from typing import Self

from pydantic import BaseModel, Field, model_validator


class DailySummaryRequest(BaseModel):
    babyId: int = Field(gt=0)
    date: date


class DailySummaryResponse(BaseModel):
    summary: str
    highlights: list[str]
    safetyNotice: str
    source: str  # "ai" | "fallback"
    recordCount: int


class AskRequest(BaseModel):
    babyId: int = Field(gt=0)
    date: date
    question: str = Field(min_length=1)


class AskContext(BaseModel):
    ageDays: int
    ageMonths: int
    todayFeedingCount: int
    todayFeedingTotalMl: int
    todaySleepMinutes: int
    todayDiaperCount: int
    weeklyAvgDailyMl: int | None
    avgIntervalMinutes: int | None


class AskResponse(BaseModel):
    answer: str
    safetyNotice: str
    isMedicalRestricted: bool
    source: str  # "ai" | "fallback" | "restricted" | "no_data"
    evidence: list[str] = Field(default_factory=list)
    suggestDiaryLink: bool = False
    context: AskContext | None = None


class BabyInfo(BaseModel):
    name: str = Field(min_length=1)
    ageMonths: int | None = Field(default=None, ge=0)


class FeedingRecord(BaseModel):
    recordedAt: datetime
    feedingType: str | None = None
    amountMl: int | None = Field(default=None, ge=0)


class SleepRecord(BaseModel):
    startedAt: datetime
    endedAt: datetime | None = None

    @model_validator(mode="after")
    def _check_time_range(self) -> Self:
        if self.endedAt is not None and self.endedAt < self.startedAt:
            raise ValueError("endedAt must not be earlier than startedAt")
        return self


class DiaperRecord(BaseModel):
    recordedAt: datetime
    type: str | None = None


class DiaryRecords(BaseModel):
    feeding: list[FeedingRecord] = Field(default_factory=list)
    sleep: list[SleepRecord] = Field(default_factory=list)
    diaper: list[DiaperRecord] = Field(default_factory=list)


class DiaryGenerateRequest(BaseModel):
    baby: BabyInfo
    date: date
    records: DiaryRecords = Field(default_factory=DiaryRecords)
    photoDescriptions: list[str] = Field(default_factory=list)
    memo: str | None = None
    # AI 육아코치와 나눈 대화 중 보호자가 "오늘 일기에 추가"한 항목. 참고 정보로만 사용한다.
    conversations: list[str] = Field(default_factory=list, max_length=20)


class DiaryGenerateResponse(BaseModel):
    title: str
    content: str
    highlights: list[str]
    generatedByAi: bool
    notice: str


class PhotoAnalyzeRequest(BaseModel):
    photoUrls: list[str] = Field(min_length=1, max_length=5)


class PhotoCaption(BaseModel):
    url: str
    caption: str | None
    source: str  # "ai" | "fallback"


class PhotoAnalyzeResponse(BaseModel):
    items: list[PhotoCaption]
