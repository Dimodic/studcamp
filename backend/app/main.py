from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.app.api import api_router
from backend.app.core.config import settings
from backend.app.core.rate_limit import build_rate_limit_middleware

# Конкретный whitelist заголовков вместо "*". См. рекомендации Starlette:
# https://www.starlette.io/middleware/#corsmiddleware. `allow_credentials=True`
# несовместим с origin/headers="*", поэтому origins проверяется на старте.
_ALLOWED_CORS_HEADERS = (
    "Accept",
    "Accept-Language",
    "Authorization",
    "Content-Language",
    "Content-Type",
    "X-Requested-With",
)


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
    )

    origins = list(settings.cors_origins)
    if not origins:
        raise RuntimeError(
            "STUDCAMP_CORS_ORIGINS must list at least one origin. "
            "Example: STUDCAMP_CORS_ORIGINS=http://localhost:5173,https://app.example.com"
        )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
        allow_headers=list(_ALLOWED_CORS_HEADERS),
    )

    app.middleware("http")(
        build_rate_limit_middleware(
            {
                f"{settings.api_v1_prefix}/auth/login": settings.login_rate_limit_per_minute,
                f"{settings.api_v1_prefix}/llm/": settings.llm_rate_limit_per_minute,
                f"{settings.api_v1_prefix}/admin/attendance": settings.llm_rate_limit_per_minute,
            }
        )
    )

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok"}

    app.include_router(api_router, prefix=settings.api_v1_prefix)
    return app


app = create_app()
