import os
import sys
import logging
import uvicorn
import logging

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

# 🧠 Internal imports
from back_end.database.db import get_db
from back_end.database.models import User
from back_end.database.schemas import UserLogin, UserRegister
from back_end.database.auth import verify_password, create_access_token, hash_password
from back_end.database.db import router as db_router
from back_end.diffusion_Model.sd2 import main  # Image generator

# 📁 Directory Paths
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BACKEND_DIR, "front_end")
SD2_DIR = os.path.join(BACKEND_DIR, "back_end", "diffusion_Model", "sd2")
USER_HTML_PATH = os.path.join(FRONTEND_DIR, "user", "user.html")
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, "index.html")


# Add this line to create the logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ⛓️ Add image generation path to sys
if SD2_DIR not in sys.path:
    sys.path.append(SD2_DIR)

# 🚀 FastAPI app init
app = FastAPI()

# 🌍 Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 🔓 Development only
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 📂 Mount Static & Image Folders
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images")), name="images")
app.mount("/images/preview", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images", "preview")), name="preview")
app.mount("/images/guest_user_images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images", "guest_user_images")), name="guest_user_images")
app.mount("/images/shassani", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images", "shassani")), name="shassani")
app.mount("/src", StaticFiles(directory=os.path.join(FRONTEND_DIR, "src")), name="src")
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/uploads", StaticFiles(directory=os.path.join(FRONTEND_DIR, "uploads")), name="uploads")

# 🏠 Homepage
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open(INDEX_HTML_PATH, "r") as f:
        return HTMLResponse(content=f.read())

# 👤 User dashboard
@app.get("/user", response_class=HTMLResponse)
async def serve_user():
    with open(USER_HTML_PATH, "r") as f:
        return HTMLResponse(content=f.read())

# 🎨 Image Generation Endpoint
@app.post("/api/generate-image")
async def generate_image(request: Request):
    """
    Generate multiple images based on prompt and type.
    Accepts optional 'count' field (default is 1).
    """
    data = await request.json()
    prompt = data.get("text", "")
    image_type = data.get("type", "guest_user_images")
    count = data.get("count", 1)

    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided.")

    images = main.generate_image(prompt, image_type, count)
    return {
        "message": f"{len(images)} image(s) generated successfully",
        "image_paths": images
    }


# 📝 Registration
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

    token = create_access_token(data={"sub": new_user.email})
    return {"message": "Registered successfully", "access_token": token}

# 🔐 Login
@app.post("/api/login")
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalars().first()

    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    logger.info(f"Login successful for user: {user.email}")
    token = create_access_token(data={"sub": user.email})
    return {"message": "Login successful", "access_token": token}

# 🔌 Include DB routes
app.include_router(db_router)

# 📄 Serve other frontend pages
@app.get("/guide", response_class=HTMLResponse)
async def serve_guide():
    with open(os.path.join(FRONTEND_DIR, "user", "guide.html"), encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/comic", response_class=HTMLResponse)
async def serve_comic():
    with open(os.path.join(FRONTEND_DIR, "user", "comic.html"), encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/history", response_class=HTMLResponse)
async def serve_history():
    with open(os.path.join(FRONTEND_DIR, "user", "history.html"), encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

@app.get("/settings", response_class=HTMLResponse)
async def serve_settings():
    with open(os.path.join(FRONTEND_DIR, "user", "settings.html"), encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

# ▶️ Run App
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=True)
