from fastapi import APIRouter, HTTPException
from app.backend.registrations import register_token, unregister_token
from app.backend.models import RegisterPayload

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("/register")
async def register_session(payload: RegisterPayload):
    # Posiblemente verificar token aquí
    await register_token(payload.token)
    return {"status": "ok"}

@router.post("/unregister")
async def unregister_session(payload: RegisterPayload):
    await unregister_token(payload.token)
    return {"status": "ok"}

@router.post("/ping")
async def ping_session(payload: RegisterPayload):
    # Simplemente renueva el TTL del token en Redis
    await register_token(payload.token)
    return {"status": "ok", "msg": "session refreshed"}