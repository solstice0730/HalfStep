from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, field_validator

GenderType = Literal["MALE", "FEMALE", "UNKNOWN"]


class BabyCreate(BaseModel):
    name: str
    birthDate: date
    gender: GenderType = "UNKNOWN"

    @field_validator('birthDate')
    @classmethod
    def birth_date_must_not_be_in_the_future(cls, value: date) -> date:
        if value > date.today():
            raise ValueError('birthDate must not be in the future')
        return value


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
