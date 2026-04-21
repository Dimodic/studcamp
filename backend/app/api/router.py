from fastapi import APIRouter

from backend.app.api.routes.auth import router as auth_router
from backend.app.api.routes.admin import router as admin_router
from backend.app.api.routes.bootstrap import router as app_router


api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(app_router)
api_router.include_router(admin_router)
