from redis.asyncio import Redis

redis = Redis.from_url("redis://localhost", decode_responses=True)

KEY_PREFIX = "device_tokens:"

async def register_token_for_device(device_id: str, token: str):
    await redis.sadd(f"{KEY_PREFIX}{device_id}", token)
    await redis.setex(f"token_last_seen:{token}", 60 * 60 * 24, device_id)  # TTL 24h
    print(f"Registered token for device {device_id}")

async def unregister_token_for_device(device_id: str, token: str):
    await redis.srem(f"{KEY_PREFIX}{device_id}", token)
    await redis.delete(f"token_last_seen:{token}")

async def get_all_tokens() -> set[str]:
    keys = await redis.keys(f"{KEY_PREFIX}*")
    all_tokens = set()
    for key in keys:
        tokens = await redis.smembers(key)
        all_tokens.update(tokens)
    return all_tokens
