from fastapi import APIRouter, HTTPException
from app.backend.registrations import register_token, unregister_token
from app.backend.models import RegisterPayload

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("/register")
async def register_session(payload: RegisterPayload):
    if not payload.token:
        raise HTTPException(status_code=400, detail="token required")
    await register_token(payload.token)
    return {"status": "ok"}

@router.post("/unregister")
async def unregister_session(payload: RegisterPayload):
    if not payload.token:
        raise HTTPException(status_code=400, detail="token required to unregister")
    await unregister_token(payload.token)
    return {"status": "ok"}

@router.post("/ping")
async def ping_session(payload: RegisterPayload):
    if not payload.token:
        raise HTTPException(status_code=400, detail="token required to ping")
    # Simplemente renueva el TTL del token en Redis
    await register_token(payload.token)
    return {"status": "ok", "msg": "session refreshed"}