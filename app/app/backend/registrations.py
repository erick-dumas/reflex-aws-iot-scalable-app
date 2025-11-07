from typing import Set
from redis.asyncio import Redis

redis = Redis.from_url("redis://localhost", decode_responses=True)

# Clave que contiene todos los tokens de navegadores registrados
SESSIONS_KEY = "sessions:all"

# Prefijos y TTL para limpieza de tokens antiguos
LAST_SEEN_PREFIX = "token_last_seen:"
TOKEN_TTL_SECONDS = 60 * 60 * 24


async def register_token(token: str) -> None:
    await redis.sadd(SESSIONS_KEY, token)
    # Guardar la referencia del token con TTL para facilitar limpieza
    await redis.setex(f"{LAST_SEEN_PREFIX}{token}", TOKEN_TTL_SECONDS, "1")

async def unregister_token(token: str) -> None:
    await redis.srem(SESSIONS_KEY, token)
    await redis.delete(f"{LAST_SEEN_PREFIX}{token}")

async def get_all_tokens() -> Set[str]:
    tokens = await redis.smembers(SESSIONS_KEY)
    # `smembers` ya devuelve strings si decode_responses=True; convertir a set por seguridad
    return set(tokens or [])
