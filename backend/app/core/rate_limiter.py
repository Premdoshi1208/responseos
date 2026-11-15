import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import get_settings


class RateLimiter:
    def __init__(self):
        self._requests: dict[str, Deque[float]] = defaultdict(deque)

    def check_rate_limit(
        self, key: str, max_requests: int, window_seconds: int
    ) -> bool:
        now = time.time()
        window_start = now - window_seconds
        request_log = self._requests[key]

        while request_log and request_log[0] < window_start:
            request_log.popleft()

        if len(request_log) >= max_requests:
            return False

        request_log.append(now)
        return True

    def clean_old_entries(self, max_age_seconds: int = 86400) -> None:
        now = time.time()
        cutoff = now - max_age_seconds
        keys_to_delete = []
        for key, log in self._requests.items():
            while log and log[0] < cutoff:
                log.popleft()
            if not log:
                keys_to_delete.append(key)
        for key in keys_to_delete:
            del self._requests[key]


rate_limiter = RateLimiter()


class RateLimitMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        settings = get_settings()

        client_ip = request.client.host if request.client else "unknown"
        key = f"ip:{client_ip}"

        if not rate_limiter.check_rate_limit(
            key, settings.RATE_LIMIT_PER_MINUTE, 60
        ):
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Rate limit exceeded. Please try again later."},
            )

        response = await call_next(request)
        return response


def check_daily_limit(key: str, max_requests: int) -> None:
    if not rate_limiter.check_rate_limit(key, max_requests, 86400):
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Daily limit exceeded for this resource.",
        )
