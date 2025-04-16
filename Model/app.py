import os
import sys
import logging
import uvicorn

from fastapi import FastAPI, Request, Depends, HTTPException
from fastapi.responses import HTMLResponse, JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from jose import jwt, JWTError

# ======================
# 📦 Internal Imports
# ======================
from back_end.database.db import get_db
from back_end.database.models import User
from back_end.database.schemas import UserLogin, UserRegister
from back_end.database.auth import (
    verify_password, create_access_token, hash_password, SECRET_KEY, ALGORITHM
)
from back_end.database.db import router as db_router
from back_end.diffusion_Model.sd2 import main

# ======================
# 🛠️ Path Setup
# ======================
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
FRONTEND_DIR = os.path.join(BACKEND_DIR, "front_end")
SD2_DIR = os.path.join(BACKEND_DIR, "back_end", "diffusion_Model", "sd2")
USER_HTML_PATH = os.path.join(FRONTEND_DIR, "user", "user.html")
INDEX_HTML_PATH = os.path.join(FRONTEND_DIR, "index.html")

if SD2_DIR not in sys.path:
    sys.path.append(SD2_DIR)

# ======================
# 🧪 Logger
# ======================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# ======================
# 🔐 Token Verification
# ======================
def verify_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except JWTError:
        return None

# ======================
# 🚀 FastAPI Setup
# ======================
app = FastAPI()
app.include_router(db_router)

# ======================
# 🌐 CORS
# ======================
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ======================
# 🧱 Static Mounts
# ======================
app.mount("/static", StaticFiles(directory=FRONTEND_DIR), name="static")
app.mount("/images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images")), name="images")
app.mount("/images/preview", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images", "preview")), name="preview")
app.mount("/images/guest_user_images", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images", "guest_user_images")), name="guest_user_images")
app.mount("/images/shassani", StaticFiles(directory=os.path.join(FRONTEND_DIR, "images", "shassani")), name="shassani")
app.mount("/src", StaticFiles(directory=os.path.join(FRONTEND_DIR, "src")), name="src")
app.mount("/css", StaticFiles(directory=os.path.join(FRONTEND_DIR, "css")), name="css")
app.mount("/uploads", StaticFiles(directory=os.path.join(FRONTEND_DIR, "uploads")), name="uploads")

# ======================
# 🔒 Protected Page Wrapper
# ======================
def serve_protected_page(file_path: str, request: Request):
    token = request.cookies.get("access_token")
    email = verify_token(token) if token else None
    if not email:
        return RedirectResponse("/")
    with open(file_path, "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())

# ======================
# 🏠 Public Route
# ======================
@app.get("/", response_class=HTMLResponse)
async def serve_index():
    with open(INDEX_HTML_PATH, "r") as f:
        return HTMLResponse(content=f.read())

# ======================
# 👤 Admin Page
# ======================
@app.get("/admin", response_class=HTMLResponse)
async def serve_admin(request: Request):
    return serve_protected_page(os.path.join(FRONTEND_DIR, "admin", "admin.html"), request)

# ======================
# 🛡️ User-Protected Pages
# ======================
@app.get("/user", response_class=HTMLResponse)
async def serve_user(request: Request):
    return serve_protected_page(USER_HTML_PATH, request)

@app.get("/guide", response_class=HTMLResponse)
async def serve_guide(request: Request):
    return serve_protected_page(os.path.join(FRONTEND_DIR, "user", "guide.html"), request)

@app.get("/comic", response_class=HTMLResponse)
async def serve_comic(request: Request):
    return serve_protected_page(os.path.join(FRONTEND_DIR, "user", "comic.html"), request)

@app.get("/history", response_class=HTMLResponse)
async def serve_history(request: Request):
    return serve_protected_page(os.path.join(FRONTEND_DIR, "user", "history.html"), request)

@app.get("/settings", response_class=HTMLResponse)
async def serve_settings(request: Request):
    return serve_protected_page(os.path.join(FRONTEND_DIR, "user", "settings.html"), request)

# ======================
# 🎨 Image Generation API
# ======================
@app.post("/api/generate-image")
async def generate_image(request: Request):
    data = await request.json()
    prompt = data.get("text", "")
    image_type = data.get("type", "guest_user_images")
    count = data.get("count", 1)
    epochs = data.get("epochs", 1)
    inpaint = data.get("inPainting", False)
    print(f"Prompt: {prompt}, Type: {image_type}, Count: {count}, Epochs: {epochs}, Inpainting: {inpaint}")
    if not prompt:
        raise HTTPException(status_code=400, detail="No prompt provided.")
    images = main.generate_image(prompt, image_type, count, epochs, inpaint)
    return {"message": f"{len(images)} image(s) generated successfully", "image_paths": images}

# ======================
# ✍️ Register API
# ======================
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
    response = JSONResponse(content={"message": "Registered successfully"})
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="Lax")
    return response

# ======================
# 🔐 Login API
# ======================
@app.post("/api/login")
async def login(user_data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == user_data.email))
    user = result.scalars().first()
    if not user or not verify_password(user_data.password, user.password):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token(data={"sub": user.email})
    response = JSONResponse(content={
        "message": "Login successful",
        "redirect_url": "/admin" if user.role == "Admin" else "/user"
    })
    response.set_cookie(key="access_token", value=token, httponly=True, samesite="Lax")
    return response

# ======================
# 🚪 Logout API
# ======================
@app.post("/api/logout")
async def logout():
    response = JSONResponse(content={"message": "Logged out"})
    response.delete_cookie("access_token")
    return response

# ======================
# 🚀 App Runner
# ======================
if __name__ == "__main__":
    uvicorn.run("app:app", host="127.0.0.1", port=8001, reload=True)
