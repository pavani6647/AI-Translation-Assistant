import os
import time
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from google import genai

BASE_DIR = Path(__file__).resolve().parent
load_dotenv(BASE_DIR / ".env")

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL = "models/gemini-3.5-flash-lite"

app = FastAPI(title="LinguaFlow Translation API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin for origin in [
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            os.getenv("FRONTEND_ORIGIN", "").strip(),
        ]
        if origin
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = genai.Client(api_key=API_KEY) if API_KEY else None


class TranslationRequest(BaseModel):
    text: str
    target_language: str


@app.get("/api/health")
def health():
    return {
        "status": "ok",
        "api_key_configured": client is not None,
        "model": MODEL,
    }


@app.post("/api/translate")
def translate(request: TranslationRequest):
    if client is None:
        raise HTTPException(
            status_code=500,
            detail="Gemini API key is not configured in backend/.env.",
        )

    text = request.text.strip()
    language = request.target_language.strip()

    if not text:
        raise HTTPException(
            status_code=400,
            detail="Enter text to translate.",
        )

    if not language:
        raise HTTPException(
            status_code=400,
            detail="Select a target language.",
        )

    prompt = (
        f"Translate into {language}. Preserve meaning and tone. "
        "Return only the translation, without explanations.\n\n"
        f"{text}"
    )

    started = time.perf_counter()

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=prompt,
        )

        result = (response.text or "").strip()
        elapsed_ms = round((time.perf_counter() - started) * 1000)

        print(f"Gemini translation time: {elapsed_ms} ms")

        if not result:
            raise HTTPException(
                status_code=502,
                detail="The translation service returned an empty response.",
            )

        return {
            "translated_text": result,
            "translation": result,
            "source_text": text,
            "target_language": language,
            "duration_ms": elapsed_ms,
        }

    except HTTPException:
        raise
    except Exception as exc:
        elapsed_ms = round((time.perf_counter() - started) * 1000)
        print(
            f"Translation failed after {elapsed_ms} ms: "
            f"{type(exc).__name__}: {exc}"
        )

        error_text = str(exc).lower()

        if "429" in error_text or "resource_exhausted" in error_text:
            raise HTTPException(
                status_code=429,
                detail="Gemini API quota or rate limit reached. Try again later.",
            )

        if any(term in error_text for term in (
            "503", "unavailable", "overloaded"
        )):
            raise HTTPException(
                status_code=503,
                detail="Gemini is temporarily unavailable. Try again shortly.",
            )

        raise HTTPException(
            status_code=502,
            detail="Translation failed. Check the backend terminal for details.",
        )

