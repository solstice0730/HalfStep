from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel

GenderType = Literal["MALE", "FEMALE", "UNKNOWN"]


class BabyCreate(BaseModel):
    name: str
    birthDate: date
    gender: GenderType = "UNKNOWN"


class BabyUpdate(BaseModel):
    name: str | None = None
    gender: GenderType | None = None


class BabyResponse(BaseModel):
    id: int
    name: str
    birthDate: date
    gender: GenderType
    ageInDays: int
    isActive: bool

    model_config = {"from_attributes": True}


class UserMeResponse(BaseModel):
    id: int
    nickname: str | None
    email: str | None
    provider: str
    babies: list[BabyResponse]
    createdAt: datetime

    model_config = {"from_attributes": True}
