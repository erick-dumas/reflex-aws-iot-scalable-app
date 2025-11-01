from fastapi import APIRouter, HTTPException
from app.backend.registrations import register_token_for_device, unregister_token_for_device
from app.backend.models import RegisterPayload

router = APIRouter(prefix="/sessions", tags=["Sessions"])

@router.post("/register")
async def register_session(payload: RegisterPayload):
    # Verificar que device_id es válido / autenticación
    await register_token_for_device(payload.device_id, payload.token)
    return {"status": "ok"}

@router.post("/unregister")
async def unregister_session(payload: RegisterPayload):
    await unregister_token_for_device(payload.device_id, payload.token)
    return {"status": "ok"}
