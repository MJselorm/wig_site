from fastapi import FastAPI, HTTPException, Header
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pydantic import BaseModel
from typing import Optional
import os
import requests

# =========================================
# LOAD ENV VARIABLES
# =========================================

load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# =========================================
# FASTAPI APP
# =========================================

app = FastAPI()

# =========================================
# CORS
# =========================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# =========================================
# MODELS
# =========================================

class AuthRequest(BaseModel):
    email: str
    password: str


class ProfileUpdateRequest(BaseModel):
    full_name: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


# =========================================
# HELPER FUNCTION
# =========================================

def get_current_user(token: str):

    url = f"{SUPABASE_URL}/auth/v1/user"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}"
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    return response.json()


# =========================================
# SIGNUP
# =========================================

@app.post("/signup")
def signup(user: AuthRequest):

    url = f"{SUPABASE_URL}/auth/v1/signup"

    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(
        url,
        json=user.dict(),
        headers=headers
    )

    if response.status_code not in [200, 201]:
        raise HTTPException(
            status_code=400,
            detail=response.json()
        )

    data = response.json()

    # =====================================
    # CREATE PROFILE AUTOMATICALLY
    # =====================================

    if data.get("user"):

        user_id = data["user"]["id"]

        profile_url = f"{SUPABASE_URL}/rest/v1/profiles"

        profile_payload = {
            "id": user_id,
            "full_name": "",
            "phone": "",
            "bio": ""
        }

        profile_headers = {
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {data['session']['access_token']}"
            if data.get("session")
            else "",
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        }

        requests.post(
            profile_url,
            json=profile_payload,
            headers=profile_headers
        )

    return {
        "message": "Signup successful",
        "data": data
    }


# =========================================
# LOGIN
# =========================================

@app.post("/login")
def login(user: AuthRequest):

    url = f"{SUPABASE_URL}/auth/v1/token?grant_type=password"

    headers = {
        "apikey": SUPABASE_KEY,
        "Content-Type": "application/json"
    }

    response = requests.post(
        url,
        json=user.dict(),
        headers=headers
    )

    if response.status_code != 200:
        raise HTTPException(
            status_code=401,
            detail=response.json()
        )

    return {
        "message": "Login successful",
        "data": response.json()
    }


# =========================================
# GOOGLE / GITHUB AUTH URL
# =========================================

@app.get("/auth/url")
def get_auth_url(provider: str, redirect_to: str):

    url = (
        f"{SUPABASE_URL}/auth/v1/authorize"
        f"?provider={provider}"
        f"&redirect_to={redirect_to}"
    )

    return {
        "url": url
    }


# =========================================
# GET CURRENT USER
# =========================================

@app.get("/me")
def get_me(authorization: Optional[str] = Header(None)):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required"
        )

    token = authorization.replace("Bearer ", "")

    user = get_current_user(token)

    return {
        "message": "User fetched successfully",
        "user": user
    }


# =========================================
# GET PROFILE
# =========================================

@app.get("/profile")
def get_profile(authorization: Optional[str] = Header(None)):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required"
        )

    token = authorization.replace("Bearer ", "")

    user = get_current_user(token)

    user_id = user["id"]

    url = f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    response = requests.get(url, headers=headers)

    if response.status_code != 200:
        raise HTTPException(
            status_code=400,
            detail="Failed to fetch profile"
        )

    data = response.json()

    return {
        "message": "Profile fetched successfully",
        "profile": data[0] if data else {}
    }


# =========================================
# UPDATE PROFILE
# =========================================

@app.put("/profile")
def update_profile(
    profile_data: ProfileUpdateRequest,
    authorization: Optional[str] = Header(None)
):

    if not authorization:
        raise HTTPException(
            status_code=401,
            detail="Authorization header required"
        )

    token = authorization.replace("Bearer ", "")

    user = get_current_user(token)

    user_id = user["id"]

    url = f"{SUPABASE_URL}/rest/v1/profiles?id=eq.{user_id}"

    headers = {
        "apikey": SUPABASE_KEY,
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }

    payload = profile_data.dict(exclude_unset=True)

    response = requests.patch(
        url,
        json=payload,
        headers=headers
    )

    if response.status_code not in [200, 204]:
        raise HTTPException(
            status_code=400,
            detail=response.text
        )

    return {
        "message": "Profile updated successfully",
        "data": response.json()
    }


# =========================================
# ROOT ROUTE
# =========================================

@app.get("/")
def root():
    return {
        "message": "FastAPI + Supabase API running"
    }


# =========================================
# RUN SERVER
# =========================================

# uvicorn main:app --reload