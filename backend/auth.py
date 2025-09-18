import os
from datetime import datetime, timedelta
from typing import Generator, Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from google.oauth2 import id_token as google_id_token
from google.auth.transport import requests as google_requests

from models import User
from database.database import SessionLocal

# Configurazione da variabili d'ambiente (con fallback di sviluppo)
SECRET_KEY = os.environ.get("SECRET_KEY", "dev_secret_change_me")
ALGORITHM = os.environ.get("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
GOOGLE_CLIENT_ID = os.environ.get(
    "GOOGLE_CLIENT_ID",
    "39094537919-fpqfsor5dc2mrgbacotk4tlt1mc8j19u.apps.googleusercontent.com",
)
GOOGLE_DEV_ALLOW_INSECURE = os.environ.get("GOOGLE_DEV_ALLOW_INSECURE", "false").lower() in {"1", "true", "yes"}

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


# --- Database dependency ---
def get_db() -> Generator:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# --- Password utilities ---
def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


# --- JWT utilities ---
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


# --- Current user ---
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


# --- Google ID token verification ---
def verify_google_id_token_and_get_email(google_id_token_str: str) -> str:
    """
    Verifica un Google ID token e restituisce l'email associata se valido.
    Lancia HTTPException 401 se invalido.
    """
    try:
        request_adapter = google_requests.Request()
        idinfo = google_id_token.verify_oauth2_token(
            google_id_token_str,
            request_adapter,
            GOOGLE_CLIENT_ID,
        )
        # Verifica audience esplicita se presente
        aud = idinfo.get("aud")
        if aud and aud != GOOGLE_CLIENT_ID:
            raise ValueError("Invalid audience")
        email = idinfo.get("email")
        if not email:
            raise ValueError("Missing email in Google token")
        return email
    except Exception as exc:
        # In development, allow insecure fallback by decoding claims without verifying signature
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