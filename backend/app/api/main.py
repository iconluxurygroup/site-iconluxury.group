from fastapi import APIRouter

from app.api.routes import items, login, private, users, utils,s3
from app.api.routes import subscription
from app.core.config import settings

api_router = APIRouter()

# Existing routes
api_router.include_router(login.router)
api_router.include_router(users.router)
api_router.include_router(utils.router)
api_router.include_router(items.router)
api_router.include_router(subscription.router) 
api_router.include_router(s3.s3_router)
api_router.include_router(s3.r2_router)

# Private routes for local environment
if settings.ENVIRONMENT == "local":
    api_router.include_router(private.router)
