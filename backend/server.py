import asyncio
import hashlib
import hmac
import json
import logging
import os
import re
import secrets
import smtplib
import ssl
import sys
import time
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from email.message import EmailMessage
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
ACCESS_TOKEN_TTL_MINUTES = 15
REFRESH_TOKEN_TTL_DAYS = 30
RESET_TOKEN_TTL_MINUTES = 15
OTP_TTL_MINUTES = 10
OTP_LENGTH = 6
OTP_MAX_ATTEMPTS = 5
OTP_RESEND_COOLDOWN_SECONDS = 60
OTP_RESEND_LIMIT_PER_HOUR = 3
MAX_LOGIN_FAILURES = 10
ACCOUNT_LOCK_MINUTES = 15
COOKIE_NAME = "access_token"
REFRESH_COOKIE_NAME = "refresh_token"
CSRF_COOKIE_NAME = "csrf_token"
OTP_PURPOSE_VERIFY_EMAIL = "verify_email"
OTP_PURPOSE_FORGOT_PASSWORD = "forgot_password"
DEFAULT_DISCLAIMER = (
    "This prediction is AI-generated and not a replacement for professional medical advice."
)
SAFE_HTTP_METHODS = {"GET", "HEAD", "OPTIONS"}
CSRF_EXEMPT_PATHS = {
    "/api/auth/register",
    "/api/auth/login",
    "/api/auth/verify-email",
    "/api/auth/resend-verification",
    "/api/auth/forgot-password",
    "/api/auth/verify-reset-otp",
    "/api/auth/reset-password",
    "/api/auth/resend-reset-otp",
}
PASSWORD_POLICY_MESSAGE = (
    "Password must be 8 to 128 characters and include uppercase, lowercase, "
    "a number, and a special character."
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
    frontend_url: str | None = None
    mail_username: str | None = None
    mail_password: str | None = None
    mail_from: str | None = None
    mail_server: str | None = None
    mail_port: int | None = None

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
        frontend_url = os.getenv("FRONTEND_URL", "").strip() or (
            cors_origins[0] if cors_origins else None
        )
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
            frontend_url=frontend_url,
            mail_username=get_optional_env("MAIL_USERNAME"),
            mail_password=get_optional_env("MAIL_PASSWORD"),
            mail_from=get_optional_env("MAIL_FROM"),
            mail_server=get_optional_env("MAIL_SERVER"),
            mail_port=parse_optional_int_env("MAIL_PORT"),
        )


def get_required_env(name: str) -> str:
    value = os.getenv(name, "").strip()
    if not value:
        raise ValueError(f"{name} environment variable is required.")
    return value


def get_optional_env(name: str) -> str | None:
    value = os.getenv(name, "").strip()
    return value or None


def parse_optional_int_env(name: str) -> int | None:
    raw_value = os.getenv(name, "").strip()
    if not raw_value:
        return None
    return int(raw_value)


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


def enforce_password_policy(password: str) -> str:
    if len(password) < 8 or len(password) > 128:
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"[A-Z]", password):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"[a-z]", password):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"\d", password):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    if not re.search(r"[^A-Za-z0-9]", password):
        raise ValueError(PASSWORD_POLICY_MESSAGE)
    return password


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

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return enforce_password_policy(value)

    @field_validator("gender")
    @classmethod
    def normalize_gender(cls, value: str | None) -> str | None:
        return normalize_optional_text(value, lower=True)


class LoginInput(RequestModel):
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class EmailInput(RequestModel):
    email: EmailStr


class VerifyOtpInput(RequestModel):
    email: EmailStr
    otp: str = Field(min_length=OTP_LENGTH, max_length=OTP_LENGTH)

    @field_validator("otp")
    @classmethod
    def normalize_otp(cls, value: str) -> str:
        digits = "".join(ch for ch in value if ch.isdigit())
        if len(digits) != OTP_LENGTH:
            raise ValueError("OTP must be 6 digits.")
        return digits


class ResetPasswordInput(RequestModel):
    email: EmailStr
    reset_token: str = Field(min_length=20)
    password: str = Field(min_length=8, max_length=128)

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str) -> str:
        return enforce_password_policy(value)


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
        allow_headers=["Authorization", "Content-Type", "Accept", "X-CSRF-Token"],
        max_age=600,
    )
    application.add_middleware(GZipMiddleware, minimum_size=1000)
    application.add_middleware(SlowAPIMiddleware)

    @application.middleware("http")
    async def security_middleware(request: Request, call_next):
        if requires_csrf_check(request):
            csrf_cookie = request.cookies.get(CSRF_COOKIE_NAME, "")
            csrf_header = request.headers.get("X-CSRF-Token", "")
            if not csrf_cookie or not csrf_header or not hmac.compare_digest(
                csrf_cookie, csrf_header
            ):
                return make_error_response(
                    status.HTTP_403_FORBIDDEN,
                    "CSRF validation failed.",
                    "csrf_error",
                    "Missing or invalid CSRF token.",
                )

        response = await call_next(request)
        for header, value in build_security_headers().items():
            response.headers.setdefault(header, value)
        if request.url.path.startswith("/api/auth"):
            response.headers["Cache-Control"] = "no-store"
        return response


def requires_csrf_check(request: Request) -> bool:
    if request.method.upper() in SAFE_HTTP_METHODS:
        return False
    if request.url.path in CSRF_EXEMPT_PATHS:
        return False
    return bool(request.cookies.get(COOKIE_NAME) or request.cookies.get(REFRESH_COOKIE_NAME))


def build_security_headers() -> dict[str, str]:
    connect_sources = ["'self'"]
    connect_sources.extend(settings.cors_origins)
    csp = "; ".join(
        [
            "default-src 'self'",
            "frame-ancestors 'none'",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
            "img-src 'self' data: https:",
            "font-src 'self' https://fonts.gstatic.com data:",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net", 
            f"connect-src {' '.join(connect_sources)}",
        ]
    )
    return {
        "X-Frame-Options": "DENY",
        "Content-Security-Policy": csp,
        "Referrer-Policy": "strict-origin-when-cross-origin",
        "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
        "X-Content-Type-Options": "nosniff",
    }


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
    await migrate_existing_users()
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


def serialize_datetime(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        return value
    if isinstance(value, datetime):
        if value.tzinfo is None:
            value = value.replace(tzinfo=timezone.utc)
        return value.astimezone(timezone.utc).isoformat()
    return str(value)


def coerce_datetime(value: Any) -> datetime | None:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value if value.tzinfo else value.replace(tzinfo=timezone.utc)
    if isinstance(value, str):
        normalized = value.replace("Z", "+00:00")
        try:
            parsed = datetime.fromisoformat(normalized)
        except ValueError:
            return None
        return parsed if parsed.tzinfo else parsed.replace(tzinfo=timezone.utc)
    return None


def hash_password(password: str) -> str:
    return password_context.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    try:
        return password_context.verify(password, password_hash)
    except Exception:
        return False


def hash_with_secret(*parts: str) -> str:
    payload = "::".join(parts).encode("utf-8")
    return hmac.new(
        settings.jwt_secret.encode("utf-8"),
        payload,
        hashlib.sha256,
    ).hexdigest()


def hash_otp(email: str, purpose: str, otp: str) -> str:
    return hash_with_secret("otp", email.lower(), purpose, otp)


def hash_refresh_token(token: str) -> str:
    return hash_with_secret("refresh", token)


def generate_otp() -> str:
    return "".join(secrets.choice("0123456789") for _ in range(OTP_LENGTH))


def create_signed_token(
    subject: str,
    token_type: str,
    ttl: timedelta,
    extra: dict[str, Any] | None = None,
) -> str:
    now = utc_now()
    payload: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "nbf": int(now.timestamp()),
        "exp": int((now + ttl).timestamp()),
    }
    if extra:
        payload.update(extra)
    return jwt.encode(payload, settings.jwt_secret, algorithm=JWT_ALGORITHM)


def decode_signed_token(token: str, expected_type: str) -> dict[str, Any]:
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

    if payload.get("type") != expected_type or not payload.get("sub"):
        raise HTTPException(status_code=401, detail="Invalid token")
    return payload


def create_access_token(user_id: str, email: str, role: str, session_id: str) -> str:
    return create_signed_token(
        user_id,
        "access",
        timedelta(minutes=ACCESS_TOKEN_TTL_MINUTES),
        {"email": email, "role": role, "sid": session_id},
    )


def create_refresh_token(user_id: str, email: str, role: str, session_id: str) -> str:
    return create_signed_token(
        user_id,
        "refresh",
        timedelta(days=REFRESH_TOKEN_TTL_DAYS),
        {"email": email, "role": role, "sid": session_id},
    )


def create_reset_token(email: str, reset_id: str) -> str:
    return create_signed_token(
        email.lower(),
        "reset_password",
        timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        {"email": email.lower(), "reset_id": reset_id},
    )


def set_access_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=ACCESS_TOKEN_TTL_MINUTES * 60,
        path="/",
    )


def set_refresh_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=REFRESH_COOKIE_NAME,
        value=token,
        httponly=True,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
        path="/",
    )


def set_csrf_cookie(response: Response, token: str) -> None:
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=token,
        httponly=False,
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        max_age=REFRESH_TOKEN_TTL_DAYS * 24 * 60 * 60,
        path="/",
    )


def set_auth_cookies(response: Response, bundle: dict[str, Any]) -> None:
    set_access_cookie(response, bundle["access_token"])
    set_refresh_cookie(response, bundle["refresh_token"])
    set_csrf_cookie(response, bundle["csrf_token"])


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie(
        key=COOKIE_NAME,
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        httponly=True,
    )
    response.delete_cookie(
        key=REFRESH_COOKIE_NAME,
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
        httponly=True,
    )
    response.delete_cookie(
        key=CSRF_COOKIE_NAME,
        path="/",
        secure=settings.cookie_secure,
        samesite=settings.cookie_samesite,
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
        "created_at": serialize_datetime(user.get("created_at")),
        "email_verified": bool(user.get("email_verified", False)),
        "verified_at": serialize_datetime(user.get("verified_at")),
        "last_login_at": serialize_datetime(user.get("last_login_at")),
    }


def sanitize_session(session: dict[str, Any], current_session_id: str | None) -> dict[str, Any]:
    return {
        "id": session["id"],
        "ip_address": session.get("ip_address"),
        "browser": session.get("browser"),
        "device": session.get("device"),
        "os": session.get("os"),
        "user_agent": session.get("user_agent"),
        "created_at": serialize_datetime(session.get("created_at")),
        "last_active_at": serialize_datetime(session.get("last_active_at")),
        "expires_at": serialize_datetime(session.get("expires_at")),
        "current": session["id"] == current_session_id,
    }


def get_client_ip(request: Request) -> str:
    forwarded_for = request.headers.get("x-forwarded-for", "").strip()
    if forwarded_for:
        return forwarded_for.split(",")[0].strip()
    if request.client and request.client.host:
        return request.client.host
    return "unknown"


def parse_user_agent(user_agent: str) -> dict[str, str]:
    ua = user_agent or ""
    browser = "Unknown Browser"
    if "Edg/" in ua:
        browser = "Microsoft Edge"
    elif "Chrome/" in ua and "Chromium" not in ua and "Edg/" not in ua:
        browser = "Google Chrome"
    elif "Firefox/" in ua:
        browser = "Mozilla Firefox"
    elif "Safari/" in ua and "Chrome/" not in ua:
        browser = "Safari"

    device = "Desktop"
    if any(token in ua for token in ("iPhone", "Android", "Mobile")):
        device = "Mobile"
    elif any(token in ua for token in ("iPad", "Tablet")):
        device = "Tablet"

    os_name = "Unknown OS"
    if "Windows" in ua:
        os_name = "Windows"
    elif "Mac OS X" in ua or "Macintosh" in ua:
        os_name = "macOS"
    elif "Android" in ua:
        os_name = "Android"
    elif "iPhone" in ua or "iPad" in ua:
        os_name = "iOS"
    elif "Linux" in ua:
        os_name = "Linux"

    return {"browser": browser, "device": device, "os": os_name}


async def log_audit_event(
    action: str,
    *,
    request: Request | None = None,
    user_id: str | None = None,
    email: str | None = None,
    status_value: str = "success",
    metadata: dict[str, Any] | None = None,
) -> None:
    audit_doc: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "action": action,
        "status": status_value,
        "user_id": user_id,
        "email": email.lower() if email else None,
        "metadata": metadata or {},
        "created_at": utc_now(),
    }
    if request is not None:
        audit_doc["ip_address"] = get_client_ip(request)
        audit_doc["user_agent"] = request.headers.get("user-agent", "")
        audit_doc["path"] = request.url.path
    try:
        await db.audit_logs.insert_one(audit_doc)
    except Exception as exc:
        logger.warning(f"Failed to write audit log {action}: {exc}")


async def ensure_indexes() -> None:
    await db.users.create_index([("email", ASCENDING)], unique=True)
    await db.users.create_index([("id", ASCENDING)], unique=True)
    await db.reports.create_index([("id", ASCENDING)], unique=True)
    await db.reports.create_index([("user_id", ASCENDING)])
    await db.reports.create_index([("created_at", DESCENDING)])
    await db.otps.create_index([("email", ASCENDING), ("purpose", ASCENDING)], unique=True)
    await db.otps.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.sessions.create_index([("id", ASCENDING)], unique=True)
    await db.sessions.create_index([("user_id", ASCENDING), ("last_active_at", DESCENDING)])
    await db.sessions.create_index([("expires_at", ASCENDING)], expireAfterSeconds=0)
    await db.audit_logs.create_index([("user_id", ASCENDING), ("created_at", DESCENDING)])
    await db.audit_logs.create_index([("email", ASCENDING), ("created_at", DESCENDING)])
    await db.audit_logs.create_index([("created_at", DESCENDING)])


async def migrate_existing_users() -> None:
    now = utc_now()
    migrated_verified = await db.users.update_many(
        {"email_verified": {"$exists": False}},
        {
            "$set": {
                "email_verified": True,
                "verified_at": now,
            }
        },
    )
    await db.users.update_many(
        {"failed_login_attempts": {"$exists": False}},
        {"$set": {"failed_login_attempts": 0}},
    )
    await db.users.update_many(
        {"locked_until": {"$exists": False}},
        {"$set": {"locked_until": None}},
    )
    await db.users.update_many(
        {"last_login_at": {"$exists": False}},
        {"$set": {"last_login_at": None}},
    )
    await db.users.update_many(
        {"last_login_ip": {"$exists": False}},
        {"$set": {"last_login_ip": None}},
    )
    if migrated_verified.modified_count:
        logger.info(
            f"Marked {migrated_verified.modified_count} existing users as verified for compatibility"
        )


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
                "email_verified": True,
                "verified_at": utc_now(),
                "failed_login_attempts": 0,
                "locked_until": None,
                "last_login_at": None,
                "last_login_ip": None,
            }
        )
        logger.info(f"Seeded admin account for {admin_email}")
        return

    updates: dict[str, Any] = {}
    if not verify_password(admin_password, existing.get("password_hash", "")):
        updates["password_hash"] = hash_password(admin_password)
    if not existing.get("email_verified"):
        updates["email_verified"] = True
        updates["verified_at"] = utc_now()
    if existing.get("role") != "admin":
        updates["role"] = "admin"
    if "failed_login_attempts" not in existing:
        updates["failed_login_attempts"] = 0
    if "locked_until" not in existing:
        updates["locked_until"] = None
    if updates:
        await db.users.update_one({"email": admin_email}, {"$set": updates})
        logger.info(f"Updated seeded admin account for {admin_email}")


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
        "email_verified": False,
        "verified_at": None,
        "failed_login_attempts": 0,
        "locked_until": None,
        "last_login_at": None,
        "last_login_ip": None,
        "password_reset_token_id": None,
        "password_reset_token_expires_at": None,
    }


def ensure_mail_configured() -> None:
    required_values = (
        settings.mail_username,
        settings.mail_password,
        settings.mail_from,
        settings.mail_server,
        settings.mail_port,
    )
    if not all(required_values):
        raise HTTPException(
            status_code=500,
            detail="Email delivery is not configured. Add the MAIL_* environment variables.",
        )


def _send_email_sync(subject: str, recipients: list[str], html_body: str) -> None:
    ensure_mail_configured()

    message = EmailMessage()
    message["Subject"] = subject
    message["From"] = settings.mail_from
    message["To"] = ", ".join(recipients)
    message.set_content(
        "This email contains HTML content. Please use an HTML-compatible email client."
    )
    message.add_alternative(html_body, subtype="html")

    context = ssl.create_default_context()

    try:
        with smtplib.SMTP(
            settings.mail_server,
            settings.mail_port,
            timeout=20,
        ) as smtp:
            smtp.ehlo()
            smtp.starttls(context=context)
            smtp.ehlo()
            smtp.login(settings.mail_username, settings.mail_password)
            smtp.send_message(message)

    except smtplib.SMTPException as exc:
        logger.warning(f"SMTP email send failed: {exc}")
        raise HTTPException(
            status_code=500,
            detail="Failed to send email. Please try again later.",
        ) from exc


async def send_email(subject: str, recipients: list[str], html_body: str) -> None:
    await asyncio.to_thread(_send_email_sync, subject, recipients, html_body)


def build_frontend_link(path: str) -> str:
    base_url = (settings.frontend_url or "").rstrip("/")
    if not base_url:
        return path
    return f"{base_url}{path}"


def render_email_shell(
    *,
    title: str,
    preview_text: str,
    heading: str,
    intro: str,
    body_html: str,
    footer_note: str,
) -> str:
    current_year = utc_now().year
    return f"""
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>{title}</title>
  </head>
  <body style="margin:0;padding:0;background:#f5f7f4;font-family:Arial,sans-serif;color:#122033;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">{preview_text}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f5f7f4;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:640px;background:#ffffff;border-radius:24px;overflow:hidden;border:1px solid #dfe7ec;">
            <tr>
              <td style="padding:32px 32px 24px;background:linear-gradient(135deg,#112033,#20435d);color:#ffffff;">
                <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:0.8;">MedAssist</div>
                <h1 style="margin:16px 0 8px;font-size:32px;line-height:1.1;font-family:Georgia,serif;">{heading}</h1>
                <p style="margin:0;font-size:15px;line-height:1.7;color:#e6eef4;">{intro}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:32px;">
                {body_html}
              </td>
            </tr>
            <tr>
              <td style="padding:24px 32px;background:#f7fafc;border-top:1px solid #e5edf2;">
                <p style="margin:0;font-size:13px;line-height:1.6;color:#4f6477;">{footer_note}</p>
                <p style="margin:12px 0 0;font-size:12px;line-height:1.6;color:#6c8194;">Copyright {current_year} MedAssist. This email was sent from your account security workflow.</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>
""".strip()


def build_code_block(otp: str) -> str:
    return f"""
<div style="margin:28px 0;padding:20px;border-radius:18px;background:#f2f7fb;border:1px solid #d9e6ef;text-align:center;">
  <div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;color:#5b7287;">One-time password</div>
  <div style="margin-top:12px;font-size:34px;letter-spacing:10px;font-weight:700;color:#112033;">{otp}</div>
  <div style="margin-top:10px;font-size:13px;color:#5b7287;">Valid for 10 minutes. Do not share this code.</div>
</div>
""".strip()


def build_verification_email_html(name: str, otp: str) -> str:
    verify_link = build_frontend_link("/verify-email")
    body_html = f"""
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">Hi {name},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  Welcome to MedAssist. Verify your email to activate your account and protect your health journal.
</p>
{build_code_block(otp)}
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  Enter this code on the verification screen to finish setting up your account.
</p>
<a href="{verify_link}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#112033;color:#ffffff;text-decoration:none;font-weight:600;">Open verification</a>
""".strip()
    return render_email_shell(
        title="Verify your MedAssist email",
        preview_text="Your MedAssist verification code is ready.",
        heading="Verify your email",
        intro="Use the one-time password below to activate your MedAssist account.",
        body_html=body_html,
        footer_note="If you did not create this account, you can safely ignore this message.",
    )


def build_welcome_email_html(name: str) -> str:
    dashboard_link = build_frontend_link("/dashboard")
    body_html = f"""
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">Hi {name},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  Your email is verified and your MedAssist account is now active.
</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  You can now sign in, save diagnosis reports, and manage your session security from one place.
</p>
<a href="{dashboard_link}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#112033;color:#ffffff;text-decoration:none;font-weight:600;">Go to MedAssist</a>
""".strip()
    return render_email_shell(
        title="Welcome to MedAssist",
        preview_text="Your MedAssist account is ready.",
        heading="Account activated",
        intro="Thanks for verifying your email. Your secure MedAssist workspace is ready.",
        body_html=body_html,
        footer_note="For your security, keep your password private and only use trusted devices.",
    )


def build_forgot_password_email_html(name: str, otp: str) -> str:
    reset_link = build_frontend_link("/forgot-password")
    body_html = f"""
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">Hi {name},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  We received a request to reset your MedAssist password.
</p>
{build_code_block(otp)}
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  Enter this code to continue resetting your password. If you did not request this, you can ignore this email.
</p>
<a href="{reset_link}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#112033;color:#ffffff;text-decoration:none;font-weight:600;">Open password reset</a>
""".strip()
    return render_email_shell(
        title="Reset your MedAssist password",
        preview_text="Your MedAssist password reset code is here.",
        heading="Reset your password",
        intro="Use the one-time password below to verify your password reset request.",
        body_html=body_html,
        footer_note="If you did not request a password reset, no action is required.",
    )


def build_password_changed_email_html(name: str) -> str:
    sessions_link = build_frontend_link("/sessions")
    body_html = f"""
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">Hi {name},</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  Your MedAssist password was changed successfully.
</p>
<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#2c3f50;">
  We signed out your other sessions as a precaution. Review your active devices if anything looks unfamiliar.
</p>
<a href="{sessions_link}" style="display:inline-block;padding:14px 22px;border-radius:999px;background:#112033;color:#ffffff;text-decoration:none;font-weight:600;">Review sessions</a>
""".strip()
    return render_email_shell(
        title="Your password was changed",
        preview_text="Your MedAssist password has been updated.",
        heading="Password changed",
        intro="Your account security settings were updated successfully.",
        body_html=body_html,
        footer_note="If you did not change your password, reset it immediately and contact support.",
    )


async def send_verification_email(name: str, email: str, otp: str) -> None:
    await send_email(
        "Verify your MedAssist email",
        [email],
        build_verification_email_html(name, otp),
    )


async def send_welcome_email(name: str, email: str) -> None:
    await send_email(
        "Welcome to MedAssist",
        [email],
        build_welcome_email_html(name),
    )


async def send_forgot_password_email(name: str, email: str, otp: str) -> None:
    await send_email(
        "Reset your MedAssist password",
        [email],
        build_forgot_password_email_html(name, otp),
    )


async def send_password_changed_email(name: str, email: str) -> None:
    await send_email(
        "Your MedAssist password was changed",
        [email],
        build_password_changed_email_html(name),
    )


async def get_latest_otp_activity(email: str, purpose: str) -> dict[str, Any] | None:
    return await db.audit_logs.find_one(
        {
            "email": email.lower(),
            "action": {"$in": ["otp_sent", "otp_resent"]},
            "metadata.purpose": purpose,
        },
        sort=[("created_at", DESCENDING)],
    )


async def ensure_otp_resend_allowed(email: str, purpose: str) -> None:
    now = utc_now()
    latest = await get_latest_otp_activity(email, purpose)
    if latest:
        created_at = coerce_datetime(latest.get("created_at"))
        if created_at is not None:
            remaining = OTP_RESEND_COOLDOWN_SECONDS - int((now - created_at).total_seconds())
            if remaining > 0:
                raise HTTPException(
                    status_code=429,
                    detail=f"Please wait {remaining} seconds before requesting another code.",
                )

    resend_count = await db.audit_logs.count_documents(
        {
            "email": email.lower(),
            "action": "otp_resent",
            "metadata.purpose": purpose,
            "created_at": {"$gte": now - timedelta(hours=1)},
        }
    )
    if resend_count >= OTP_RESEND_LIMIT_PER_HOUR:
        raise HTTPException(
            status_code=429,
            detail="You have reached the resend limit for this hour. Please try again later.",
        )


async def should_skip_reset_otp_send(email: str, purpose: str) -> bool:
    latest = await get_latest_otp_activity(email, purpose)
    if not latest:
        return False
    created_at = coerce_datetime(latest.get("created_at"))
    if created_at is None:
        return False
    return (utc_now() - created_at).total_seconds() < OTP_RESEND_COOLDOWN_SECONDS


async def issue_otp_code(
    *,
    email: str,
    name: str,
    purpose: str,
    request: Request,
    resend: bool = False,
) -> None:
    lower_email = email.lower()
    if resend:
        await ensure_otp_resend_allowed(lower_email, purpose)

    otp = generate_otp()
    otp_doc = {
        "id": str(uuid.uuid4()),
        "email": lower_email,
        "otp_hash": hash_otp(lower_email, purpose, otp),
        "purpose": purpose,
        "expires_at": utc_now() + timedelta(minutes=OTP_TTL_MINUTES),
        "attempts": 0,
        "created_at": utc_now(),
    }

    await db.otps.delete_many({"email": lower_email, "purpose": purpose})
    await db.otps.insert_one(otp_doc)

    try:
        if purpose == OTP_PURPOSE_VERIFY_EMAIL:
            await send_verification_email(name, lower_email, otp)
        else:
            await send_forgot_password_email(name, lower_email, otp)
    except Exception:
        await db.otps.delete_many({"email": lower_email, "purpose": purpose})
        raise

    await log_audit_event(
        "otp_resent" if resend else "otp_sent",
        request=request,
        email=lower_email,
        metadata={"purpose": purpose},
    )


async def consume_otp_code(
    *,
    email: str,
    purpose: str,
    otp: str,
    request: Request,
) -> None:
    lower_email = email.lower()
    otp_doc = await db.otps.find_one({"email": lower_email, "purpose": purpose})
    if not otp_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired OTP.")

    expires_at = coerce_datetime(otp_doc.get("expires_at"))
    if expires_at is not None and expires_at <= utc_now():
        await db.otps.delete_one({"_id": otp_doc["_id"]})
        raise HTTPException(status_code=400, detail="OTP expired. Please request a new code.")

    hashed_input = hash_otp(lower_email, purpose, otp)
    if not hmac.compare_digest(hashed_input, otp_doc.get("otp_hash", "")):
        attempts = int(otp_doc.get("attempts", 0)) + 1
        if attempts >= OTP_MAX_ATTEMPTS:
            await db.otps.delete_one({"_id": otp_doc["_id"]})
            await log_audit_event(
                "otp_verification_failed",
                request=request,
                email=lower_email,
                status_value="locked",
                metadata={"purpose": purpose, "attempts": attempts},
            )
            raise HTTPException(
                status_code=400,
                detail="OTP verification failed too many times. Please request a new code.",
            )

        await db.otps.update_one(
            {"_id": otp_doc["_id"]},
            {"$set": {"attempts": attempts}},
        )
        await log_audit_event(
            "otp_verification_failed",
            request=request,
            email=lower_email,
            status_value="failed",
            metadata={"purpose": purpose, "attempts": attempts},
        )
        remaining = OTP_MAX_ATTEMPTS - attempts
        raise HTTPException(
            status_code=400,
            detail=f"Invalid OTP. {remaining} attempt{'s' if remaining != 1 else ''} remaining.",
        )

    await db.otps.delete_one({"_id": otp_doc["_id"]})
    await log_audit_event(
        "otp_verified",
        request=request,
        email=lower_email,
        metadata={"purpose": purpose},
    )


def is_account_locked(user: dict[str, Any]) -> bool:
    locked_until = coerce_datetime(user.get("locked_until"))
    return locked_until is not None and locked_until > utc_now()


async def register_failed_login_attempt(
    user: dict[str, Any],
    request: Request,
) -> str:
    attempts = int(user.get("failed_login_attempts", 0)) + 1
    updates: dict[str, Any] = {"failed_login_attempts": attempts}
    detail = "Invalid email or password"
    status_value = "failed"

    if attempts >= MAX_LOGIN_FAILURES:
        lock_until = utc_now() + timedelta(minutes=ACCOUNT_LOCK_MINUTES)
        updates["locked_until"] = lock_until
        updates["failed_login_attempts"] = 0
        detail = (
            f"Your account is locked for {ACCOUNT_LOCK_MINUTES} minutes after repeated failed login attempts."
        )
        status_value = "locked"

    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    await log_audit_event(
        "login_failed",
        request=request,
        user_id=user["id"],
        email=user["email"],
        status_value=status_value,
        metadata={"attempts": attempts},
    )
    return detail


async def reset_login_failures(user_id: str, request: Request) -> None:
    await db.users.update_one(
        {"id": user_id},
        {
            "$set": {
                "failed_login_attempts": 0,
                "locked_until": None,
                "last_login_at": utc_now(),
                "last_login_ip": get_client_ip(request),
            }
        },
    )


async def get_valid_session(session_id: str) -> dict[str, Any] | None:
    session = await db.sessions.find_one({"id": session_id})
    if not session:
        return None
    expires_at = coerce_datetime(session.get("expires_at"))
    if expires_at is not None and expires_at <= utc_now():
        await db.sessions.delete_one({"id": session_id})
        return None
    return session


async def issue_session_bundle(
    *,
    user: dict[str, Any],
    request: Request,
    session: dict[str, Any] | None = None,
) -> dict[str, Any]:
    session_id = session["id"] if session else str(uuid.uuid4())
    now = utc_now()
    csrf_token = secrets.token_urlsafe(32)
    access_token = create_access_token(
        user["id"],
        user["email"],
        user.get("role", "patient"),
        session_id,
    )
    refresh_token = create_refresh_token(
        user["id"],
        user["email"],
        user.get("role", "patient"),
        session_id,
    )
    refresh_token_hash = hash_refresh_token(refresh_token)
    user_agent = request.headers.get("user-agent", "")
    parsed_agent = parse_user_agent(user_agent)
    session_payload = {
        "user_id": user["id"],
        "refresh_token_hash": refresh_token_hash,
        "csrf_token": csrf_token,
        "ip_address": get_client_ip(request),
        "user_agent": user_agent,
        "browser": parsed_agent["browser"],
        "device": parsed_agent["device"],
        "os": parsed_agent["os"],
        "created_at": session.get("created_at", now) if session else now,
        "last_active_at": now,
        "expires_at": now + timedelta(days=REFRESH_TOKEN_TTL_DAYS),
    }

    if session:
        await db.sessions.update_one({"id": session_id}, {"$set": session_payload})
    else:
        await db.sessions.insert_one({"id": session_id, **session_payload})

    current_session = await db.sessions.find_one({"id": session_id})
    return {
        "session": current_session,
        "access_token": access_token,
        "refresh_token": refresh_token,
        "csrf_token": csrf_token,
    }


async def authenticate_refresh_request(
    request: Request,
) -> tuple[dict[str, Any], dict[str, Any]]:
    refresh_token = request.cookies.get(REFRESH_COOKIE_NAME)
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")

    payload = decode_signed_token(refresh_token, "refresh")
    session_id = payload.get("sid")
    user_id = payload.get("sub")
    if not session_id or not user_id:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

    session = await get_valid_session(session_id)
    if not session or session.get("user_id") != user_id:
        raise HTTPException(status_code=401, detail="Session expired")

    expected_hash = session.get("refresh_token_hash", "")
    if not hmac.compare_digest(hash_refresh_token(refresh_token), expected_hash):
        raise HTTPException(status_code=401, detail="Refresh token revoked")

    user = await db.users.find_one({"id": user_id})
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user, session


def get_token_from_request(request: Request, token_type: str) -> str | None:
    if token_type == "access":
        cookie_token = request.cookies.get(COOKIE_NAME)
        if cookie_token:
            return cookie_token
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            return auth_header[7:].strip()
        return None

    return request.cookies.get(REFRESH_COOKIE_NAME)


def try_extract_token_payload(request: Request) -> dict[str, Any] | None:
    for token_type in ("access", "refresh"):
        token = get_token_from_request(request, token_type)
        if not token:
            continue
        try:
            return decode_signed_token(token, token_type)
        except HTTPException:
            continue
    return None


async def get_current_user(request: Request) -> dict[str, Any]:
    token = get_token_from_request(request, "access")
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_signed_token(token, "access")
    session_id = payload.get("sid")
    if not session_id:
        raise HTTPException(status_code=401, detail="Invalid token")

    session = await get_valid_session(session_id)
    if not session or session.get("user_id") != payload["sub"]:
        raise HTTPException(status_code=401, detail="Session expired")

    user = await db.users.find_one(
        {"id": payload["sub"]},
        {"_id": 0, "password_hash": 0},
    )
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    request.state.session_id = session_id
    await db.sessions.update_one(
        {"id": session_id},
        {"$set": {"last_active_at": utc_now()}},
    )
    return user


def get_current_session_id(request: Request) -> str | None:
    session_id = getattr(request.state, "session_id", None)
    if session_id:
        return session_id

    payload = try_extract_token_payload(request)
    if isinstance(payload, dict):
        return payload.get("sid")
    return None


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
    cleaned = [
        item
        for item in (
            normalize_optional_text(str(v), lower=False) for v in candidates
        )
        if item
    ]
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
                "possible_causes": [
                    "Seasonal viral exposure",
                    "Close contact with an infected person",
                ],
                "recommended_medicines": [
                    "Paracetamol 500mg for fever or body aches",
                    "Cetirizine 10mg for congestion or sneezing",
                ],
                "home_remedies": ["Warm fluids", "Steam inhalation", "Adequate rest"],
                "diet": ["Warm soups", "Water", "Soft foods if the throat is sore"],
                "precautions": [
                    "Wash hands frequently",
                    "Avoid close contact with others while symptomatic",
                ],
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
                "recommended_medicines": [
                    "Paracetamol 500mg",
                    "Ibuprofen 400mg with food if safe for you",
                ],
                "home_remedies": [
                    "Rest",
                    "Hydration",
                    "Use a humidified room if coughing",
                ],
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
                "recommended_medicines": [
                    "ORS (oral rehydration salts)",
                    "Loperamide only for short-term diarrhea if appropriate",
                ],
                "home_remedies": [
                    "Small frequent sips of fluids",
                    "Rest",
                    "Gradually resume bland foods",
                ],
                "diet": ["Bananas", "Rice", "Toast", "Clear soups"],
                "precautions": [
                    "Watch for dehydration",
                    "Avoid oily or spicy foods until improved",
                ],
                "when_to_see_doctor": "Seek care if you cannot keep fluids down, develop blood in stool, or have high fever.",
                "doctor_required": True,
            }
        )
        diseases.append(
            {
                "name": "Dehydration Related Symptoms",
                "confidence": 53,
                "description": "Fluid loss from vomiting or diarrhea can lead to dizziness, weakness, headache, and dry mouth.",
                "possible_causes": [
                    "Reduced fluid intake",
                    "Ongoing gastrointestinal fluid loss",
                ],
                "recommended_medicines": ["ORS (oral rehydration salts)"],
                "home_remedies": ["Sip fluids regularly", "Rest in a cool environment"],
                "diet": ["Electrolyte drinks", "Water-rich foods", "Simple bland foods"],
                "precautions": [
                    "Monitor urine output",
                    "Seek help if dizziness becomes severe",
                ],
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
                "recommended_medicines": [
                    "Paracetamol 500mg",
                    "Ibuprofen 400mg with food if safe for you",
                ],
                "home_remedies": [
                    "Rest in a quiet room",
                    "Hydration",
                    "Cold compress",
                ],
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
                "possible_causes": [
                    "Anxiety or panic",
                    "Respiratory irritation",
                    "Cardiac conditions",
                ],
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
                "possible_causes": [
                    "Environmental allergens",
                    "Food sensitivity",
                    "Medication reaction",
                ],
                "recommended_medicines": ["Cetirizine 10mg", "Loratadine 10mg"],
                "home_remedies": [
                    "Avoid suspected triggers",
                    "Cool compress for itchy skin",
                ],
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
                "possible_causes": [
                    "Common viral infection",
                    "General inflammation",
                    "Temporary stress on the body",
                ],
                "recommended_medicines": [
                    "Paracetamol 500mg as needed for fever or pain"
                ],
                "home_remedies": [
                    "Rest",
                    "Hydration",
                    "Monitor symptoms over the next 24 to 48 hours",
                ],
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
                "recommended_medicines": [
                    "ORS (oral rehydration salts) if fluid intake has been poor"
                ],
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
) -> dict[str, Any]:
    user_doc = build_user_document(payload)
    try:
        await db.users.insert_one(user_doc)
    except DuplicateKeyError as exc:
        raise HTTPException(status_code=400, detail="Email already registered") from exc

    try:
        await issue_otp_code(
            email=user_doc["email"],
            name=user_doc["name"],
            purpose=OTP_PURPOSE_VERIFY_EMAIL,
            request=request,
        )
    except Exception:
        await db.users.delete_one({"id": user_doc["id"]})
        raise

    await log_audit_event(
        "register",
        request=request,
        user_id=user_doc["id"],
        email=user_doc["email"],
    )
    return {
        "user": sanitize_user(user_doc),
        "requires_verification": True,
        "message": "Account created. Please verify your email before signing in.",
    }


@limiter.limit("5/minute")
@api_router.post("/auth/login")
async def login(
    request: Request,
    payload: LoginInput,
    response: Response,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})

    if user and is_account_locked(user):
        await log_audit_event(
            "login_failed",
            request=request,
            user_id=user["id"],
            email=email,
            status_value="locked",
        )
        raise HTTPException(
            status_code=423,
            detail=f"Your account is temporarily locked. Try again in {ACCOUNT_LOCK_MINUTES} minutes.",
        )

    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        if user:
            detail = await register_failed_login_attempt(user, request)
            if "locked" in detail.lower():
                raise HTTPException(status_code=423, detail=detail)
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if not user.get("email_verified", False):
        raise HTTPException(status_code=403, detail="Please verify your email.")

    await reset_login_failures(user["id"], request)
    refreshed_user = await db.users.find_one({"id": user["id"]})
    bundle = await issue_session_bundle(user=refreshed_user or user, request=request)
    set_auth_cookies(response, bundle)

    await log_audit_event(
        "login",
        request=request,
        user_id=user["id"],
        email=email,
        metadata={"session_id": bundle["session"]["id"]},
    )
    return {
        "user": sanitize_user(refreshed_user or user),
        "token": bundle["access_token"],
        "csrf_token": bundle["csrf_token"],
    }


@limiter.limit("5/minute")
@api_router.post("/auth/verify-email")
async def verify_email(
    request: Request,
    payload: VerifyOtpInput,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if user.get("email_verified", False):
        return {
            "success": True,
            "message": "Email is already verified. You can sign in now.",
        }

    await consume_otp_code(
        email=email,
        purpose=OTP_PURPOSE_VERIFY_EMAIL,
        otp=payload.otp,
        request=request,
    )
    updated_user = await db.users.find_one_and_update(
        {"id": user["id"]},
        {
            "$set": {
                "email_verified": True,
                "verified_at": utc_now(),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    await log_audit_event(
        "email_verified",
        request=request,
        user_id=user["id"],
        email=email,
    )
    try:
        await send_welcome_email(updated_user.get("name") or "there", email)
    except Exception as exc:
        logger.warning(f"Welcome email failed for {email}: {exc}")

    return {
        "success": True,
        "message": "Email verified successfully. You can sign in now.",
        "user": sanitize_user(updated_user or user),
    }


@api_router.post("/auth/resend-verification")
async def resend_verification(
    request: Request,
    payload: EmailInput,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.get("email_verified", False):
        raise HTTPException(status_code=400, detail="Email is already verified.")

    await issue_otp_code(
        email=email,
        name=user.get("name") or "there",
        purpose=OTP_PURPOSE_VERIFY_EMAIL,
        request=request,
        resend=True,
    )
    return {
        "success": True,
        "message": "A new verification code has been sent to your email.",
    }


@limiter.limit("3/minute")
@api_router.post("/auth/forgot-password")
async def forgot_password(
    request: Request,
    payload: EmailInput,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})

    if user and user.get("email_verified", False):
        if not await should_skip_reset_otp_send(email, OTP_PURPOSE_FORGOT_PASSWORD):
            await issue_otp_code(
                email=email,
                name=user.get("name") or "there",
                purpose=OTP_PURPOSE_FORGOT_PASSWORD,
                request=request,
            )
        await log_audit_event(
            "password_reset_requested",
            request=request,
            user_id=user["id"],
            email=email,
        )

    return {
        "success": True,
        "message": "If an account exists for that email, a password reset code has been sent.",
    }


@limiter.limit("5/minute")
@api_router.post("/auth/verify-reset-otp")
async def verify_reset_otp(
    request: Request,
    payload: VerifyOtpInput,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})
    if not user or not user.get("email_verified", False):
        raise HTTPException(status_code=400, detail="Invalid reset request.")

    await consume_otp_code(
        email=email,
        purpose=OTP_PURPOSE_FORGOT_PASSWORD,
        otp=payload.otp,
        request=request,
    )
    reset_id = str(uuid.uuid4())
    expires_at = utc_now() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES)
    await db.users.update_one(
        {"id": user["id"]},
        {
            "$set": {
                "password_reset_token_id": reset_id,
                "password_reset_token_expires_at": expires_at,
            }
        },
    )
    await log_audit_event(
        "password_reset_verified",
        request=request,
        user_id=user["id"],
        email=email,
    )
    return {
        "success": True,
        "message": "OTP verified. You can set a new password now.",
        "reset_token": create_reset_token(email, reset_id),
    }


@limiter.limit("3/minute")
@api_router.post("/auth/reset-password")
async def reset_password(
    request: Request,
    payload: ResetPasswordInput,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=400, detail="Invalid reset request.")

    token_payload = decode_signed_token(payload.reset_token, "reset_password")
    reset_id = token_payload.get("reset_id")
    if token_payload.get("email") != email or not reset_id:
        raise HTTPException(status_code=400, detail="Invalid reset token.")

    stored_reset_id = user.get("password_reset_token_id")
    stored_reset_expiry = coerce_datetime(user.get("password_reset_token_expires_at"))
    if stored_reset_id != reset_id or not stored_reset_expiry or stored_reset_expiry <= utc_now():
        raise HTTPException(status_code=400, detail="Reset token expired or already used.")

    updates = {
        "password_hash": hash_password(payload.password),
        "password_reset_token_id": None,
        "password_reset_token_expires_at": None,
        "failed_login_attempts": 0,
        "locked_until": None,
        "last_password_changed_at": utc_now(),
    }
    await db.users.update_one({"id": user["id"]}, {"$set": updates})
    await db.sessions.delete_many({"user_id": user["id"]})
    await log_audit_event(
        "password_reset",
        request=request,
        user_id=user["id"],
        email=email,
    )
    try:
        await send_password_changed_email(user.get("name") or "there", email)
    except Exception as exc:
        logger.warning(f"Password changed email failed for {email}: {exc}")

    return {
        "success": True,
        "message": "Password reset successful. Please sign in with your new password.",
    }


@api_router.post("/auth/resend-reset-otp")
async def resend_reset_otp(
    request: Request,
    payload: EmailInput,
) -> dict[str, Any]:
    email = str(payload.email).lower()
    user = await db.users.find_one({"email": email})

    if user and user.get("email_verified", False):
        await issue_otp_code(
            email=email,
            name=user.get("name") or "there",
            purpose=OTP_PURPOSE_FORGOT_PASSWORD,
            request=request,
            resend=True,
        )

    return {
        "success": True,
        "message": "If an account exists for that email, a new password reset code has been sent.",
    }


@api_router.post("/auth/refresh")
async def refresh_session(
    request: Request,
    response: Response,
) -> Any:
    try:
        user, session = await authenticate_refresh_request(request)
    except HTTPException as exc:
        error_response = make_error_response(
            exc.status_code,
            str(exc.detail),
            "http_error",
            exc.detail,
        )
        clear_auth_cookies(error_response)
        return error_response

    bundle = await issue_session_bundle(user=user, request=request, session=session)
    set_auth_cookies(response, bundle)
    await log_audit_event(
        "session_refreshed",
        request=request,
        user_id=user["id"],
        email=user["email"],
        metadata={"session_id": session["id"]},
    )
    return {
        "user": sanitize_user(user),
        "token": bundle["access_token"],
        "csrf_token": bundle["csrf_token"],
    }


@api_router.post("/auth/logout")
async def logout(
    request: Request,
    response: Response,
) -> dict[str, bool]:
    session_id = get_current_session_id(request)
    token_payload = try_extract_token_payload(request)
    if session_id:
        await db.sessions.delete_one({"id": session_id})
    clear_auth_cookies(response)
    await log_audit_event(
        "logout",
        request=request,
        user_id=token_payload.get("sub") if token_payload else None,
        email=token_payload.get("email") if token_payload else None,
        metadata={"session_id": session_id},
    )
    return {"ok": True}


@api_router.get("/auth/me")
async def me(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": sanitize_user(user)}


@api_router.get("/auth/sessions")
async def list_sessions(
    request: Request,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    current_session_id = get_current_session_id(request)
    sessions = await (
        db.sessions.find({"user_id": user["id"]})
        .sort("last_active_at", DESCENDING)
        .to_list(length=50)
    )
    return {
        "sessions": [sanitize_session(session, current_session_id) for session in sessions]
    }


@api_router.delete("/auth/sessions/current")
async def revoke_current_session(
    request: Request,
    response: Response,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    session_id = get_current_session_id(request)
    if session_id:
        await db.sessions.delete_one({"id": session_id, "user_id": user["id"]})
    clear_auth_cookies(response)
    await log_audit_event(
        "session_revoked",
        request=request,
        user_id=user["id"],
        email=user["email"],
        metadata={"session_id": session_id, "scope": "current"},
    )
    return {"ok": True}


@api_router.delete("/auth/sessions/all")
async def revoke_all_sessions(
    request: Request,
    response: Response,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, bool]:
    await db.sessions.delete_many({"user_id": user["id"]})
    clear_auth_cookies(response)
    await log_audit_event(
        "logout_all_devices",
        request=request,
        user_id=user["id"],
        email=user["email"],
    )
    return {"ok": True}


@api_router.delete("/auth/sessions/{session_id}")
async def revoke_session(
    session_id: str,
    request: Request,
    response: Response,
    user: dict[str, Any] = Depends(get_current_user),
) -> dict[str, Any]:
    result = await db.sessions.delete_one({"id": session_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Session not found")

    current_session_id = get_current_session_id(request)
    if current_session_id == session_id:
        clear_auth_cookies(response)

    await log_audit_event(
        "session_revoked",
        request=request,
        user_id=user["id"],
        email=user["email"],
        metadata={"session_id": session_id},
    )
    return {"ok": True, "current_session_revoked": current_session_id == session_id}


@api_router.get("/profile")
async def get_profile(user: dict[str, Any] = Depends(get_current_user)) -> dict[str, Any]:
    return {"user": sanitize_user(user)}


@api_router.put("/profile")
async def update_profile(
    request: Request,
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

    await log_audit_event(
        "profile_update",
        request=request,
        user_id=user["id"],
        email=user["email"],
        metadata={"updated_fields": sorted(updates.keys())},
    )
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
