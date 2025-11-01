from fastapi import APIRouter, HTTPException, Request
from app.backend.registrations import get_all_tokens
from app.backend.models import DeviceData
from app.states import IndexState

router = APIRouter(prefix="/device", tags=["Device Data"])

@router.post("/data")
async def receive_data(payload: DeviceData):
    try:
        # Obtener tokens registrados para el device_id
        tokens = await get_all_tokens()
        if not tokens:
            return {"status": "ok", "msg": "no sessions registered for this device"}

        from app.app import app 

        updated = 0 
        for token in tokens:
            
            state_key = f"{token}_{IndexState.get_full_name}"

            try:
                async with app.modify_state(state_key) as root_state:
                    index_state = await root_state.get_state(IndexState)
                    index_state.last_temperature = payload.temperature
                updated += 1
            except Exception as e:
                continue

        return {"status": "ok", "received": payload}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
