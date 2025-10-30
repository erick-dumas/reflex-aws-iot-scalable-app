from fastapi import APIRouter, HTTPException
from app.backend.models import DeviceData

router = APIRouter(prefix="/device", tags=["Device Data"])


data_store = []  # Temporal in-memory storage

@router.post("/data")
def receive_data(payload: DeviceData):
    """
    Endpoint para recibir datos de uno o varios dispositivos IoT.
    """
    try:
        data_store.append(payload.dict())
        print(f"📥 Datos recibidos: {payload.dict()}")
        return {"status": "ok", "received": payload}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))