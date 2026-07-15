from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field, model_validator


class FeedingRecordCreate(BaseModel):
    babyId: int = Field(gt=0)
    occurredAt: datetime
    feedingType: Literal["BREAST", "FORMULA", "MIXED"]
    amountMl: int | None = Field(default=None, gt=0, le=500)
    durationMinutes: int | None = Field(default=None, gt=0, le=180)
    breastSide: Literal["LEFT", "RIGHT", "BOTH"] | None = None
    burped: bool | None = None
    memo: str | None = Field(default=None, max_length=1000)

    @model_validator(mode="after")
    def validate_amount_or_duration(self):
        if self.amountMl is None and self.durationMinutes is None:
            raise ValueError("amountMl or durationMinutes is required")
        return self


class SleepRecordCreate(BaseModel):
    babyId: int = Field(gt=0)
    startedAt: datetime
    endedAt: datetime
    sleepType: Literal["NAP", "NIGHT"] | None = None
    status: Literal["PEACEFUL", "RESTLESS", "WOKE_OFTEN"] | None = None

    @model_validator(mode="after")
    def validate_period(self):
        if self.endedAt <= self.startedAt:
            raise ValueError("endedAt must be after startedAt")
        return self


class UrineRecordCreate(BaseModel):
    babyId: int = Field(gt=0)
    occurredAt: datetime
    amount: Literal["SMALL", "MEDIUM", "LARGE"] | None = None
    color: Literal["NORMAL", "DARK_YELLOW", "PINK", "RED", "OTHER"] | None = None


class StoolRecordCreate(BaseModel):
    babyId: int = Field(gt=0)
    occurredAt: datetime
    amount: Literal["SMALL", "MEDIUM", "LARGE"] | None = None
    color: Literal["NORMAL", "GREEN", "BLACK", "RED", "WHITE", "OTHER"] | None = None
    form: Literal["WATERY", "SOFT", "NORMAL", "HARD"] | None = None
    photoUrl: str | None = Field(default=None, max_length=1000)
