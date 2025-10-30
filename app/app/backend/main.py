from fastapi import FastAPI
from app.backend.routers import device

fastapi_app  = FastAPI(
    title="IoT Receiver API",
    version="1.0",
    description="Recibe datos IoT desde múltiples dispositivos"
)

# Registrar los routers
fastapi_app.include_router(device.router)

@fastapi_app.get("/")
def root():
    return {"message": "FastAPI backend activo"}
