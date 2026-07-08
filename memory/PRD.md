# AI Medical Diagnosis Assistant — PRD

## Original Problem Statement
Build a complete, production-ready AI-powered web application called "AI Medical Diagnosis Assistant". Patients enter symptoms and receive AI-generated preliminary disease predictions with health recommendations. Full stack: React + FastAPI + MongoDB + JWT + AI (Claude Sonnet 4.5 via Emergent LLM key). Roles: Patient, Admin. Extra: PDF, BMI, voice, chat, dark mode, admin analytics, etc.

## Architecture
- Frontend: React 19, React Router 7, Tailwind, Shadcn UI, sonner, lucide-react. Playfair Display (serif) + Manrope (sans). Sea Glass / Slate editorial-medical palette.
- Backend: FastAPI, motor (MongoDB), bcrypt, PyJWT. All routes under /api. JWT Bearer + httpOnly cookie hybrid.
- AI: emergentintegrations `LlmChat` → Anthropic `claude-sonnet-4-5-20250929`. Rule-based fallback for offline / API failure.
- DB: MongoDB (existing MONGO_URL). Collections: users, reports.

## User Personas
1. **Patient** — logs symptoms, receives AI-guided possibilities, revisits history.
2. **Admin** (seeded) — will manage users/reports in Phase 2.

## Core Requirements (static)
- Symptom entry (multi-select, search, manual)
- AI diagnosis with confidence, causes, OTC meds, home remedies, diet, precautions, when-to-see-doctor, emergency warning, disclaimer
- Report history (search, view, delete)
- JWT auth (register/login/logout/me)

## Implemented (Phase 1) — 2026-02-08
- JWT auth: register/login/logout/me/profile with bcrypt + Bearer + cookie
- Symptom API + curated common symptom list
- POST /api/predict with Claude Sonnet 4.5 + rule-based fallback
- Reports CRUD (list/search/get/delete) scoped per user
- Landing page (editorial hero), Login, Register, Dashboard (stat cards + recent reports), New Diagnosis (checkboxes + search + manual + profile context), Reports list (search + delete), Report Detail (disease cards, confidence bars, emergency warning, disclaimer)
- Admin user seeded: admin@medassist.ai / admin123
- Design: Playfair Display serif + Manrope, Sea Glass / Slate palette, asymmetric hero, staggered fade-up animation for disease cards

## Backlog (Phase 2 — Prioritized)
- **P0**: Admin dashboard (analytics, users, reports management), Forgot/Reset password
- **P0**: PDF export of reports
- **P1**: BMI calculator, Profile page (edit weight/height/history)
- **P1**: Dark mode toggle, About/Contact/Privacy/Terms/FAQ static pages
- **P2**: Voice symptom input, Image upload placeholder, AI Chat Assistant, Medicine Reminder demo, Health Tips
- **P2**: Rate limiting, refresh token flow, brute force protection

## Test Credentials
See /app/memory/test_credentials.md
