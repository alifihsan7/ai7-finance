import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from typing import Optional
from fastapi import Request, HTTPException
from app.core.rate_limit import SimpleRateLimiter

def create_mock_request(client_host: str = "127.0.0.1", headers: Optional[dict] = None):
    raw_headers = []
    if headers:
        for k, v in headers.items():
            raw_headers.append((k.lower().encode("latin-1"), v.encode("latin-1")))
    
    scope = {
        "type": "http",
        "method": "POST",
        "path": "/api/v1/auth/login",
        "headers": raw_headers,
        "client": (client_host, 12345),
    }
    return Request(scope)

def run_tests():
    print("=== STARTING SEC-02 VERIFICATION ===")
    
    limiter = SimpleRateLimiter(max_requests=5, window_seconds=60)
    
    # 5 different IPs sending requests behind the same proxy peer (e.g. 127.0.0.1 / Cloudflare tunnel host)
    distinct_ips = [
        "203.0.113.10",
        "203.0.113.20",
        "203.0.113.30",
        "203.0.113.40",
        "203.0.113.50",
    ]

    print("[Test 1] 5 distinct IPs sending 5 requests each through shared proxy peer (127.0.0.1)...")
    for ip in distinct_ips:
        for req_idx in range(5):
            req = create_mock_request(
                client_host="127.0.0.1", # Same proxy host
                headers={"CF-Connecting-IP": ip}
            )
            try:
                limiter.check(req)
            except HTTPException:
                print(f"FAIL: IP {ip} got rate limited on request {req_idx + 1}")
                sys.exit(1)
    
    print(f"PASS: All 25 requests across 5 distinct CF-Connecting-IP addresses succeeded without collision.")

    print("\n[Test 2] Exceeding limit on IP 203.0.113.10 (request #6) must trigger 429...")
    req_overflow = create_mock_request(
        client_host="127.0.0.1",
        headers={"CF-Connecting-IP": "203.0.113.10"}
    )
    try:
        limiter.check(req_overflow)
        print("FAIL: Request #6 for IP 203.0.113.10 did not trigger 429!")
        sys.exit(1)
    except HTTPException as e:
        assert e.status_code == 429
        print(f"PASS: IP 203.0.113.10 correctly rate-limited with HTTP {e.status_code}: {e.detail}")

    print("\n[Test 3] Verifying that a different IP (203.0.113.99) is NOT locked out by IP 203.0.113.10's 429...")
    req_other = create_mock_request(
        client_host="127.0.0.1",
        headers={"CF-Connecting-IP": "203.0.113.99"}
    )
    try:
        limiter.check(req_other)
        print("PASS: Unrelated IP is not blocked! Rate limit buckets are properly isolated.")
    except HTTPException:
        print("FAIL: Unrelated IP was blocked! Global collision still present!")
        sys.exit(1)

    print("\n[Test 4] Fallback to X-Forwarded-For leftmost IP...")
    limiter_xff = SimpleRateLimiter(max_requests=2, window_seconds=60)
    req_xff1 = create_mock_request(headers={"X-Forwarded-For": "198.51.100.77, 10.0.0.1"})
    req_xff2 = create_mock_request(headers={"X-Forwarded-For": "198.51.100.77, 10.0.0.2"})
    req_xff3 = create_mock_request(headers={"X-Forwarded-For": "198.51.100.77, 10.0.0.3"})
    limiter_xff.check(req_xff1)
    limiter_xff.check(req_xff2)
    try:
        limiter_xff.check(req_xff3)
        print("FAIL: X-Forwarded-For rate limit failed to trigger on 3rd request!")
        sys.exit(1)
    except HTTPException as e:
        assert e.status_code == 429
        print(f"PASS: X-Forwarded-For leftmost IP properly tracked and triggered HTTP {e.status_code}")

    print("\n=== ALL SEC-02 VERIFICATION TESTS PASSED SUCCESSFULLY ===")

if __name__ == "__main__":
    run_tests()
