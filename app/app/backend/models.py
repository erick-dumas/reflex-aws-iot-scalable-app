from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class DeviceData(BaseModel):
    device_id: str = Field(..., description="ID único del dispositivo IoT")
    temperature: float = Field(..., description="Temperatura medida en °C")
    timestamp: Optional[datetime] = Field(default_factory=datetime.utcnow, description="Hora del envío del dato")