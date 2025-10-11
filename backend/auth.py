from dotenv import load_dotenv
load_dotenv()


import os
from datetime import datetime, timedelta
from typing import Generator, Optional, Any

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session
import requests

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from models import User
from database.database import SessionLocal


SECRET_KEY = os.environ.get("SECRET_KEY", "dev_secret_change_me")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))

GOOGLE_CLIENT_ID = os.environ.get(
    "GOOGLE_CLIENT_ID",
    "39094537919-fpqfsor5dc2mrgbacotk4tlt1mc8j19u.apps.googleusercontent.com",
)
GOOGLE_CLIENT_SECRET = os.environ.get("GOOGLE_CLIENT_SECRET", "")
GOOGLE_DEV_ALLOW_INSECURE = os.environ.get("GOOGLE_DEV_ALLOW_INSECURE", "false").lower() in {"1", "true", "yes"}
GOOGLE_OAUTH_TOKEN_URL = "https://oauth2.googleapis.com/token"

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def verify_password(plain_password: str, hashed_password: Any) -> bool:
    if not hashed_password:
        return False
    try:
        hashed_value = str(hashed_password)
    except Exception:
        return False
    return pwd_context.verify(plain_password, hashed_value)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub") or ""
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    return user

def verify_google_id_token_and_get_email(google_id_token_str: str) -> str:
    try:
        request_adapter = google_requests.Request()
        idinfo = google_id_token.verify_oauth2_token(
            google_id_token_str,
            request_adapter,
            GOOGLE_CLIENT_ID,
        )
        aud = idinfo.get("aud")
        if aud and aud != GOOGLE_CLIENT_ID:
            raise ValueError("Invalid audience")
        email = idinfo.get("email")
        if not email:
            raise ValueError("Missing email in Google token")
        return email
    except Exception as exc:
        if GOOGLE_DEV_ALLOW_INSECURE:
            try:
                unverified = jwt.get_unverified_claims(google_id_token_str)
                email = unverified.get("email")
                if not email:
                    raise ValueError("Missing email in unverified token")
                return email
            except Exception:
                pass
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Google token verification failed",
        ) from exc


def save_google_tokens_for_user(
    db: Session,
    user: User,
    access_token: str,
    refresh_token: Optional[str] = None,
    expires_in: Optional[int] = None,
):
    user.google_access_token = access_token
    if refresh_token:
        user.google_refresh_token = refresh_token
    if expires_in:
        try:
            user.google_token_expiry = datetime.utcnow() + timedelta(seconds=int(expires_in))
        except Exception:
            user.google_token_expiry = None
    db.add(user)
    db.commit()
    db.refresh(user)


def is_valid_refresh_token(refresh_token: str) -> bool:
    """
    Basic validation for refresh token format.
    Google refresh tokens typically start with '1//' and are long strings.
    """
    if not refresh_token or not isinstance(refresh_token, str):
        return False
    
    # Check if it's obviously a placeholder
    placeholder_patterns = [
        "IL_TUO_REFRESH_TOKEN",
        "YOUR_REFRESH_TOKEN", 
        "REPLACE_WITH_REAL_TOKEN",
        "placeholder",
        "test_token"
    ]
    
    if any(pattern.lower() in refresh_token.lower() for pattern in placeholder_patterns):
        return False
    
    # Google refresh tokens are typically at least 50 characters long
    if len(refresh_token.strip()) < 20:
        return False
        
    return True


def refresh_access_token_with_refresh_token(refresh_token: str):
    """
    Usa il refresh_token per ottenere un nuovo access_token da Google OAuth.
    Restituisce il JSON della risposta con access_token, expires_in, ecc.
    """
    if not refresh_token:
        raise HTTPException(status_code=400, detail="Missing Google refresh token")
    
    if not is_valid_refresh_token(refresh_token):
        raise HTTPException(
            status_code=400, 
            detail="Invalid refresh token format. Please reconnect your Google account to get a valid refresh token."
        )

    if not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Missing GOOGLE_CLIENT_SECRET configuration")

    payload = {
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "refresh_token": refresh_token,
        "grant_type": "refresh_token",
    }

    try:
        resp = requests.post(GOOGLE_OAUTH_TOKEN_URL, data=payload, timeout=10)
    except requests.exceptions.RequestException as e:
        raise HTTPException(
            status_code=503, 
            detail=f"Failed to connect to Google OAuth service: {str(e)}"
        )
    
    if not resp.ok:
        # Parse the error response to provide more specific error messages
        try:
            error_data = resp.json()
            error_type = error_data.get("error", "unknown_error")
            error_description = error_data.get("error_description", "No description provided")
            
            if error_type == "invalid_grant":
                detail = (
                    "The refresh token is invalid, expired, or has been revoked. "
                    "Please reconnect your Google account to get a new refresh token."
                )
            elif error_type == "invalid_client":
                detail = "Invalid Google OAuth client configuration. Please check your client credentials."
            elif error_type == "invalid_request":
                detail = f"Invalid token refresh request: {error_description}"
            else:
                detail = f"Token refresh failed ({error_type}): {error_description}"
                
        except (ValueError, KeyError):
            detail = f"Token refresh failed with status {resp.status_code}: {resp.text}"
        
        raise HTTPException(status_code=401, detail=detail)

    return resp.json()

def exchange_code_for_tokens(code: str) -> dict:
    if not GOOGLE_CLIENT_SECRET:
        raise HTTPException(status_code=500, detail="Missing GOOGLE_CLIENT_SECRET in environment")

    payload = {
        "code": code,
        "client_id": GOOGLE_CLIENT_ID,
        "client_secret": GOOGLE_CLIENT_SECRET,
        "redirect_uri": os.getenv("GOOGLE_REDIRECT_URI", "http://localhost:8000/auth/google-calendar/callback"),
        "grant_type": "authorization_code",
    }

    resp = requests.post("https://oauth2.googleapis.com/token", data=payload)
    if not resp.ok:
        raise HTTPException(status_code=resp.status_code, detail=f"Google token exchange failed: {resp.text}")

    return resp.json()
