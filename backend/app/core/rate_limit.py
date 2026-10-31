import ipaddress
import os
import time
from collections import defaultdict
from threading import Lock
from typing import Optional, Set
from fastapi import Request, HTTPException, status

class SimpleRateLimiter:
    """
    Thread-safe in-memory sliding window rate limiter for brute-force protection.
    Secured against IP spoofing (SEC-2026-01): only trusts reverse proxy headers
    (CF-Connecting-IP, X-Forwarded-For) if the request originates from a trusted
    proxy / localhost peer. Direct external requests cannot bypass limits by forging headers.
    """
    DEFAULT_TRUSTED_PROXIES = {"127.0.0.1", "::1", "localhost", "testclient"}

    def __init__(self, max_requests: int, window_seconds: int, trusted_proxies: Optional[Set[str]] = None):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(list)
        self.lock = Lock()

        self.trusted_proxies = set(self.DEFAULT_TRUSTED_PROXIES)
        env_proxies = os.getenv("TRUSTED_PROXIES", "")
        if env_proxies:
            self.trusted_proxies.update(p.strip() for p in env_proxies.split(",") if p.strip())
        if trusted_proxies:
            self.trusted_proxies.update(trusted_proxies)

    def _is_trusted_proxy(self, client_host: str) -> bool:
        if not client_host:
            return False
        client_host = client_host.strip()
        if client_host in self.trusted_proxies:
            return True
        try:
            ip = ipaddress.ip_address(client_host)
            if ip.is_loopback:
                return True
            for net in self.trusted_proxies:
                try:
                    if "/" in net and ip in ipaddress.ip_network(net, strict=False):
                        return True
                except ValueError:
                    continue
        except ValueError:
            pass
        return False

    def _get_real_ip(self, request: Request) -> str:
        client_host = request.client.host if request.client else "unknown"
        if self._is_trusted_proxy(client_host):
            cf_ip = request.headers.get("CF-Connecting-IP")
            if cf_ip and cf_ip.strip():
                return cf_ip.strip()
            xf_ip = request.headers.get("X-Forwarded-For")
            if xf_ip:
                first_ip = xf_ip.split(",")[0].strip()
                if first_ip:
                    return first_ip
        return client_host

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
auth_limiter = SimpleRateLimiter(max_requests=10, window_seconds=60)
