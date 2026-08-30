import uuid
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import Feedback, User
from .auth import get_current_user, require_admin

router = APIRouter(prefix="/feedback", tags=["Feedback"])

class FeedbackOut(BaseModel):
    id: str
    user_id: Optional[str] = None
    user_name: str
    user_email: Optional[str] = None
    rating: int
    feedback: str
    category: str
    status: str
    submitted_at: str

class CreateFeedbackIn(BaseModel):
    user_name: Optional[str] = None
    user_email: Optional[str] = None
    rating: int = 5
    feedback: str
    category: Optional[str] = "GENERAL"

class UpdateFeedbackIn(BaseModel):
    status: str  # "PENDING" | "REVIEWED"

@router.get("", response_model=List[FeedbackOut])
def get_feedback_list(
    search: Optional[str] = None,
    status_filter: Optional[str] = Query(None, alias="status"),
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to view and filter all user feedback."""
    query = db.query(Feedback)
    
    if search:
        s = f"%{search.strip()}%"
        query = query.filter(Feedback.feedback.ilike(s) | Feedback.user_name.ilike(s))
        
    if status_filter:
        query = query.filter(Feedback.status == status_filter.upper())
        
    items = query.order_by(Feedback.submitted_at.desc()).all()
    
    return [
        {
            "id": f.id,
            "user_id": f.user_id,
            "user_name": f.user_name,
            "user_email": f.user_email,
            "rating": f.rating,
            "feedback": f.feedback,
            "category": f.category,
            "status": f.status,
            "submitted_at": f.submitted_at.isoformat() if f.submitted_at else ""
        }
        for f in items
    ]

@router.post("", response_model=FeedbackOut, status_code=status.HTTP_201_CREATED)
def submit_feedback(
    req: CreateFeedbackIn,
    db: Session = Depends(get_db)
):
    """Public / Authenticated endpoint to submit user feedback."""
    rec = Feedback(
        id=f"FB-{uuid.uuid4().hex[:6].upper()}",
        user_name=req.user_name or "Anonymous Navigator",
        user_email=req.user_email,
        rating=max(1, min(5, req.rating)),
        feedback=req.feedback.strip(),
        category=req.category or "GENERAL",
        status="PENDING",
        submitted_at=datetime.now(timezone.utc)
    )
    db.add(rec)
    db.commit()
    db.refresh(rec)
    
    return {
        "id": rec.id,
        "user_id": rec.user_id,
        "user_name": rec.user_name,
        "user_email": rec.user_email,
        "rating": rec.rating,
        "feedback": rec.feedback,
        "category": rec.category,
        "status": rec.status,
        "submitted_at": rec.submitted_at.isoformat()
    }

@router.put("/{feedback_id}", response_model=FeedbackOut)
@router.post("/{feedback_id}/status", response_model=FeedbackOut)
def update_feedback_status(
    feedback_id: str,
    req: UpdateFeedbackIn,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to mark feedback as REVIEWED or PENDING."""
    rec = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Feedback not found")
        
    rec.status = req.status.upper()
    db.commit()
    db.refresh(rec)
    
    return {
        "id": rec.id,
        "user_id": rec.user_id,
        "user_name": rec.user_name,
        "user_email": rec.user_email,
        "rating": rec.rating,
        "feedback": rec.feedback,
        "category": rec.category,
        "status": rec.status,
        "submitted_at": rec.submitted_at.isoformat() if rec.submitted_at else ""
    }

@router.delete("/{feedback_id}")
def delete_feedback(
    feedback_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin)
):
    """Admin endpoint to delete feedback."""
    rec = db.query(Feedback).filter(Feedback.id == feedback_id).first()
    if not rec:
        raise HTTPException(status_code=404, detail="Feedback not found")
    db.delete(rec)
    db.commit()
    return {"status": "SUCCESS", "message": f"Feedback {feedback_id} deleted"}
