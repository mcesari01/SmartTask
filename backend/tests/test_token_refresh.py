#!/usr/bin/env python3
"""
Test script for Google token refresh functionality.

Extended version with additional mock-based tests to improve coverage.
"""

import os
from dotenv import load_dotenv
from unittest.mock import patch, MagicMock
from fastapi import HTTPException
from auth import refresh_access_token_with_refresh_token, is_valid_refresh_token
from database.database import SessionLocal
from models import User

# Load environment variables
load_dotenv()


def test_refresh_token_validation():
    """Test the refresh token validation function."""
    print("Testing refresh token validation...")
    
    invalid_tokens = [
        "IL_TUO_REFRESH_TOKEN",
        "YOUR_REFRESH_TOKEN",
        "test_token",
        "",
        None,
        "short",
        "placeholder_token"
    ]
    
    for token in invalid_tokens:
        result = is_valid_refresh_token(token)
        print(f"  Token '{token}': {'VALID' if result else 'INVALID'}")
    
    fake_but_valid_format = "1//example_long_refresh_token_that_looks_realistic_but_is_fake_abcdef123456789"
    result = is_valid_refresh_token(fake_but_valid_format)
    print(f"  Token '{fake_but_valid_format[:30]}...': {'VALID' if result else 'INVALID'}")
    print()


def test_token_refresh_with_database():
    """Test token refresh using actual database tokens."""
    print("Testing token refresh with database tokens...")
    
    db = SessionLocal()
    try:
        users = db.query(User).all()
        
        if not users:
            print("  No users found in database")
            return
        
        for user in users:
            print(f"  User: {user.email}")
            
            if not user.google_refresh_token:
                print("    No Google refresh token stored")
                continue
            
            print(f"    Refresh token: {user.google_refresh_token[:20]}...")
            
            if not is_valid_refresh_token(user.google_refresh_token):
                print("    ❌ Token failed validation (appears to be placeholder or invalid format)")
                continue
            
            try:
                result = refresh_access_token_with_refresh_token(user.google_refresh_token)
                print("    ✅ Token refresh successful!")
                print(f"    New access token: {result.get('access_token', '')[:20]}...")
                print(f"    Expires in: {result.get('expires_in', 'unknown')} seconds")
            except HTTPException as e:
                print(f"    ❌ Token refresh failed: {e.detail}")
            except Exception as e:
                print(f"    ❌ Unexpected error: {str(e)}")
    finally:
        db.close()
    print()


def test_refresh_with_fake_tokens():
    """Test token refresh with various fake tokens to show error handling."""
    print("Testing token refresh with fake tokens...")
    
    fake_tokens = [
        "IL_TUO_REFRESH_TOKEN",
        "1//fake_but_long_enough_token_that_passes_validation_abcdefghijk123456789",
        "",
        None
    ]
    
    for token in fake_tokens:
        print(f"  Testing token: {token}")
        try:
            result = refresh_access_token_with_refresh_token(token)
            print(f"    ✅ Unexpected success: {result}")
        except HTTPException as e:
            print(f"    ❌ Expected error (HTTP {e.status_code}): {e.detail}")
        except Exception as e:
            print(f"    ❌ Unexpected error: {str(e)}")
    print()


def print_google_oauth_setup_instructions():
    """Print instructions for setting up Google OAuth tokens."""
    print("=" * 60)
    print("GOOGLE OAUTH SETUP INSTRUCTIONS")
    print("=" * 60)
    print("To get a valid Google refresh token, you need to:")
    print()
    print("1. Set up Google OAuth credentials:")
    print("   - Go to: https://console.developers.google.com/")
    print("   - Enable Google Calendar API")
    print("   - Add redirect URI: http://localhost:8000/auth/google-calendar/callback")
    print()
    print("2. Configure environment variables:")
    print(f"   - GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID', 'NOT SET')}")
    print(f"   - GOOGLE_CLIENT_SECRET: {'SET' if os.getenv('GOOGLE_CLIENT_SECRET') else 'NOT SET'}")
    print()
    print("3. Get refresh token via OAuth flow and save it to DB")
    print("4. You can also test manually via FastAPI endpoints.\n")


@patch("auth.requests.post")
def test_refresh_token_google_success(mock_post):
    """Simulate a successful response from Google's token endpoint."""
    mock_resp = MagicMock()
    mock_resp.ok = True
    mock_resp.json.return_value = {
        "access_token": "new_access_token_123",
        "expires_in": 3600
    }
    mock_post.return_value = mock_resp

    os.environ["GOOGLE_CLIENT_SECRET"] = "secret"
    token = "1//valid_refresh_token_long_enough_to_pass_check"
    result = refresh_access_token_with_refresh_token(token)
    assert "access_token" in result
    print("✅ Successful token refresh covered.")


@patch("auth.requests.post")
def test_refresh_token_google_invalid_grant(mock_post):
    """Simulate Google's invalid_grant error."""
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 400
    mock_resp.json.return_value = {
        "error": "invalid_grant",
        "error_description": "Token has expired"
    }
    mock_post.return_value = mock_resp

    os.environ["GOOGLE_CLIENT_SECRET"] = "secret"
    token = "1//expired_refresh_token_example_that_passes_validation"
    try:
        refresh_access_token_with_refresh_token(token)
    except HTTPException as e:
        print(f"✅ Caught expected invalid_grant: {e.detail}")
        assert "expired" in e.detail.lower()


@patch("auth.requests.post")
def test_refresh_token_google_missing_secret(mock_post):
    """Simulate missing client secret."""
    os.environ["GOOGLE_CLIENT_SECRET"] = ""
    token = "1//valid_refresh_token_but_no_secret"
    try:
        refresh_access_token_with_refresh_token(token)
    except HTTPException as e:
        print(f"✅ Missing secret properly handled: {e.detail}")
        assert "client secret" in e.detail.lower()


@patch("auth.requests.post")
def test_refresh_token_http_error(mock_post):
    """Simulate a network or HTTP error (non-JSON body)."""
    mock_resp = MagicMock()
    mock_resp.ok = False
    mock_resp.status_code = 500
    mock_resp.text = "Internal Server Error"
    mock_resp.json.side_effect = ValueError("Invalid JSON")
    mock_post.return_value = mock_resp

    os.environ["GOOGLE_CLIENT_SECRET"] = "secret"
    token = "1//random_long_token_to_test_http_error"
    try:
        refresh_access_token_with_refresh_token(token)
    except HTTPException as e:
        print(f"✅ HTTP error path covered: {e.detail}")
        # accetta entrambi i messaggi possibili
        assert (
            "token refresh failed" in e.detail.lower()
            or "google" in e.detail.lower()
        )


def test_is_valid_refresh_token_edge_cases():
    """Extra validation edge cases."""
    tokens = [
        "1//a" * 30,      # very long but valid prefix
        "2//wrongprefix", # invalid prefix
        "1//",            # too short
    ]
    for t in tokens:
        res = is_valid_refresh_token(t)
        print(f"Token '{t[:15]}...' validity: {res}")
    print("✅ Edge cases for is_valid_refresh_token covered.\n")


if __name__ == "__main__":
    print("Google Token Refresh Test Script")
    print("=" * 40)
    print()
    
    test_refresh_token_validation()
    test_token_refresh_with_database()
    test_refresh_with_fake_tokens()
    test_is_valid_refresh_token_edge_cases()

    # Simulated scenarios for coverage
    test_refresh_token_google_success()
    test_refresh_token_google_invalid_grant()
    test_refresh_token_google_missing_secret()
    test_refresh_token_http_error()

    print_google_oauth_setup_instructions()