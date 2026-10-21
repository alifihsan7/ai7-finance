from typing import Optional
import time
from collections import defaultdict
from threading import Lock
from fastapi import Request, HTTPException, status

class SimpleRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter for brute-force protection.
    """
    def __init__(self, max_requests: int, window_seconds: int):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.lock = Lock()

    def _get_real_ip(self, request: Request) -> str:
        cf_ip = request.headers.get("CF-Connecting-IP")
        if cf_ip:
            return cf_ip.strip()
        xf_ip = request.headers.get("X-Forwarded-For")
        if xf_ip:
            return xf_ip.split(",")[0].strip()
        return request.client.host if request.client else "unknown"

    def check(self, request: Request, identifier: Optional[str] = None):
        client_ip: str = identifier or self._get_real_ip(request)
        now = time.time()
        
        with self.lock:
            # Clean expired timestamps
            cutoff = now - self.window_seconds
            self.requests[client_ip] = [ts for ts in self.requests[client_ip] if ts > cutoff]
            
            if len(self.requests[client_ip]) >= self.max_requests:
                retry_after = int(self.window_seconds - (now - self.requests[client_ip][0])) + 1
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Terlalu banyak permintaan. Silakan tunggu beberapa saat sebelum mencoba lagi.",
                    headers={"Retry-After": str(max(1, retry_after))}
                )
            
            self.requests[client_ip].append(now)

login_limiter = SimpleRateLimiter(max_requests=10, window_seconds=60)
register_limiter = SimpleRateLimiter(max_requests=5, window_seconds=60)
