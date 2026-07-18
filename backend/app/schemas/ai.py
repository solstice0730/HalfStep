from datetime import date, datetime
from typing import Self

from pydantic import BaseModel, Field, model_validator


class DailySummaryRequest(BaseModel):
    babyId: str = Field(min_length=1)
    date: date


class DailySummaryResponse(BaseModel):
    summary: str
    highlights: list[str]
    safetyNotice: str
    source: str  # "ai" | "fallback"
    recordCount: int


class AskRequest(BaseModel):
    babyId: str = Field(min_length=1)
    date: date
    question: str = Field(min_length=1)


class AskResponse(BaseModel):
    answer: str
    safetyNotice: str
    isMedicalRestricted: bool
    source: str  # "ai" | "fallback" | "restricted" | "no_data"


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


class DiaryGenerateResponse(BaseModel):
    title: str
    content: str
    highlights: list[str]
    generatedByAi: bool
    notice: str
