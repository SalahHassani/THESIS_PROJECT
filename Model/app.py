import os
import sys
import logging
import uvicorn
from fastapi import FastAPI, Request, Depends, HTTPException, status
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from back_end.database.db import get_db
from back_end.database.models import User
from back_end.database.schemas import UserLogin, UserRegister
from back_end.database.auth import verify_password, create_access_token, hash_password


# Logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

import sys
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
SD2_DIR = os.path.join(BACKEND_DIR, "back_end", "diffusion_Model", "sd2")

if SD2_DIR not in sys.path:
    sys.path.append(SD2_DIR)  # ✅ Add the sd2 folder to the import path

FRONTEND_DIR = os.path.join(BACKEND_DIR, "front_end")
USER_HTML_PATH = os.path.join(FRONTEND_DIR, "user", "user.html")
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, "index.html")

from back_end.diffusion_Model.sd2 import main


# Initialize FastAPI app
app = FastAPI()

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For dev only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images")), name="images")
app.mount("/src", StaticFiles(directory=os.path.join(FRONTEND_DIR, "src")), name="src")
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")



# Serve index.html
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open(INDEX_HTML_PATH, "r") as f:
        return HTMLResponse(content=f.read())

# Serve user.html (after frontend confirms login)
@app.get("/user", response_class=HTMLResponse)
async def serve_user():
    with open(USER_HTML_PATH, "r") as f:
        return HTMLResponse(content=f.read())


# Generate image endpoint
@app.post("/api/generate-image")
async def generate_image(request: Request):
    """
    API to generate an image based on user input prompt.
    """
    data = await request.json()
    prompt = data.get("text", "")

    if not prompt:
        return {"error": "No prompt provided."}

    print(f"Received Prompt: {prompt}")

    # Call the image generation function
    image_filename = main.generate_image(prompt)

    print(f"Image In app.py: {image_filename}")
    
    return {
        "message": "Image generated successfully",
        "image_name": image_filename
    }

# Register endpoint
@app.post("/api/register")
async def register(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    logger.info("Registering new user...")
    result = await db.execute(select(User).where(User.email == user_data.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = User(
        first_name=user_data.firstname,
        last_name=user_data.lastname,
        email=user_data.email,
        password=hash_password(user_data.password)
    )
    db.add(new_user)
    await db.commit()

    print(f"Registered new user: {new_user.first_name} {new_user.last_name}")

    token = create_access_token(data={"sub": new_user.email})
    return {"message": "Registered successfully", "access_token": token}

# Login endpoint
@app.post("/api/login")
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalars().first()

    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info(f"Login successful for user: {user.email}")
    token = create_access_token(data={"sub": user.email})

    return {"message": "Login successful", "access_token": token}

# Run app
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=True)
