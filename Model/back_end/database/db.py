# ---------------------- db.py ----------------------

from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from datetime import timedelta
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from sqlalchemy.future import select
import os
from uuid import uuid4
from pydantic import BaseModel

from sqlalchemy import Column, Integer, String, ForeignKey, Text, Numeric, Date, TIMESTAMP, CheckConstraint, desc

from back_end.database.models import Comic, User


from back_end.database.models import Comic, CharacterHistory
from back_end.database.models import User as DBUser
from back_end.database.schemas import UserLogin, UserResponse, UserRegister, ProfileUpdateRequest, CharacterData
from back_end.database.auth import verify_password, create_access_token, hash_password, SECRET_KEY, ALGORITHM

# Database Configuration
URL_DATABASE = "postgresql+asyncpg://postgres:shassani@localhost:5432/diffusion_model_db"
engine = create_async_engine(URL_DATABASE, echo=True)
SessionLocal = sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

async def get_db():
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()

db_dependency = Annotated[AsyncSession, Depends(get_db)]

# Auth Configuration
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/login")

# FastAPI Router
router = APIRouter()

class Token(BaseModel):
    access_token: str
    token_type: str

# Utility functions
async def get_user_by_email(db: AsyncSession, email: str):
    result = await db.execute(select(DBUser).where(DBUser.email == email))
    return result.scalar_one_or_none()

async def authenticate_user(db: AsyncSession, email: str, password: str):
    user = await get_user_by_email(db, email)
    if not user or not verify_password(password, user.password):
        return None
    return user

# Routes
@router.post("/token", response_model=Token)
async def login_for_access_token(db: AsyncSession = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=30)
    access_token = create_access_token(
        data={"sub": user.email}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

# async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
#     credentials_exception = HTTPException(
#         status_code=status.HTTP_401_UNAUTHORIZED,
#         detail="Could not validate credentials",
#         headers={"WWW-Authenticate": "Bearer"},
#     )
#     try:
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         email: str = payload.get("sub")
#         if email is None:
#             raise credentials_exception
#     except JWTError:
#         raise credentials_exception

#     user = await get_user_by_email(db, email)
#     if user is None:
#         raise credentials_exception
#     return user

from fastapi import Request

async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db)
):
    token = None

    # 1. Check cookie first
    if "access_token" in request.cookies:
        token = request.cookies["access_token"]

    # 2. Fallback to Authorization header if present
    elif "authorization" in request.headers:
        auth_header = request.headers["authorization"]
        if auth_header.startswith("Bearer "):
            token = auth_header.split(" ")[1]

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token not found. Please login.",
        )

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token payload.",
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token. Please login again.",
        )

    user = await get_user_by_email(db, email)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found.",
        )

    return user


# @router.get("/users/me", response_model=UserResponse)
# async def read_users_me(db: AsyncSession = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
#     return current_user

# @router.get("/users/me", response_model=UserResponse)
# async def read_users_me(
#     db: AsyncSession = Depends(get_db),
#     current_user: DBUser = Depends(get_current_user)
# ):
#     return UserResponse.model_validate(current_user)

@router.get("/users/me", response_model=UserResponse)
async def read_users_me(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    return UserResponse.from_orm(current_user)



@router.post("/register")
async def register_user(user_data: UserRegister, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBUser).where(DBUser.email == user_data.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = DBUser(
        first_name=user_data.firstname,
        last_name=user_data.lastname,
        email=user_data.email,
        password=hash_password(user_data.password)
    )
    db.add(new_user)
    await db.commit()
    return {"message": "User registered successfully"}

# PDF Upload Handling
FRONTEND_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "..", "front_end")
PDF_STORAGE_PATH = os.path.join(FRONTEND_DIR, "uploads", "pdfs")
os.makedirs(PDF_STORAGE_PATH, exist_ok=True)

# @router.post("/upload-pdf")
# async def upload_pdf(
#     title: str = Form(...),
#     story_text: str = Form(...),
#     pdf: UploadFile = File(...),
#     db: AsyncSession = Depends(get_db),
#     current_user: DBUser = Depends(get_current_user)
# ):
#     if not pdf.filename.endswith(".pdf"):
#         raise HTTPException(status_code=400, detail="Only PDF files are allowed.")

#     file_ext = os.path.splitext(pdf.filename)[1]
#     unique_filename = f"{uuid4()}{file_ext}"
#     file_path = os.path.join(PDF_STORAGE_PATH, unique_filename)

#     with open(file_path, "wb") as f:
#         content = await pdf.read()
#         f.write(content)

#     relative_path = f"/uploads/pdfs/{unique_filename}"

#     new_comic = Comic(
#         user_id=current_user.user_id,
#         title=title,
#         story_text=story_text,
#         images_path=relative_path,
#         total_pages=1
#     )
#     db.add(new_comic)
#     await db.commit()

#     return {
#         "message": "Comic uploaded successfully",
#         "path": relative_path,
#         "title": title
#     }

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

    # Prepare unique name for both PDF and thumbnail
    file_id = str(uuid4())
    pdf_filename = f"{file_id}.pdf"
    thumb_filename = f"{file_id}.png"

    # Define storage paths
    PDF_DIR = os.path.join(FRONTEND_DIR, "uploads", "pdfs")
    THUMB_DIR = os.path.join(FRONTEND_DIR, "uploads", "thumbnails")
    os.makedirs(PDF_DIR, exist_ok=True)
    os.makedirs(THUMB_DIR, exist_ok=True)

    pdf_path = os.path.join(PDF_DIR, pdf_filename)
    thumb_path = os.path.join(THUMB_DIR, thumb_filename)

    # Save PDF
    with open(pdf_path, "wb") as f:
        content = await pdf.read()
        f.write(content)

    # Save Thumbnail (PNG)
    with open(thumb_path, "wb") as f:
        content = await thumbnail.read()
        f.write(content)

    # Relative path to access in frontend
    relative_pdf_path = f"/uploads/pdfs/{pdf_filename}"

    # Save comic metadata to DB
    new_comic = Comic(
        user_id=current_user.user_id,
        title=title,
        story_text=story_text,
        images_path=relative_pdf_path,
        total_pages=1
    )
    db.add(new_comic)
    await db.commit()

    return {
        "message": "Comic and thumbnail uploaded successfully",
        "path": relative_pdf_path,
        "title": title
    }





@router.get("/api/user/comics")
async def get_user_comics(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    result = await db.execute(select(Comic).where(Comic.user_id == current_user.user_id))
    comics = result.scalars().all()

    return [
        {
            "id": comic.comic_id,
            "title": comic.title,
            "description": comic.story_text,
            "pdf_path": comic.images_path,
            "created_at": str(comic.created_at)
        }
        for comic in comics
    ]


# 📜 Get Comic Details
@router.delete("/api/user/comics/{comic_id}")
async def delete_comic(
    comic_id: int,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(select(Comic).where(Comic.comic_id == comic_id, Comic.user_id == current_user.user_id))
    comic = result.scalar_one_or_none()

    if not comic:
        raise HTTPException(status_code=404, detail="Comic not found")   

    # Delete PDF file
    pdf_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

    # Delete from DB
    await db.delete(comic)
    await db.commit()

    return {"message": "Comic deleted"}



# 🗑️ Delete Account
@router.delete("/api/delete-account")
async def delete_account(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    # 🔍 Get all comics associated with the user
    result = await db.execute(select(Comic).where(Comic.user_id == current_user.user_id))
    comics = result.scalars().all()

    # 🗑️ Delete all PDF files on disk
    for comic in comics:
        if comic.images_path:  # just in case
            file_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
            if os.path.exists(file_path):
                try:
                    os.remove(file_path)
                except Exception as e:
                    print(f"Error deleting file {file_path}: {e}")

        # Explicitly delete the comic from DB
        await db.delete(comic)

    # 🧨 Delete the user
    await db.delete(current_user)
    await db.commit()

    return {"message": "Account and all associated comics deleted successfully"}


# 🔄 Update Profile
@router.post("/api/update-profile")
async def update_profile(
    data: ProfileUpdateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user),
):
    updated = False

    # Update name
    if data.new_name:
        names = data.new_name.strip().split(" ", 1)
        current_user.first_name = names[0]
        current_user.last_name = names[1] if len(names) > 1 else ""
        updated = True

    # Update email
    if data.current_email and data.new_email:
        if current_user.email != data.current_email:
            raise HTTPException(status_code=403, detail="Current email does not match.")
        current_user.email = data.new_email
        updated = True

    # Update password
    if data.current_password and data.new_password:
        if not verify_password(data.current_password, current_user.password):
            raise HTTPException(status_code=403, detail="Current password is incorrect.")
        current_user.password = hash_password(data.new_password)
        updated = True

    if not updated:
        raise HTTPException(status_code=400, detail="No valid fields to update.")

    await db.commit()
    return {"message": "Profile updated successfully"}



# API for admin to fetch users
@router.get("/api/admin/users")
async def get_all_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(DBUser))
    users = result.scalars().all()

    response = []
    for user in users:
        comic_result = await db.execute(select(Comic).where(Comic.user_id == user.user_id))
        comics_count = len(comic_result.scalars().all())

        response.append({
            "user_id": user.user_id,
            "first_name": user.first_name,
            "last_name": user.last_name,
            "email": user.email,
            "role": user.role,
            "credits": user.credits,
            "comics_count": comics_count
        })
    return response


@router.delete("/api/admin/users/{user_id}")
async def delete_user_as_admin(user_id: int, db: AsyncSession = Depends(get_db)):
    comic_result = await db.execute(select(Comic).where(Comic.user_id == user_id))
    comics = comic_result.scalars().all()
    for comic in comics:
        file_path = os.path.join(FRONTEND_DIR, comic.images_path.lstrip("/"))
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except Exception as e:
                print(f"Error deleting file {file_path}: {e}")
        await db.delete(comic)

    user_result = await db.execute(select(DBUser).where(DBUser.user_id == user_id))
    user = user_result.scalar_one_or_none()
    if user:
        await db.delete(user)
        await db.commit()
        return {"message": "User and comics deleted"}
    else:
        raise HTTPException(status_code=404, detail="User not found")



@router.post("/api/save-history")  # ⬆ Save character history for logged-in user
async def save_character_history(
    data: CharacterData,
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    # 🔄 Check last 2–3 history records for similarity
    result = await db.execute(
        select(CharacterHistory)
        .where(CharacterHistory.user_id == current_user.user_id)
        .order_by(desc(CharacterHistory.created_at))
        .limit(3)
    )
    recent = result.scalars().all()

    for item in recent:
        if (
            item.name == data.name and
            item.age == data.age and
            item.description == data.description
        ):
            return {"message": "Duplicate history skipped"}

    # ✅ Save if it's a new/different history
    new_entry = CharacterHistory(
        user_id=current_user.user_id,
        **data.dict()
    )
    db.add(new_entry)
    await db.commit()
    return {"message": "History saved"}


@router.get("/api/get-history")  # ⬆ Get character history for user
async def get_character_history(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    result = await db.execute(
        select(CharacterHistory)
        .where(CharacterHistory.user_id == current_user.user_id)
        .order_by(desc(CharacterHistory.created_at))
    )
    items = result.scalars().all()
    return [
        {
            "id": i.id,  # ⬅️ Add this line
            "name": i.name,
            "age": i.age,
            "gender": i.gender,
            "hair": i.hair,
            "eyes": i.eyes,
            "clothes": i.clothes,
            "special": i.special,
            "description": i.description,
            "created_at": i.created_at.isoformat()
        }
        for i in items
    ]


@router.delete("/api/delete-history/{id}")  # ⬆ Delete individual history
async def delete_history_entry(id: int, db: AsyncSession = Depends(get_db), current_user: DBUser = Depends(get_current_user)):
    result = await db.execute(select(CharacterHistory).where(CharacterHistory.id == id, CharacterHistory.user_id == current_user.user_id))
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="History not found")
    await db.delete(item)
    await db.commit()
    return {"message": "History item deleted"}


@router.delete("/api/clear-history")  # 🧹 Clear all history for user
async def clear_all_history(
    db: AsyncSession = Depends(get_db),
    current_user: DBUser = Depends(get_current_user)
):
    # 🔍 Select all history entries
    result = await db.execute(
        select(CharacterHistory)
        .where(CharacterHistory.user_id == current_user.user_id)
    )
    items = result.scalars().all()

    if not items:
        return {"message": "No history to delete"}

    for item in items:
        await db.delete(item)

    await db.commit()
    return {"message": "All history cleared"}
