from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

import os
import json
import uuid
import logging
import bcrypt
import jwt
from datetime import datetime, timezone, timedelta
from typing import List, Optional, Annotated

from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request, Response
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, EmailStr, ConfigDict

from google import genai
# ---------- Config ----------
MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"
GEMINI_API_KEY = os.environ["GEMINI_API_KEY"]

gemini = genai.Client(api_key=GEMINI_API_KEY)

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="AI Medical Diagnosis Assistant")
api = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("medassist")


# ---------- Models ----------
class RegisterInput(BaseModel):
    name: str
    email: EmailStr
    password: str
    age: Optional[int] = None
    gender: Optional[str] = None


class LoginInput(BaseModel):
    email: EmailStr
    password: str


class ProfileUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    medical_history: Optional[str] = None
    allergies: Optional[str] = None
    current_medicines: Optional[str] = None


class PredictInput(BaseModel):
    symptoms: List[str]
    duration: Optional[str] = None
    additional_notes: Optional[str] = None
    age: Optional[int] = None
    gender: Optional[str] = None
    weight: Optional[float] = None
    height: Optional[float] = None
    existing_diseases: Optional[str] = None
    allergies: Optional[str] = None
    current_medicines: Optional[str] = None


# ---------- Utility ----------
def hash_password(pw: str) -> str:
    return bcrypt.hashpw(pw.encode(), bcrypt.gensalt()).decode()


def verify_password(pw: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(pw.encode(), hashed.encode())
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def sanitize_user(u: dict) -> dict:
    return {
        "id": u["id"],
        "name": u.get("name"),
        "email": u["email"],
        "role": u.get("role", "patient"),
        "age": u.get("age"),
        "gender": u.get("gender"),
        "weight": u.get("weight"),
        "height": u.get("height"),
        "medical_history": u.get("medical_history"),
        "allergies": u.get("allergies"),
        "current_medicines": u.get("current_medicines"),
        "created_at": u.get("created_at"),
    }


async def get_current_user(request: Request) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth = request.headers.get("Authorization", "")
        if auth.startswith("Bearer "):
            token = auth[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = await db.users.find_one({"id": payload["sub"]}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key="access_token",
        value=token,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=7 * 24 * 3600,
        path="/",
    )


# ---------- Auth Endpoints ----------
@api.post("/auth/register")
async def register(payload: RegisterInput, response: Response):
    email = payload.email.lower().strip()
    exists = await db.users.find_one({"email": email})
    if exists:
        raise HTTPException(status_code=400, detail="Email already registered")
    user_id = str(uuid.uuid4())
    doc = {
        "id": user_id,
        "name": payload.name.strip(),
        "email": email,
        "password_hash": hash_password(payload.password),
        "role": "patient",
        "age": payload.age,
        "gender": payload.gender,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.users.insert_one(doc)
    token = create_access_token(user_id, email, "patient")
    set_auth_cookie(response, token)
    return {"user": sanitize_user(doc), "token": token}


@api.post("/auth/login")
async def login(payload: LoginInput, response: Response):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    token = create_access_token(user["id"], user["email"], user.get("role", "patient"))
    set_auth_cookie(response, token)
    return {"user": sanitize_user(user), "token": token}


@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie("access_token", path="/")
    return {"ok": True}


@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return {"user": sanitize_user(user)}


@api.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return {"user": sanitize_user(user)}


@api.put("/profile")
async def update_profile(payload: ProfileUpdate, user=Depends(get_current_user)):
    updates = {k: v for k, v in payload.model_dump().items() if v is not None}
    if updates:
        await db.users.update_one({"id": user["id"]}, {"$set": updates})
    updated = await db.users.find_one({"id": user["id"]}, {"_id": 0})
    return {"user": sanitize_user(updated)}


# ---------- AI Diagnosis ----------
DIAGNOSIS_SYSTEM_PROMPT = """You are a careful medical triage AI assisting a preliminary symptom checker. You are NOT a doctor and your output is educational only.

Given a patient's symptoms and profile, return ONLY valid JSON (no markdown, no prose) with the following exact schema:

{
  "possible_diseases": [
    {
      "name": "string - name of the condition",
      "confidence": "integer 0-100",
      "description": "1-2 sentence layman description",
      "possible_causes": ["cause 1", "cause 2"],
      "recommended_medicines": ["general OTC medicine 1 (e.g., paracetamol 500mg)", "..."],
      "home_remedies": ["remedy 1", "remedy 2"],
      "diet": ["food/drink suggestion 1", "..."],
      "precautions": ["precaution 1", "..."],
      "when_to_see_doctor": "string - specific red flags",
      "doctor_required": true
    }
  ],
  "emergency_warning": "string or empty - only fill if any symptom suggests an EMERGENCY (chest pain with radiating arm, severe shortness of breath, uncontrolled bleeding, stroke signs, etc.)",
  "general_advice": "string - 1-2 sentences of overall guidance",
  "disclaimer": "This prediction is AI-generated and not a replacement for professional medical advice."
}

Return between 2 and 4 diseases, sorted by confidence descending. Only suggest common OTC medicines (paracetamol, ibuprofen, ORS, cetirizine, loratadine, guaifenesin, loperamide, antacids). Never suggest prescription drugs. If symptoms indicate emergency, still return diseases but populate emergency_warning."""


def rule_based_fallback(symptoms: List[str]) -> dict:
    s = {sy.lower() for sy in symptoms}
    diseases = []
    if s & {"fever", "cough", "sore throat", "body pain", "fatigue"}:
        diseases.append({
            "name": "Common Cold / Viral Upper Respiratory Infection",
            "confidence": 70,
            "description": "A viral infection affecting the nose and throat, usually self-limiting.",
            "possible_causes": ["Rhinovirus", "Seasonal viral exposure"],
            "recommended_medicines": ["Paracetamol 500mg for fever", "Cetirizine 10mg for congestion"],
            "home_remedies": ["Warm fluids and honey-lemon tea", "Steam inhalation", "Adequate rest"],
            "diet": ["Warm soups", "Citrus fruits", "Ginger tea"],
            "precautions": ["Cover mouth when coughing", "Wash hands frequently"],
            "when_to_see_doctor": "If fever persists over 3 days or breathing becomes difficult",
            "doctor_required": False,
        })
    if s & {"headache", "nausea"}:
        diseases.append({
            "name": "Tension Headache / Migraine",
            "confidence": 55,
            "description": "Head pain often triggered by stress, dehydration, or sensory stimuli.",
            "possible_causes": ["Stress", "Dehydration", "Screen fatigue"],
            "recommended_medicines": ["Paracetamol 500mg", "Ibuprofen 400mg"],
            "home_remedies": ["Rest in a dark room", "Cold compress on forehead", "Hydration"],
            "diet": ["Water-rich foods", "Avoid caffeine spikes"],
            "precautions": ["Limit screen time", "Regular sleep schedule"],
            "when_to_see_doctor": "If headache is sudden, severe, or with vision changes",
            "doctor_required": False,
        })
    if s & {"diarrhea", "vomiting"}:
        diseases.append({
            "name": "Gastroenteritis",
            "confidence": 65,
            "description": "Inflammation of the stomach and intestines, typically from viral or bacterial cause.",
            "possible_causes": ["Contaminated food/water", "Viral infection"],
            "recommended_medicines": ["ORS (oral rehydration salts)", "Loperamide (short-term)"],
            "home_remedies": ["Clear fluids", "BRAT diet (Banana, Rice, Applesauce, Toast)"],
            "diet": ["Bananas", "Boiled rice", "Buttermilk"],
            "precautions": ["Wash hands", "Avoid raw foods until recovered"],
            "when_to_see_doctor": "If blood in stool, high fever, or signs of dehydration",
            "doctor_required": True,
        })
    if not diseases:
        diseases.append({
            "name": "Non-specific viral syndrome",
            "confidence": 40,
            "description": "Symptoms suggest a mild self-limiting condition without a clear pattern.",
            "possible_causes": ["Minor viral illness", "Stress or fatigue"],
            "recommended_medicines": ["Paracetamol 500mg as needed"],
            "home_remedies": ["Rest", "Hydration", "Balanced meals"],
            "diet": ["Balanced whole foods", "Plenty of water"],
            "precautions": ["Monitor symptoms for 48 hours"],
            "when_to_see_doctor": "If symptoms worsen or persist beyond 5 days",
            "doctor_required": False,
        })
    emergency = ""
    if s & {"chest pain", "shortness of breath"}:
        emergency = "Chest pain and/or breathing difficulty can indicate a cardiac or pulmonary emergency. Seek immediate care if severe, radiating, or with sweating."
    return {
        "possible_diseases": diseases,
        "emergency_warning": emergency,
        "general_advice": "Monitor symptoms, stay hydrated, and rest. Consult a professional if things worsen.",
        "disclaimer": "This prediction is AI-generated and not a replacement for professional medical advice.",
    }


async def run_ai_diagnosis(payload: PredictInput) -> dict:
    user_prompt = f"""Patient profile:
- Age: {payload.age or 'not provided'}
- Gender: {payload.gender or 'not provided'}
- Weight: {payload.weight or 'not provided'} kg
- Height: {payload.height or 'not provided'} cm
- Existing diseases: {payload.existing_diseases or 'none reported'}
- Allergies: {payload.allergies or 'none reported'}
- Current medicines: {payload.current_medicines or 'none reported'}

Symptoms: {', '.join(payload.symptoms)}
Duration: {payload.duration or 'not specified'}
Additional notes: {payload.additional_notes or 'none'}

Return ONLY the JSON object as specified. No markdown code fences."""

try:
    response = gemini.models.generate_content(
        model="gemini-2.5-flash",
        contents=[
            DIAGNOSIS_SYSTEM_PROMPT,
            user_prompt,
        ],
    )

    text = response.text.strip()

    if text.startswith("```"):
        # strip code fences
        text = text.strip("`")
        if text.lower().startswith("json"):
            text = text[4:].strip()

    start = text.find("{")
    end = text.rfind("}")

    if start != -1 and end != -1:
        text = text[start:end + 1]

    parsed = json.loads(text)

    if "disclaimer" not in parsed:
        parsed["disclaimer"] = (
            "This prediction is AI-generated and not a replacement for professional medical advice."
        )

    return parsed

except Exception as e:
    logger.warning(f"AI diagnosis failed, using fallback: {e}")
    return rule_based_fallback(payload.symptoms)


@api.post("/predict")
async def predict(payload: PredictInput, user=Depends(get_current_user)):
    if not payload.symptoms:
        raise HTTPException(status_code=400, detail="At least one symptom is required")
    result = await run_ai_diagnosis(payload)

    top = result.get("possible_diseases", [{}])[0] if result.get("possible_diseases") else {}
    report_id = str(uuid.uuid4())
    report_doc = {
        "id": report_id,
        "user_id": user["id"],
        "symptoms": payload.symptoms,
        "duration": payload.duration,
        "additional_notes": payload.additional_notes,
        "profile_snapshot": {
            "age": payload.age,
            "gender": payload.gender,
            "weight": payload.weight,
            "height": payload.height,
            "existing_diseases": payload.existing_diseases,
            "allergies": payload.allergies,
            "current_medicines": payload.current_medicines,
        },
        "prediction": result,
        "top_disease": top.get("name", "Unknown"),
        "confidence": top.get("confidence", 0),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.reports.insert_one(report_doc)
    report_doc.pop("_id", None)
    return {"report": report_doc}


@api.get("/reports")
async def list_reports(user=Depends(get_current_user), q: Optional[str] = None):
    query = {"user_id": user["id"]}
    cursor = db.reports.find(query, {"_id": 0}).sort("created_at", -1).limit(200)
    reports = await cursor.to_list(200)
    if q:
        ql = q.lower()
        reports = [
            r for r in reports
            if ql in (r.get("top_disease", "") or "").lower()
            or any(ql in s.lower() for s in r.get("symptoms", []))
        ]
    return {"reports": reports}


@api.get("/reports/{report_id}")
async def get_report(report_id: str, user=Depends(get_current_user)):
    r = await db.reports.find_one({"id": report_id, "user_id": user["id"]}, {"_id": 0})
    if not r:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report": r}


@api.delete("/reports/{report_id}")
async def delete_report(report_id: str, user=Depends(get_current_user)):
    res = await db.reports.delete_one({"id": report_id, "user_id": user["id"]})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"ok": True}


@api.get("/symptoms")
async def list_symptoms():
    return {
        "symptoms": [
            "Fever", "Cough", "Headache", "Vomiting", "Chest Pain", "Fatigue",
            "Sore Throat", "Body Pain", "Nausea", "Diarrhea", "Shortness of Breath",
            "Runny Nose", "Sneezing", "Dizziness", "Loss of Appetite",
            "Abdominal Pain", "Back Pain", "Rash", "Chills", "Sweating",
            "Muscle Cramps", "Joint Pain", "Blurred Vision", "Ear Pain",
            "Constipation", "Bloating", "Insomnia", "Anxiety", "Palpitations",
        ]
    }


@api.get("/")
async def root():
    return {"message": "AI Medical Diagnosis Assistant API", "status": "ok"}


# ---------- App wiring ----------
app.include_router(api)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await db.users.create_index("email", unique=True)
    await db.reports.create_index("user_id")
    # Seed admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@medassist.ai").lower()
    admin_password = os.environ.get("ADMIN_PASSWORD", "admin123")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({
            "id": str(uuid.uuid4()),
            "name": "Admin",
            "email": admin_email,
            "password_hash": hash_password(admin_password),
            "role": "admin",
            "created_at": datetime.now(timezone.utc).isoformat(),
        })
        logger.info(f"Seeded admin: {admin_email}")
    elif not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_password)}})


@app.on_event("shutdown")
async def shutdown():
    client.close()
