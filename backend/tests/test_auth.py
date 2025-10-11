import pytest
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from datetime import datetime, timedelta

import auth
from models import User


@pytest.fixture
def fake_db_session():
    """Mock di una sessione SQLAlchemy."""
    class DummyDB:
        def __init__(self):
            self.added = []
            self.committed = False
            self.refreshed = False

        def add(self, obj):
            self.added.append(obj)

        def commit(self):
            self.committed = True

        def refresh(self, obj):
            self.refreshed = True

        def query(self, model):
            class Q:
                def filter(self, *args, **kwargs):
                    return self
                def first(self):
                    return None
            return Q()

        def close(self):
            pass

    return DummyDB()


def test_verify_password_and_hash():
    password = "mypassword"
    hashed = auth.get_password_hash(password)
    assert auth.verify_password(password, hashed)
    assert not auth.verify_password("wrong", hashed)
    assert not auth.verify_password(password, None)


def test_create_access_token_contains_sub():
    token = auth.create_access_token({"sub": "test@example.com"})
    decoded = auth.jwt.decode(token, auth.SECRET_KEY, algorithms=[auth.ALGORITHM])
    assert decoded["sub"] == "test@example.com"
    assert "exp" in decoded


def test_get_current_user_invalid_token(fake_db_session):
    with pytest.raises(HTTPException):
        auth.get_current_user("invalidtoken", db=fake_db_session)


@patch("auth.google_id_token.verify_oauth2_token")
def test_verify_google_id_token_success(mock_verify):
    mock_verify.return_value = {"aud": auth.GOOGLE_CLIENT_ID, "email": "test@gmail.com"}
    email = auth.verify_google_id_token_and_get_email("fake_token")
    assert email == "test@gmail.com"


@patch("auth.google_id_token.verify_oauth2_token", side_effect=ValueError("Invalid"))
def test_verify_google_id_token_fallback(mock_verify):
    with patch("auth.GOOGLE_DEV_ALLOW_INSECURE", True):
        with patch("auth.jwt.get_unverified_claims", return_value={"email": "insecure@gmail.com"}):
            email = auth.verify_google_id_token_and_get_email("fake_token")
            assert email == "insecure@gmail.com"


@patch("auth.google_id_token.verify_oauth2_token", side_effect=ValueError("Invalid"))
def test_verify_google_id_token_failure(mock_verify):
    with patch("auth.GOOGLE_DEV_ALLOW_INSECURE", False):
        with pytest.raises(HTTPException):
            auth.verify_google_id_token_and_get_email("invalid_token")


def test_save_google_tokens_for_user(fake_db_session):
    # Corretto: il costruttore User non accetta password_hash
    user = User()
    auth.save_google_tokens_for_user(fake_db_session, user, "access", "refresh", 60)
    assert user.google_access_token == "access"
    assert user.google_refresh_token == "refresh"
    assert fake_db_session.committed
    assert fake_db_session.refreshed


def test_is_valid_refresh_token_cases():
    assert not auth.is_valid_refresh_token(None)
    assert not auth.is_valid_refresh_token("short")
    assert not auth.is_valid_refresh_token("IL_TUO_REFRESH_TOKEN")
    assert auth.is_valid_refresh_token("1//a_very_long_valid_refresh_token_string_that_looks_ok")


def test_refresh_access_token_missing_token():
    with pytest.raises(HTTPException):
        auth.refresh_access_token_with_refresh_token("")


def test_refresh_access_token_invalid_format():
    with pytest.raises(HTTPException):
        auth.refresh_access_token_with_refresh_token("test_token")


def test_refresh_access_token_missing_secret(monkeypatch):
    monkeypatch.setattr(auth, "GOOGLE_CLIENT_SECRET", "")
    with pytest.raises(HTTPException):
        auth.refresh_access_token_with_refresh_token("1//valid_refresh_token_long_enough_to_pass_check")


@patch("auth.requests.post")
def test_refresh_access_token_google_failure(mock_post):
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 401
    mock_resp.json.return_value = {"error": "invalid_grant", "error_description": "expired"}
    mock_post.return_value = mock_resp
    with patch("auth.GOOGLE_CLIENT_SECRET", "secret"):
        with pytest.raises(HTTPException) as exc:
            auth.refresh_access_token_with_refresh_token("1//valid_refresh_token_long_enough_to_pass_check")
        # Ora deve passare
        assert "refresh token is invalid" in str(exc.value.detail).lower()


@patch("auth.requests.post")
def test_refresh_access_token_google_success(mock_post):
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = {"access_token": "new_token", "expires_in": 3600}
    mock_post.return_value = mock_resp
    with patch("auth.GOOGLE_CLIENT_SECRET", "secret"):
        data = auth.refresh_access_token_with_refresh_token("1//valid_refresh_token_long_enough_to_pass_check")
        assert data["access_token"] == "new_token"


@patch("auth.requests.post")
def test_exchange_code_for_tokens_success(mock_post):
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = {"access_token": "t", "refresh_token": "r"}
    mock_post.return_value = mock_resp
    with patch("auth.GOOGLE_CLIENT_SECRET", "secret"):
        data = auth.exchange_code_for_tokens("authcode")
        assert "access_token" in data


@patch("auth.requests.post")
def test_exchange_code_for_tokens_failure(mock_post):
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 400
    mock_resp.text = "bad request"
    mock_post.return_value = mock_resp
    with patch("auth.GOOGLE_CLIENT_SECRET", "secret"):
        with pytest.raises(HTTPException):
            auth.exchange_code_for_tokens("invalidcode")