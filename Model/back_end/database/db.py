# ======================
# 📦 Imports & Setup
# ======================
from typing import Annotated
from datetime import timedelta
from uuid import uuid4
import os

from fastapi import (
    APIRouter, Depends, HTTPException, status, UploadFile, File,
    Form, Request
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import jwt, JWTError
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
from sqlalchemy import desc

from pydantic import BaseModel

from back_end.database.models import Comic, CharacterHistory, User as DBUser
from back_end.database.schemas import (
    UserLogin, UserResponse, UserRegister,
    ProfileUpdateRequest, CharacterData
)
from back_end.database.auth import (
    verify_password, create_access_token,
    hash_password, SECRET_KEY, ALGORITHM
)

# ======================
# 🛠️ Database Config
# ======================
URL_DATABASE = "postgresql+asyncpg://postgres:shassani@localhost:5432/diffusion_model_db"
engine = create_async_engine(URL_DATABASE, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with SessionLocal() as session:
        yield session

db_dependency = Annotated[AsyncSession, Depends(get_db)]

# ======================
# 🔐 OAuth2 & Token Model
# ======================
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

class Token(BaseModel):
    access_token: str
    token_type: str

# ======================
# 🚀 FastAPI Router
# ======================
router = APIRouter()

# ======================
# 🔍 User Auth Helpers
# ======================
async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(DBUser).where(DBUser.email == email))
    return result.scalar_one_or_none()

async def authenticate_user(db: AsyncSession, email: str, password: str):
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return None
    return user

# ======================
# 🔐 Token Login Endpoint
# ======================
@router.post("/token", response_model=Token)
async def login_for_access_token(
    db: AsyncSession = Depends(get_db),
    form_data: OAuth2PasswordRequestForm = Depends()
):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email}, expires_delta=timedelta(minutes=30))
    return {"access_token": token, "token_type": "bearer"}

# ======================
# 🔍 Current User Resolver
# ======================
async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    token = request.cookies.get("access_token") or (
        request.headers.get("authorization", "").split(" ")[1]
        if "authorization" in request.headers else None
    )

    if not token:
        raise HTTPException(status_code=401, detail="Token not found. Please login.")

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email = payload.get("sub")
        if not email:
            raise HTTPException(status_code=401, detail="Invalid token payload.")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token. Please login again.")

    user = await get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=401, detail="User not found.")
    return user

# ======================
# 👤 Get Current User Info
# ======================
@router.get("/users/me", response_model=UserResponse)
async def read_users_me(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    return UserResponse.from_orm(current_user)

# ======================
# 📝 User Registration
# ======================
@router.post("/register")
async def register_user(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBUser).where(DBUser.email == user_data.email))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    user = DBUser(
        first_name=user_data.firstname,
        last_name=user_data.lastname,
        email=user_data.email,
        password=hash_password(user_data.password)
    )
    db.add(user)
    await db.commit()
    return {"message": "User registered successfully"}

# ======================
# 📥 PDF Upload + Thumbnail
# ======================
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "front_end")

@router.post("/upload-pdf")
async def upload_pdf(
    title: str = Form(...),
    story_text: str = Form(...),
    pdf: UploadFile = File(...),
    thumbnail: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    if not pdf.filename.endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

    file_id = str(uuid4())
    pdf_path = os.path.join(FRONTEND_DIR, "uploads/pdfs", f"{file_id}.pdf")
    thumb_path = os.path.join(FRONTEND_DIR, "uploads/thumbnails", f"{file_id}.png")

    os.makedirs(os.path.dirname(pdf_path), exist_ok=True)
    os.makedirs(os.path.dirname(thumb_path), exist_ok=True)

    with open(pdf_path, "wb") as f: f.write(await pdf.read())
    with open(thumb_path, "wb") as f: f.write(await thumbnail.read())

    comic = Comic(
        user_id=current_user.user_id,
        title=title,
        story_text=story_text,
        images_path=f"/uploads/pdfs/{file_id}.pdf",
        total_pages=1
    )
    db.add(comic)
    await db.commit()

    return {"message": "Comic and thumbnail uploaded successfully", "path": comic.images_path, "title": title}

# ======================
# 📚 Comic Management
# ======================
@router.get("/api/user/comics")
async def get_user_comics(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(select(Comic).where(Comic.user_id == current_user.user_id))
    return [
        {
            "id": comic.comic_id,
            "title": comic.title,
            "description": comic.story_text,
            "pdf_path": comic.images_path,
            "created_at": str(comic.created_at)
        }
        for comic in result.scalars().all()
    ]

@router.delete("/api/user/comics/{comic_id}")
async def delete_comic(
    comic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(select(Comic).where(
        Comic.comic_id == comic_id,
        Comic.user_id == current_user.user_id
    ))
    comic = result.scalar_one_or_none()
    if not comic:
        raise HTTPException(status_code=404, detail="Comic not found")

    pdf_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
    if os.path.exists(pdf_path): os.remove(pdf_path)

    await db.delete(comic)
    await db.commit()
    return {"message": "Comic deleted"}

# ======================
# 🧨 Delete Account
# ======================
@router.delete("/api/delete-account")
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(select(Comic).where(Comic.user_id == current_user.user_id))
    for comic in result.scalars().all():
        file_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
        if os.path.exists(file_path): os.remove(file_path)
        await db.delete(comic)

    await db.delete(current_user)
    await db.commit()
    return {"message": "Account and all associated comics deleted successfully"}

# ======================
# ⚙️ Profile Update
# ======================
@router.post("/api/update-profile")
async def update_profile(
    data: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    updated = False

    if data.new_name:
        parts = data.new_name.split(" ", 1)
        current_user.first_name = parts[0]
        current_user.last_name = parts[1] if len(parts) > 1 else ""
        updated = True

    if data.current_email and data.new_email:
        if current_user.email != data.current_email:
            raise HTTPException(status_code=403, detail="Current email does not match.")
        current_user.email = data.new_email
        updated = True

    if data.current_password and data.new_password:
        if not verify_password(data.current_password, current_user.password):
            raise HTTPException(status_code=403, detail="Current password is incorrect.")
        current_user.password = hash_password(data.new_password)
        updated = True

    if not updated:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    await db.commit()
    return {"message": "Profile updated successfully"}

# ======================
# 🧑‍💼 Admin Panel: User Management
# ======================
@router.get("/api/admin/users")
async def get_all_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBUser))
    users = result.scalars().all()
    response = []
    for user in users:
        comics = await db.execute(select(Comic).where(Comic.user_id == user.user_id))
        response.append({
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "credits": user.credits,
            "comics_count": len(comics.scalars().all())
        })
    return response

@router.delete("/api/admin/users/{user_id}")
async def delete_user_as_admin(user_id: int, db: AsyncSession = Depends(get_db)):
    comics = await db.execute(select(Comic).where(Comic.user_id == user_id))
    for comic in comics.scalars().all():
        file_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
        if os.path.exists(file_path): os.remove(file_path)
        await db.delete(comic)

    user = await db.execute(select(DBUser).where(DBUser.user_id == user_id))
    user_obj = user.scalar_one_or_none()
    if not user_obj:
        raise HTTPException(status_code=404, detail="User not found")

    await db.delete(user_obj)
    await db.commit()
    return {"message": "User and comics deleted"}

# ======================
# 📜 Character History
# ======================
@router.post("/api/save-history")
async def save_character_history(
    data: CharacterData,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    recent = await db.execute(
        select(CharacterHistory)
        .where(CharacterHistory.user_id == current_user.user_id)
        .order_by(desc(CharacterHistory.created_at))
        .limit(3)
    )
    for item in recent.scalars().all():
        if item.name == data.name and item.age == data.age and item.description == data.description:
            return {"message": "Duplicate history skipped"}

    new_entry = CharacterHistory(user_id=current_user.user_id, **data.dict())
    db.add(new_entry)
    await db.commit()
    return {"message": "History saved"}

@router.get("/api/get-history")
async def get_character_history(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(
        select(CharacterHistory).where(CharacterHistory.user_id == current_user.user_id).order_by(desc(CharacterHistory.created_at))
    )
    return [
        {
            "id": h.id,
            "name": h.name,
            "age": h.age,
            "gender": h.gender,
            "hair": h.hair,
            "eyes": h.eyes,
            "clothes": h.clothes,
            "special": h.special,
            "description": h.description,
            "created_at": h.created_at.isoformat()
        }
        for h in result.scalars().all()
    ]

@router.delete("/api/delete-history/{id}")
async def delete_history_entry(
    id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(select(CharacterHistory).where(
        CharacterHistory.id == id,
        CharacterHistory.user_id == current_user.user_id
    ))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="History not found")

    await db.delete(item)
    await db.commit()
    return {"message": "History item deleted"}

@router.delete("/api/clear-history")
async def clear_all_history(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(select(CharacterHistory).where(CharacterHistory.user_id == current_user.user_id))
    for item in result.scalars().all():
        await db.delete(item)

    await db.commit()
    return {"message": "All history cleared"}
