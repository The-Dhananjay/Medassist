import asyncio
import json
import logging
import os
import re
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any, Literal

from dotenv import load_dotenv
from fastapi import APIRouter, Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from google import genai
from jose import ExpiredSignatureError, JWTError, jwt
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from passlib.context import CryptContext
from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator
from pymongo import ASCENDING, DESCENDING, ReturnDocument
from pymongo.errors import DuplicateKeyError
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from slowapi.util import get_remote_address
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.gzip import GZipMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

try:
    import orjson  # noqa: F401
    from fastapi.responses import ORJSONResponse as AppJSONResponse
except ImportError:
    AppJSONResponse = JSONResponse

try:
    from loguru import logger as _loguru_logger

    _loguru_logger.remove()
    _loguru_logger.add(sys.stderr, level=os.getenv("LOG_LEVEL", "INFO"))
    logger: Any = _loguru_logger
except ImportError:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
    )
    logger = logging.getLogger("medassist")

logging.getLogger("passlib").setLevel(logging.ERROR)


ROOT_DIR = Path(__file__).resolve().parent
load_dotenv(ROOT_DIR / ".env")

JWT_ALGORITHM = "HS256"
ACCESS_TOKEN_TTL_DAYS = 7
COOKIE_NAME = "access_token"
DEFAULT_DISCLAIMER = (
    "This prediction is AI-generated and not a replacement for professional medical advice."
)
COMMON_SYMPTOMS = [
    "Fever",
    "Cough",
    "Headache",
    "Vomiting",
    "Chest Pain",
    "Fatigue",
    "Sore Throat",
    "Body Pain",
    "Nausea",
    "Diarrhea",
    "Shortness of Breath",
    "Runny Nose",
    "Sneezing",
    "Dizziness",
    "Loss of Appetite",
    "Abdominal Pain",
    "Back Pain",
    "Rash",
    "Chills",
    "Sweating",
    "Muscle Cramps",
    "Joint Pain",
    "Blurred Vision",
    "Ear Pain",
    "Constipation",
    "Bloating",
    "Insomnia",
    "Anxiety",
    "Palpitations",
]

DIAGNOSIS_SYSTEM_PROMPT = """
You are a conservative medical triage assistant for an educational symptom checker.
You must never claim certainty, never prescribe prescription drugs, and never replace professional care.

Return only valid JSON with this schema:
{
  "possible_diseases": [
    {
      "name": "string",
      "confidence": 0,
      "description": "string",
      "possible_causes": ["string"],
      "recommended_medicines": ["string"],
      "home_remedies": ["string"],
      "diet": ["string"],
      "precautions": ["string"],
      "when_to_see_doctor": "string",
      "doctor_required": true
    }
  ],
  "emergency_warning": "string",
  "general_advice": "string",
  "disclaimer": "string"
}

Rules:
- Return 2 to 4 likely conditions sorted by confidence descending.
- Only recommend common OTC options such as paracetamol, ibuprofen, ORS, cetirizine, loratadine,
  guaifenesin, loperamide, and antacids when clinically reasonable.
- If symptoms suggest an emergency, still return the condition list and set emergency_warning clearly.
- Keep language simple and safe for a non-clinician reader.
- Do not include markdown, backticks, commentary, or extra keys.
""".strip()

EMERGENCY_PATTERNS: tuple[tuple[set[str], str], ...] = (
    (
        {"chest pain", "shortness of breath"},
        "Chest pain with breathing difficulty can be a medical emergency. Seek urgent in-person care immediately.",
    ),
    (
        {"slurred speech", "one-sided weakness"},
        "Stroke-like symptoms require emergency evaluation immediately.",
    ),
    (
        {"fainting", "unconsciousness"},
        "Loss of consciousness or fainting can be serious and should be evaluated urgently.",
    ),
    (
        {"seizure"},
        "Seizure activity is a medical emergency, especially if it is new, prolonged, or recurrent.",
    ),
)

ALLOWED_OTC_KEYWORDS = (
    "paracetamol",
    "acetaminophen",
    "ibuprofen",
    "ors",
    "oral rehydration",
    "cetirizine",
    "loratadine",
    "guaifenesin",
    "loperamide",
    "antacid",
)


class Settings(BaseModel):
    model_config = ConfigDict(frozen=True)

    mongo_url: str = Field(min_length=1)
    db_name: str = Field(min_length=1)
    jwt_secret: str = Field(min_length=1)
    gemini_api_key: str = Field(min_length=1)
    cors_origins: tuple[str, ...]
    admin_email: EmailStr
    admin_password: str = Field(min_length=8)
    environment: str = "development"
    cookie_secure: bool = False
    cookie_samesite: Literal["lax", "none"] = "lax"
    trusted_hosts: tuple[str, ...] = ("*",)

    @classmethod
    def from_env(cls) -> "Settings":
        environment = (
            os.getenv("ENVIRONMENT")
            or ("production" if os.getenv("RENDER") else "development")
        ).strip().lower()
        raw_cors = os.getenv("CORS_ORIGINS", "").strip()
        if not raw_cors:
            raise ValueError("CORS_ORIGINS environment variable is required.")
        cors_origins = parse_origins(raw_cors)
        return cls(
            mongo_url=get_required_env("MONGO_URL"),
            db_name=get_required_env("DB_NAME"),
            jwt_secret=get_required_env("JWT_SECRET"),
            gemini_api_key=get_required_env("GEMINI_API_KEY"),
            cors_origins=tuple(cors_origins),
            admin_email=get_required_env("ADMIN_EMAIL"),
            admin_password=get_required_env("ADMIN_PASSWORD"),
            environment=environment,
            cookie_secure=environment == "production",
            cookie_samesite="none" if environment == "production" else "lax",
            trusted_hosts=build_trusted_hosts(environment),
        )


def get_required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"{name} environment variable is required.")
    return value


def parse_origins(raw_value: str) -> list[str]:
    value = raw_value.strip()
    if value.startswith("["):
        parsed = json.loads(value)
        origins = [str(item).strip() for item in parsed]
    else:
        origins = [item.strip() for item in value.split(",")]
    return [origin for origin in origins if origin]


def build_trusted_hosts(environment: str) -> tuple[str, ...]:
    if environment != "production":
        return ("*",)

    hosts = {"localhost", "127.0.0.1", "*.onrender.com"}
    render_host = os.getenv("RENDER_EXTERNAL_HOSTNAME", "").strip()
    if render_host:
        hosts.add(render_host)
    return tuple(sorted(hosts))


class RequestModel(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class RegisterInput(RequestModel):
    name: str = Field(min_length=2, max_length=80)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = Field(default=None, max_length=32)

    @field_validator("name")
    @classmethod
    def validate_name(cls, value: str) -> str:
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Name is too short.")
        return cleaned

    @field_validator("gender")
    @classmethod
    def normalize_gender(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, lower=True)


class LoginInput(RequestModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class ProfileUpdate(RequestModel):
    name: str | None = Field(default=None, min_length=2, max_length=80)
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = Field(default=None, max_length=32)
    weight: float | None = Field(default=None, ge=1, le=500)
    height: float | None = Field(default=None, ge=30, le=300)
    medical_history: str | None = Field(default=None, max_length=1000)
    allergies: str | None = Field(default=None, max_length=500)
    current_medicines: str | None = Field(default=None, max_length=500)

    @field_validator("name")
    @classmethod
    def normalize_name(cls, value: str | None) -> str | None:
        if value is None:
            return None
        cleaned = " ".join(value.split())
        if len(cleaned) < 2:
            raise ValueError("Name is too short.")
        return cleaned

    @field_validator("gender", "medical_history", "allergies", "current_medicines")
    @classmethod
    def normalize_optional_fields(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, lower=False)


class PredictInput(RequestModel):
    symptoms: list[str] = Field(min_length=1, max_length=25)
    duration: str | None = Field(default=None, max_length=120)
    additional_notes: str | None = Field(default=None, max_length=2000)
    age: int | None = Field(default=None, ge=1, le=120)
    gender: str | None = Field(default=None, max_length=32)
    weight: float | None = Field(default=None, ge=1, le=500)
    height: float | None = Field(default=None, ge=30, le=300)
    existing_diseases: str | None = Field(default=None, max_length=1000)
    allergies: str | None = Field(default=None, max_length=500)
    current_medicines: str | None = Field(default=None, max_length=500)

    @field_validator("symptoms")
    @classmethod
    def validate_symptoms(cls, value: list[str]) -> list[str]:
        cleaned: list[str] = []
        seen: set[str] = set()
        for symptom in value:
            normalized = normalize_optional_text(symptom, lower=False)
            if not normalized:
                continue
            key = normalized.lower()
            if key in seen:
                continue
            seen.add(key)
            cleaned.append(normalized)
        if not cleaned:
            raise ValueError("At least one symptom is required.")
        return cleaned

    @field_validator(
        "duration",
        "additional_notes",
        "gender",
        "existing_diseases",
        "allergies",
        "current_medicines",
    )
    @classmethod
    def normalize_predict_fields(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, lower=False)


def normalize_optional_text(value: str | None, *, lower: bool) -> str | None:
    if value is None:
        return None
    cleaned = " ".join(str(value).split()).strip()
    if not cleaned:
        return None
    return cleaned.lower() if lower else cleaned


settings = Settings.from_env()
password_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
mongo_client = AsyncIOMotorClient(
    settings.mongo_url,
    serverSelectionTimeoutMS=5000,
    connectTimeoutMS=5000,
    maxPoolSize=20,
    uuidRepresentation="standard",
)
db: AsyncIOMotorDatabase = mongo_client[settings.db_name]
gemini_client = genai.Client(api_key=settings.gemini_api_key)
limiter = Limiter(key_func=get_remote_address, default_limits=[])


def build_app() -> FastAPI:
    application = FastAPI(
        title="AI Medical Diagnosis Assistant",
        version="1.0.0",
        default_response_class=AppJSONResponse,
        lifespan=lifespan,
    )
    application.state.limiter = limiter
    register_middleware(application)
    register_exception_handlers(application)
    application.include_router(api_router)
    return application


def register_middleware(application: FastAPI) -> None:
    application.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=list(settings.trusted_hosts),
    )
    application.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Authorization", "Content-Type", "Accept"],
        max_age=600,
    )
    application.add_middleware(GZipMiddleware, minimum_size=1000)
    application.add_middleware(SlowAPIMiddleware)


def register_exception_handlers(application: FastAPI) -> None:
    application.add_exception_handler(HTTPException, http_exception_handler)
    application.add_exception_handler(
        RequestValidationError, validation_exception_handler
    )
    application.add_exception_handler(
        RateLimitExceeded, rate_limit_exception_handler
    )
    application.add_exception_handler(Exception, unexpected_exception_handler)


def make_error_response(
    status_code: int,
    message: str,
    error: str,
    detail: Any,
) -> JSONResponse:
    return AppJSONResponse(
        status_code=status_code,
        content={
            "success": False,
            "message": message,
            "error": error,
            "detail": detail,
        },
    )


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.started_at = datetime.now(timezone.utc)
    app.state.started_monotonic = time.monotonic()
    logger.info("Starting MedAssist backend")
    await db.command("ping")
    await ensure_indexes()
    await seed_admin()
    logger.info("Startup complete")
    try:
        yield
    finally:
        mongo_client.close()
        logger.info("Shutdown complete")


async def http_exception_handler(_: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail
    message = detail if isinstance(detail, str) else "Request failed."
    return make_error_response(exc.status_code, message, "http_error", detail)


async def validation_exception_handler(
    _: Request, exc: RequestValidationError
) -> JSONResponse:
    return make_error_response(
        status.HTTP_422_UNPROCESSABLE_ENTITY,
        "Validation failed.",
        "validation_error",
        exc.errors(),
    )


async def rate_limit_exception_handler(
    _: Request, exc: RateLimitExceeded
) -> JSONResponse:
    return make_error_response(
        status.HTTP_429_TOO_MANY_REQUESTS,
        "Too many requests. Please try again later.",
        "rate_limit_exceeded",
        str(exc),
    )


async def unexpected_exception_handler(
    request: Request, exc: Exception
) -> JSONResponse:
    logger.exception(f"Unhandled error on {request.method} {request.url.path}: {exc}")
    return make_error_response(
        status.HTTP_500_INTERNAL_SERVER_ERROR,
        "Internal server error.",
        "internal_server_error",
        "Internal server error.",
    )


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


def iso_utc_now() -> str:
    return utc_now().isoformat()


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_context.verify(password, password_hash)
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    now = utc_now()
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "type": "access",
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int((now + timedelta(days=ACCESS_TOKEN_TTL_DAYS)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_access_token(token: str) -> dict[str, Any]:
    try:
        payload = jwt.decode(
            token,
            settings.jwt_secret,
            algorithms=[JWT_ALGORITHM],
        )
    except ExpiredSignatureError as exc:
        raise HTTPException(status_code=401, detail="Token expired") from exc
    except JWTError as exc:
        raise HTTPException(status_code=401, detail="Invalid token") from exc

    if payload.get("type") != "access" or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def set_auth_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=ACCESS_TOKEN_TTL_DAYS * 24 * 60 * 60,
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        httponly=True,
    )


def sanitize_user(user: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": user["id"],
        "name": user.get("name"),
        "email": user["email"],
        "role": user.get("role", "patient"),
        "age": user.get("age"),
        "gender": user.get("gender"),
        "weight": user.get("weight"),
        "height": user.get("height"),
        "medical_history": user.get("medical_history"),
        "allergies": user.get("allergies"),
        "current_medicines": user.get("current_medicines"),
        "created_at": user.get("created_at"),
    }


async def get_current_user(request: Request) -> dict[str, Any]:
    token = request.cookies.get(COOKIE_NAME)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_access_token(token)
    user = await db.users.find_one(
        {"id": payload["sub"]},
        {"_id": 0, "password_hash": 0},
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


async def ensure_indexes() -> None:
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.users.create_index([("id", ASCENDING)], unique=True)
    await db.reports.create_index([("id", ASCENDING)], unique=True)
    await db.reports.create_index([("user_id", ASCENDING)])
    await db.reports.create_index([("created_at", DESCENDING)])


async def seed_admin() -> None:
    admin_email = str(settings.admin_email).lower()
    admin_password = settings.admin_password
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one(
            {
                "id": str(uuid.uuid4()),
                "name": "Admin",
                "email": admin_email,
                "password_hash": hash_password(admin_password),
                "role": "admin",
                "created_at": iso_utc_now(),
            }
        )
        logger.info(f"Seeded admin account for {admin_email}")
        return
    if not verify_password(admin_password, existing.get("password_hash", "")):
        await db.users.update_one(
            {"email": admin_email},
            {"$set": {"password_hash": hash_password(admin_password)}},
        )
        logger.info(f"Updated seeded admin password for {admin_email}")


def build_user_document(payload: RegisterInput) -> dict[str, Any]:
    return {
        "id": str(uuid.uuid4()),
        "name": payload.name,
        "email": payload.email.lower(),
        "password_hash": hash_password(payload.password),
        "role": "patient",
        "age": payload.age,
        "gender": payload.gender,
        "created_at": iso_utc_now(),
    }


def resolve_diagnosis_context(
    payload: PredictInput, user: dict[str, Any]
) -> dict[str, Any]:
    return {
        "symptoms": payload.symptoms,
        "duration": payload.duration,
        "additional_notes": payload.additional_notes,
        "age": payload.age if payload.age is not None else user.get("age"),
        "gender": payload.gender or user.get("gender"),
        "weight": payload.weight if payload.weight is not None else user.get("weight"),
        "height": payload.height if payload.height is not None else user.get("height"),
        "existing_diseases": payload.existing_diseases or user.get("medical_history"),
        "allergies": payload.allergies or user.get("allergies"),
        "current_medicines": payload.current_medicines
        or user.get("current_medicines"),
    }


def build_diagnosis_prompt(context: dict[str, Any]) -> str:
    return (
        "Patient profile:\n"
        f"- Age: {context.get('age') or 'not provided'}\n"
        f"- Gender: {context.get('gender') or 'not provided'}\n"
        f"- Weight: {context.get('weight') or 'not provided'} kg\n"
        f"- Height: {context.get('height') or 'not provided'} cm\n"
        f"- Existing diseases: {context.get('existing_diseases') or 'none reported'}\n"
        f"- Allergies: {context.get('allergies') or 'none reported'}\n"
        f"- Current medicines: {context.get('current_medicines') or 'none reported'}\n\n"
        f"Symptoms: {', '.join(context['symptoms'])}\n"
        f"Duration: {context.get('duration') or 'not specified'}\n"
        f"Additional notes: {context.get('additional_notes') or 'none'}\n\n"
        "Return only the JSON object. No markdown and no code fences."
    )


def extract_gemini_text(response: Any) -> str:
    text = getattr(response, "text", "")
    if isinstance(text, str) and text.strip():
        return text.strip()

    parts: list[str] = []
    for candidate in getattr(response, "candidates", []) or []:
        content = getattr(candidate, "content", None)
        for part in getattr(content, "parts", []) or []:
            part_text = getattr(part, "text", None)
            if isinstance(part_text, str) and part_text.strip():
                parts.append(part_text.strip())
    return "\n".join(parts).strip()


def clean_model_json(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```(?:json)?", "", cleaned, flags=re.IGNORECASE).strip()
        cleaned = re.sub(r"```$", "", cleaned).strip()
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start != -1 and end != -1 and end > start:
        cleaned = cleaned[start : end + 1]
    return cleaned


def normalize_string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        candidates = [value]
    elif isinstance(value, list):
        candidates = value
    else:
        candidates = [str(value)]
    cleaned = [item for item in (normalize_optional_text(str(v), lower=False) for v in candidates) if item]
    return cleaned[:6]


def coerce_confidence(value: Any, default: int = 45) -> int:
    if isinstance(value, (int, float)):
        return max(0, min(100, int(value)))
    if isinstance(value, str):
        match = re.search(r"\d{1,3}", value)
        if match:
            return max(0, min(100, int(match.group(0))))
    return default


def coerce_boolean(value: Any, default: bool = False) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        return value.strip().lower() in {"true", "1", "yes"}
    return default


def filter_otc_medicines(items: list[str]) -> list[str]:
    safe_items = [
        item
        for item in items
        if any(keyword in item.lower() for keyword in ALLOWED_OTC_KEYWORDS)
    ]
    return safe_items[:4]


def detect_emergency_warning(
    symptoms: list[str], additional_notes: str | None = None
) -> str:
    normalized = {symptom.lower() for symptom in symptoms}
    combined_text = " ".join([*normalized, (additional_notes or "").lower()])
    for required_terms, message in EMERGENCY_PATTERNS:
        if required_terms.issubset(normalized):
            return message
    if "radiating arm" in combined_text or "jaw pain" in combined_text:
        return "Symptoms could reflect a cardiac emergency. Seek urgent evaluation immediately."
    if "severe bleeding" in combined_text or "coughing blood" in combined_text:
        return "Severe bleeding or coughing blood requires urgent medical attention."
    if "lip swelling" in combined_text or "tongue swelling" in combined_text:
        return "Swelling of the lips or tongue can indicate a severe allergic reaction. Seek emergency care immediately."
    return ""


def normalize_prediction(
    raw_prediction: dict[str, Any], symptoms: list[str], additional_notes: str | None
) -> dict[str, Any]:
    diseases = raw_prediction.get("possible_diseases")
    if not isinstance(diseases, list):
        return rule_based_fallback(symptoms, additional_notes)

    normalized_diseases: list[dict[str, Any]] = []
    for item in diseases[:4]:
        if not isinstance(item, dict):
            continue
        name = normalize_optional_text(str(item.get("name", "")), lower=False)
        if not name:
            continue
        medicines = filter_otc_medicines(
            normalize_string_list(item.get("recommended_medicines"))
        )
        normalized_diseases.append(
            {
                "name": name,
                "confidence": coerce_confidence(item.get("confidence"), 50),
                "description": normalize_optional_text(
                    str(item.get("description", "")), lower=False
                )
                or "This is a possible explanation based on the provided symptoms.",
                "possible_causes": normalize_string_list(item.get("possible_causes")),
                "recommended_medicines": medicines,
                "home_remedies": normalize_string_list(item.get("home_remedies")),
                "diet": normalize_string_list(item.get("diet")),
                "precautions": normalize_string_list(item.get("precautions")),
                "when_to_see_doctor": normalize_optional_text(
                    str(item.get("when_to_see_doctor", "")),
                    lower=False,
                )
                or "Seek medical care if symptoms worsen, persist, or you develop red-flag symptoms.",
                "doctor_required": coerce_boolean(item.get("doctor_required")),
            }
        )

    if not normalized_diseases:
        return rule_based_fallback(symptoms, additional_notes)

    normalized_diseases.sort(key=lambda item: item["confidence"], reverse=True)
    emergency_warning = normalize_optional_text(
        raw_prediction.get("emergency_warning"),
        lower=False,
    ) or detect_emergency_warning(symptoms, additional_notes)
    general_advice = normalize_optional_text(
        raw_prediction.get("general_advice"),
        lower=False,
    ) or "Stay hydrated, rest, and seek medical evaluation if symptoms persist or worsen."
    disclaimer = normalize_optional_text(
        raw_prediction.get("disclaimer"),
        lower=False,
    ) or DEFAULT_DISCLAIMER

    return {
        "possible_diseases": normalized_diseases,
        "emergency_warning": emergency_warning or "",
        "general_advice": general_advice,
        "disclaimer": disclaimer,
    }


def rule_based_fallback(
    symptoms: list[str], additional_notes: str | None = None
) -> dict[str, Any]:
    normalized = {symptom.lower() for symptom in symptoms}
    diseases: list[dict[str, Any]] = []

    if normalized & {"fever", "cough", "sore throat", "runny nose", "fatigue"}:
        diseases.append(
            {
                "name": "Viral Upper Respiratory Infection",
                "confidence": 72,
                "description": "A common viral illness affecting the nose and throat that often improves with rest and fluids.",
                "possible_causes": ["Seasonal viral exposure", "Close contact with an infected person"],
                "recommended_medicines": ["Paracetamol 500mg for fever or body aches", "Cetirizine 10mg for congestion or sneezing"],
                "home_remedies": ["Warm fluids", "Steam inhalation", "Adequate rest"],
                "diet": ["Warm soups", "Water", "Soft foods if the throat is sore"],
                "precautions": ["Wash hands frequently", "Avoid close contact with others while symptomatic"],
                "when_to_see_doctor": "Seek care if fever lasts more than 3 days, breathing worsens, or symptoms become severe.",
                "doctor_required": False,
            }
        )
        diseases.append(
            {
                "name": "Influenza-like Illness",
                "confidence": 61,
                "description": "Flu-like symptoms can cause fever, cough, body aches, fatigue, and feeling generally unwell.",
                "possible_causes": ["Influenza virus", "Another respiratory virus"],
                "recommended_medicines": ["Paracetamol 500mg", "Ibuprofen 400mg with food if safe for you"],
                "home_remedies": ["Rest", "Hydration", "Use a humidified room if coughing"],
                "diet": ["Water", "Electrolyte fluids", "Simple easy-to-digest meals"],
                "precautions": ["Monitor breathing", "Avoid strenuous activity until improved"],
                "when_to_see_doctor": "Seek urgent care if shortness of breath, dehydration, or confusion develops.",
                "doctor_required": False,
            }
        )

    if normalized & {"diarrhea", "vomiting", "abdominal pain", "nausea"}:
        diseases.append(
            {
                "name": "Acute Gastroenteritis",
                "confidence": 69,
                "description": "Inflammation of the stomach and intestines commonly causes nausea, vomiting, diarrhea, and cramping.",
                "possible_causes": ["Viral infection", "Foodborne illness"],
                "recommended_medicines": ["ORS (oral rehydration salts)", "Loperamide only for short-term diarrhea if appropriate"],
                "home_remedies": ["Small frequent sips of fluids", "Rest", "Gradually resume bland foods"],
                "diet": ["Bananas", "Rice", "Toast", "Clear soups"],
                "precautions": ["Watch for dehydration", "Avoid oily or spicy foods until improved"],
                "when_to_see_doctor": "Seek care if you cannot keep fluids down, develop blood in stool, or have high fever.",
                "doctor_required": True,
            }
        )
        diseases.append(
            {
                "name": "Dehydration Related Symptoms",
                "confidence": 53,
                "description": "Fluid loss from vomiting or diarrhea can lead to dizziness, weakness, headache, and dry mouth.",
                "possible_causes": ["Reduced fluid intake", "Ongoing gastrointestinal fluid loss"],
                "recommended_medicines": ["ORS (oral rehydration salts)"],
                "home_remedies": ["Sip fluids regularly", "Rest in a cool environment"],
                "diet": ["Electrolyte drinks", "Water-rich foods", "Simple bland foods"],
                "precautions": ["Monitor urine output", "Seek help if dizziness becomes severe"],
                "when_to_see_doctor": "Seek urgent care if dehydration becomes severe, especially with confusion or fainting.",
                "doctor_required": True,
            }
        )

    if normalized & {"headache", "dizziness", "nausea"}:
        diseases.append(
            {
                "name": "Tension Headache or Migraine Pattern",
                "confidence": 58,
                "description": "Headache with nausea or light sensitivity may reflect a tension headache or migraine-like pattern.",
                "possible_causes": ["Stress", "Dehydration", "Sleep disruption"],
                "recommended_medicines": ["Paracetamol 500mg", "Ibuprofen 400mg with food if safe for you"],
                "home_remedies": ["Rest in a quiet room", "Hydration", "Cold compress"],
                "diet": ["Water", "Light meals", "Avoid alcohol if symptoms are active"],
                "precautions": ["Limit screen time", "Track recurrent triggers"],
                "when_to_see_doctor": "Seek care if the headache is sudden, the worst of your life, or linked to weakness or vision loss.",
                "doctor_required": False,
            }
        )

    if normalized & {"chest pain", "shortness of breath", "palpitations"}:
        diseases.append(
            {
                "name": "Cardiopulmonary or Anxiety-Related Symptoms",
                "confidence": 49,
                "description": "Chest discomfort, breathing difficulty, or palpitations can have causes ranging from anxiety to heart or lung conditions.",
                "possible_causes": ["Anxiety or panic", "Respiratory irritation", "Cardiac conditions"],
                "recommended_medicines": [],
                "home_remedies": ["Rest while seeking urgent evaluation"],
                "diet": ["Avoid stimulants until evaluated"],
                "precautions": ["Do not ignore severe or persistent symptoms"],
                "when_to_see_doctor": "Seek emergency medical attention immediately if symptoms are severe, persistent, or associated with sweating or fainting.",
                "doctor_required": True,
            }
        )

    if normalized & {"rash", "sneezing", "itching"}:
        diseases.append(
            {
                "name": "Allergic Reaction",
                "confidence": 55,
                "description": "Rash or sneezing may reflect an allergic response to food, environment, or another trigger.",
                "possible_causes": ["Environmental allergens", "Food sensitivity", "Medication reaction"],
                "recommended_medicines": ["Cetirizine 10mg", "Loratadine 10mg"],
                "home_remedies": ["Avoid suspected triggers", "Cool compress for itchy skin"],
                "diet": ["Avoid any recently suspected trigger foods"],
                "precautions": ["Monitor for swelling or breathing difficulty"],
                "when_to_see_doctor": "Seek emergency care if you develop facial swelling, tongue swelling, or trouble breathing.",
                "doctor_required": False,
            }
        )

    if len(diseases) < 2:
        diseases.append(
            {
                "name": "Non-specific Viral Syndrome",
                "confidence": 44,
                "description": "The symptom pattern may fit a common short-lived viral illness without a single clear diagnosis yet.",
                "possible_causes": ["Common viral infection", "General inflammation", "Temporary stress on the body"],
                "recommended_medicines": ["Paracetamol 500mg as needed for fever or pain"],
                "home_remedies": ["Rest", "Hydration", "Monitor symptoms over the next 24 to 48 hours"],
                "diet": ["Light balanced meals", "Plenty of fluids"],
                "precautions": ["Reassess if new symptoms appear"],
                "when_to_see_doctor": "Seek care if symptoms persist beyond a few days or become more intense.",
                "doctor_required": False,
            }
        )

    if len(diseases) < 2:
        diseases.append(
            {
                "name": "Mild Dehydration or Fatigue State",
                "confidence": 38,
                "description": "Poor sleep, stress, low fluid intake, or a mild illness can create vague symptoms such as weakness or headache.",
                "possible_causes": ["Low fluid intake", "Poor sleep", "Stress", "Recovery from mild illness"],
                "recommended_medicines": ["ORS (oral rehydration salts) if fluid intake has been poor"],
                "home_remedies": ["Rest", "Regular fluids", "Light meals"],
                "diet": ["Water", "Electrolytes", "Simple nourishing foods"],
                "precautions": ["Monitor symptoms closely"],
                "when_to_see_doctor": "Seek care if you are not improving, or if alarming symptoms develop.",
                "doctor_required": False,
            }
        )

    diseases.sort(key=lambda item: item["confidence"], reverse=True)
    emergency_warning = detect_emergency_warning(symptoms, additional_notes)

    return {
        "possible_diseases": diseases[:4],
        "emergency_warning": emergency_warning,
        "general_advice": "Monitor symptoms closely, stay hydrated, and seek professional evaluation if symptoms worsen, persist, or feel concerning.",
        "disclaimer": DEFAULT_DISCLAIMER,
    }


async def run_ai_diagnosis(context: dict[str, Any]) -> dict[str, Any]:
    prompt = build_diagnosis_prompt(context)
    try:
        response = await asyncio.wait_for(
            asyncio.to_thread(
                gemini_client.models.generate_content,
                model="gemini-2.5-flash",
                contents=[DIAGNOSIS_SYSTEM_PROMPT, prompt],
            ),
            timeout=25,
        )
        raw_text = extract_gemini_text(response)
        if not raw_text:
            raise ValueError("Gemini returned an empty response.")
        parsed = json.loads(clean_model_json(raw_text))
        if not isinstance(parsed, dict):
            raise ValueError("Gemini response was not a JSON object.")
        return normalize_prediction(
            parsed,
            context["symptoms"],
            context.get("additional_notes"),
        )
    except Exception as exc:
        logger.warning(f"AI diagnosis failed, using fallback: {exc}")
        return rule_based_fallback(
            context["symptoms"],
            context.get("additional_notes"),
        )


api_router = APIRouter(prefix="/api")


@limiter.limit("3/minute")
@api_router.post("/auth/register")
async def register(
    request: Request,
    payload: RegisterInput,
    response: Response,
) -> dict[str, Any]:
    user_doc = build_user_document(payload)
    try:
        await db.users.insert_one(user_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=400, detail="Email already registered") from exc

    token = create_access_token(user_doc["id"], user_doc["email"], user_doc["role"])
    set_auth_cookie(response, token)
    logger.info(f"Registered user {user_doc['email']}")
    return {"user": sanitize_user(user_doc), "token": token}


@limiter.limit("5/minute")
@api_router.post("/auth/login")
async def login(
    request: Request,
    payload: LoginInput,
    response: Response,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_access_token(user["id"], user["email"], user.get("role", "patient"))
    set_auth_cookie(response, token)
    logger.info(f"Successful login for {email}")
    return {"user": sanitize_user(user), "token": token}


@api_router.post("/auth/logout")
async def logout(response: Response) -> dict[str, bool]:
    clear_auth_cookie(response)
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": sanitize_user(user)}


@api_router.get("/profile")
async def get_profile(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": sanitize_user(user)}


@api_router.put("/profile")
async def update_profile(
    payload: ProfileUpdate,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    updates = payload.model_dump(exclude_none=True)
    if not updates:
        return {"user": sanitize_user(user)}

    updated = await db.users.find_one_and_update(
        {"id": user["id"]},
        {"$set": updates},
        projection={"_id": 0, "password_hash": 0},
        return_document=ReturnDocument.AFTER,
    )
    if not updated:
        raise HTTPException(status_code=404, detail="User not found")
    return {"user": sanitize_user(updated)}


@limiter.limit("10/minute")
@api_router.post("/predict")
async def predict(
    request: Request,
    payload: PredictInput,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    context = resolve_diagnosis_context(payload, user)
    result = await run_ai_diagnosis(context)
    top_disease = result["possible_diseases"][0] if result.get("possible_diseases") else {}
    report_doc = {
        "id": str(uuid.uuid4()),
        "user_id": user["id"],
        "symptoms": context["symptoms"],
        "duration": context.get("duration"),
        "additional_notes": context.get("additional_notes"),
        "profile_snapshot": {
            "age": context.get("age"),
            "gender": context.get("gender"),
            "weight": context.get("weight"),
            "height": context.get("height"),
            "existing_diseases": context.get("existing_diseases"),
            "allergies": context.get("allergies"),
            "current_medicines": context.get("current_medicines"),
        },
        "prediction": result,
        "top_disease": top_disease.get("name", "Unknown"),
        "confidence": top_disease.get("confidence", 0),
        "created_at": iso_utc_now(),
    }
    await db.reports.insert_one(report_doc)
    report_doc.pop("_id", None)
    logger.info(f"Generated report {report_doc['id']} for user {user['id']}")
    return {"report": report_doc}


@api_router.get("/reports")
async def list_reports(
    q: str | None = None,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    query: dict[str, Any] = {"user_id": user["id"]}
    if q and q.strip():
        pattern = re.escape(q.strip())
        query["$or"] = [
            {"top_disease": {"$regex": pattern, "$options": "i"}},
            {"symptoms": {"$regex": pattern, "$options": "i"}},
        ]
    cursor = (
        db.reports.find(query, {"_id": 0})
        .sort("created_at", DESCENDING)
        .limit(200)
    )
    reports = await cursor.to_list(length=200)
    return {"reports": reports}


@api_router.get("/reports/{report_id}")
async def get_report(
    report_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    report = await db.reports.find_one(
        {"id": report_id, "user_id": user["id"]},
        {"_id": 0},
    )
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"report": report}


@api_router.delete("/reports/{report_id}")
async def delete_report(
    report_id: str,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    result = await db.reports.delete_one({"id": report_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Report not found")
    return {"ok": True}


@api_router.get("/symptoms")
async def list_symptoms() -> dict[str, list[str]]:
    return {"symptoms": COMMON_SYMPTOMS}


@api_router.get("/")
async def api_root() -> dict[str, str]:
    return {"message": "AI Medical Diagnosis Assistant API", "status": "ok"}


app = build_app()


@app.get("/")
async def root() -> dict[str, str]:
    return {"message": "MedAssist backend is running", "status": "ok"}


@app.get("/health")
async def health() -> dict[str, Any]:
    database_status = "ok"
    try:
        await db.command("ping")
    except Exception as exc:
        logger.warning(f"Health check database ping failed: {exc}")
        database_status = "unavailable"

    ai_status = "configured" if settings.gemini_api_key else "unavailable"
    uptime = round(time.monotonic() - app.state.started_monotonic, 2)
    status_text = "ok" if database_status == "ok" else "degraded"
    return {
        "status": status_text,
        "database": database_status,
        "ai": ai_status,
        "uptime": uptime,
        "environment": settings.environment,
    }
    