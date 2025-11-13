from fastapi import FastAPI
from app.backend.routers import device, sessions
import asyncio
import logging
from app.backend.registrations import get_all_tokens, redis, LAST_SEEN_PREFIX, SESSIONS_KEY

fastapi_app  = FastAPI(
    title="IoT Receiver API",
    version="1.0",
    description="Recibe datos IoT desde múltiples dispositivos"
)

# Registrar los routers
fastapi_app.include_router(device.router)
fastapi_app.include_router(sessions.router)


async def _cleanup_stale_sessions_loop(poll_seconds: int = 60 * 10):
    """Background task that removes tokens from the sessions set when their last-seen key expired."""
    while True:
        try:
            tokens = await get_all_tokens()
            if tokens:
                for token in list(tokens):
                    last_seen_key = f"{LAST_SEEN_PREFIX}{token}"
                    exists = await redis.exists(last_seen_key)
                    if not exists:
                        logging.info("Removing stale session token from set: %s", token)
                        await redis.srem(SESSIONS_KEY, token)
        except Exception as e:
            logging.exception("Error cleaning stale sessions: %s", e)
        await asyncio.sleep(poll_seconds)


@fastapi_app.on_event("startup")
async def _startup_tasks():
    # Start cleanup background task
    fastapi_app.state._cleanup_task = asyncio.create_task(_cleanup_stale_sessions_loop())


@fastapi_app.on_event("shutdown")
async def _shutdown_tasks():
    task = getattr(fastapi_app.state, "_cleanup_task", None)
    if task:
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass


@fastapi_app.get("/")
def root():
    return {"message": "FastAPI backend activo"}
