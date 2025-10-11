#!/usr/bin/env python3
"""
Test script for Google token refresh functionality.

This script demonstrates proper usage of the refresh_access_token_with_refresh_token
function and shows how to handle various error scenarios.
"""

import os
from dotenv import load_dotenv
from auth import refresh_access_token_with_refresh_token, is_valid_refresh_token
from database.database import SessionLocal
from models import User
from fastapi import HTTPException

# Load environment variables
load_dotenv()

def test_refresh_token_validation():
    """Test the refresh token validation function."""
    print("Testing refresh token validation...")
    
    # Test invalid tokens
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
    
    # Test potentially valid token format (but still fake)
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
            
            # Validate token format
            if not is_valid_refresh_token(user.google_refresh_token):
                print("    ❌ Token failed validation (appears to be placeholder or invalid format)")
                continue
            
            # Try to refresh
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
    print("   - Create a project or select existing one")
    print("   - Enable Google Calendar API")
    print("   - Create OAuth 2.0 credentials (Web application)")
    print("   - Add redirect URI: http://localhost:8000/auth/google-calendar/callback")
    print()
    print("2. Configure environment variables:")
    print(f"   - GOOGLE_CLIENT_ID: {os.getenv('GOOGLE_CLIENT_ID', 'NOT SET')}")
    print(f"   - GOOGLE_CLIENT_SECRET: {'SET' if os.getenv('GOOGLE_CLIENT_SECRET') else 'NOT SET'}")
    print()
    print("3. Get refresh token by going through OAuth flow:")
    print("   - Start your FastAPI server: uvicorn main:app --reload")
    print("   - Visit: https://accounts.google.com/o/oauth2/v2/auth?client_id=YOUR_CLIENT_ID&redirect_uri=http://localhost:8000/auth/google-calendar/callback&scope=https://www.googleapis.com/auth/calendar&response_type=code&access_type=offline&prompt=consent")
    print("   - Replace YOUR_CLIENT_ID with your actual client ID")
    print("   - Complete the authorization flow")
    print("   - The refresh token will be saved to your user account in the database")
    print()
    print("4. You can also test the endpoint directly:")
    print("   - POST /google-auth with your tokens")
    print("   - Use the /auth/google-calendar/callback endpoint")
    print()

if __name__ == "__main__":
    print("Google Token Refresh Test Script")
    print("=" * 40)
    print()
    
    # Test validation function
    test_refresh_token_validation()
    
    # Test with database tokens
    test_token_refresh_with_database()
    
    # Test error handling
    test_refresh_with_fake_tokens()
    
    # Print setup instructions
    print_google_oauth_setup_instructions()