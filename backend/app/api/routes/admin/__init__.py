from fastapi import APIRouter

from . import camp, campus, documents, events, materials, projects, resources, rooms, stories, updates, users


router = APIRouter()
router.include_router(stories.router)
router.include_router(updates.router)
router.include_router(events.router)
router.include_router(users.router)
router.include_router(projects.router)
router.include_router(materials.router)
router.include_router(resources.router)
router.include_router(campus.router)
router.include_router(rooms.router)
router.include_router(documents.router)
router.include_router(camp.router)

__all__ = ["router"]
