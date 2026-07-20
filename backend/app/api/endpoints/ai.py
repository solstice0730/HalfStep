from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.schemas.ai import AskRequest, DailySummaryRequest, DiaryGenerateRequest
from app.services.ai import answer_question, generate_daily_summary, generate_diary

router = APIRouter(prefix="/ai", tags=["ai"])


@router.post("/daily-summary", status_code=status.HTTP_200_OK)
def daily_summary(
    payload: DailySummaryRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = generate_daily_summary(
        db,
        user=current_user,
        baby_id=payload.babyId,
        target_date=payload.date,
    )
    return {"success": True, "data": result.model_dump()}


@router.post("/diary/generate", status_code=status.HTTP_200_OK)
def diary_generate(
    payload: DiaryGenerateRequest,
    current_user: User = Depends(get_current_user),
) -> dict:
    result = generate_diary(payload)
    return {"success": True, "data": result.model_dump()}


@router.post("/ask", status_code=status.HTTP_200_OK)
def ask(
    payload: AskRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> dict:
    result = answer_question(
        db,
        user=current_user,
        baby_id=payload.babyId,
        target_date=payload.date,
        question=payload.question,
    )
    return {"success": True, "data": result.model_dump()}
