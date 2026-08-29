from datetime import datetime, timezone
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database.connection import get_db
from ..database.models import UserFeedback
from ..schemas.schemas import FeedbackCreateRequest, FeedbackResponse, FeedbackStatusUpdateRequest

router = APIRouter(prefix="/feedback", tags=["User Feedback & Mission Reports"])

def _to_feedback_response(f: UserFeedback) -> FeedbackResponse:
    return FeedbackResponse(
        id=f.id,
        user_id=f.user_id,
        user_name=f.user_name,
        user_email=f.user_email,
        category=f.category,
        rating=f.rating,
        subject=f.subject,
        message=f.message,
        status=f.status,
        created_at=f.created_at.strftime("%d %b %Y %H:%M UTC") if f.created_at else "Just now",
    )

@router.get("", response_model=List[FeedbackResponse])
def get_all_feedback(db: Session = Depends(get_db)):
    """Admin endpoint to fetch all user feedback and incident reports."""
    feedbacks = db.query(UserFeedback).order_by(UserFeedback.created_at.desc()).all()
    return [_to_feedback_response(f) for f in feedbacks]

@router.post("", response_model=FeedbackResponse, status_code=status.HTTP_201_CREATED)
def submit_feedback(req: FeedbackCreateRequest, db: Session = Depends(get_db)):
    """User endpoint to submit feedback or report an iceberg/routing incident."""
    new_feedback = UserFeedback(
        user_id=req.user_id,
        user_name=req.user_name.strip(),
        user_email=req.user_email.strip().lower(),
        category=req.category,
        rating=max(1, min(5, req.rating)),
        subject=req.subject.strip(),
        message=req.message.strip(),
        status="NEW",
        created_at=datetime.now(timezone.utc),
    )
    db.add(new_feedback)
    db.commit()
    db.refresh(new_feedback)
    return _to_feedback_response(new_feedback)

@router.patch("/{feedback_id}", response_model=FeedbackResponse)
def update_feedback_status(feedback_id: int, req: FeedbackStatusUpdateRequest, db: Session = Depends(get_db)):
    """Admin endpoint to update feedback status (REVIEWED, RESOLVED)."""
    feedback = db.query(UserFeedback).filter(UserFeedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found.")

    feedback.status = req.status
    db.commit()
    db.refresh(feedback)
    return _to_feedback_response(feedback)

@router.delete("/{feedback_id}")
def delete_feedback(feedback_id: int, db: Session = Depends(get_db)):
    """Admin endpoint to delete feedback."""
    feedback = db.query(UserFeedback).filter(UserFeedback.id == feedback_id).first()
    if not feedback:
        raise HTTPException(status_code=404, detail="Feedback not found.")

    db.delete(feedback)
    db.commit()
    return {"status": "SUCCESS", "message": f"Feedback #{feedback_id} deleted."}
