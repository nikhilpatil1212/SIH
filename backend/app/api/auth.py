import uuid
from datetime import datetime, timezone
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, Header, status
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from ..database.connection import get_db
from ..database.models import User
from ..services.auth_service import hash_password, verify_password, create_access_token, decode_access_token

router = APIRouter(prefix="/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str
    phone: Optional[str] = None
    role: Optional[str] = "USER"
    organization: Optional[str] = "NCPOR / MoES"

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    phone: Optional[str]
    role: str
    status: str
    organization: Optional[str]
    last_login: Optional[str]

class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse
    redirect_url: str

def get_current_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> User:
    """Dependency to retrieve and validate authenticated user from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Authentication token required")
    
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or expired authentication token")
    
    user = db.query(User).filter(User.id == payload["sub"]).first()
    if not user or user.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="User account not found or deactivated")
    
    return user

def get_optional_user(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    """Dependency to optionally retrieve and validate user from Authorization header without throwing 401."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload or "sub" not in payload:
        return None
    return db.query(User).filter(User.id == payload["sub"], User.status == "ACTIVE").first()

def require_admin(current_user: User = Depends(get_current_user)) -> User:
    """Dependency ensuring user has ADMIN privileges."""
    if current_user.role != "ADMIN":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Administrator privileges required")
    return current_user

@router.post("/login", response_model=LoginResponse)
def login(req: LoginRequest, db: Session = Depends(get_db)):
    """Authenticate user with email & password and return token with role redirection."""
    user = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if not user or not verify_password(req.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email address or password")
    
    if user.status != "ACTIVE":
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="This account has been deactivated. Contact an administrator.")
    
    # Update last login timestamp
    user.last_login = datetime.now(timezone.utc)
    db.commit()
    
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role, "name": user.name})
    redirect_url = "/admin/dashboard" if user.role == "ADMIN" else "/dashboard"
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
            "organization": user.organization,
            "last_login": user.last_login.isoformat() if user.last_login else None
        },
        "redirect_url": redirect_url
    }

@router.post("/register", response_model=LoginResponse)
def register(req: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user account."""
    existing = db.query(User).filter(User.email.ilike(req.email.strip())).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="An account with this email address already exists")
    
    new_id = f"usr-{uuid.uuid4().hex[:8]}"
    user = User(
        id=new_id,
        name=req.name.strip(),
        email=req.email.strip().lower(),
        phone=req.phone,
        password_hash=hash_password(req.password),
        role="ADMIN" if req.role and req.role.upper() == "ADMIN" else "USER",
        status="ACTIVE",
        organization=req.organization or "NCPOR / MoES",
        last_login=datetime.now(timezone.utc)
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": user.id, "email": user.email, "role": user.role, "name": user.name})
    redirect_url = "/admin/dashboard" if user.role == "ADMIN" else "/dashboard"
    
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email,
            "phone": user.phone,
            "role": user.role,
            "status": user.status,
            "organization": user.organization,
            "last_login": user.last_login.isoformat() if user.last_login else None
        },
        "redirect_url": redirect_url
    }

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    """Get current authenticated user profile."""
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "phone": current_user.phone,
        "role": current_user.role,
        "status": current_user.status,
        "organization": current_user.organization,
        "last_login": current_user.last_login.isoformat() if current_user.last_login else None
    }
