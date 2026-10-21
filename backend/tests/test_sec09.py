import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.core.config import settings

def run_tests():
    print("=== STARTING SEC-09 VERIFICATION ===")
    print(f"ACCESS_TOKEN_EXPIRE_MINUTES: {settings.ACCESS_TOKEN_EXPIRE_MINUTES}")
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 10080, f"Expected 10080, got {settings.ACCESS_TOKEN_EXPIRE_MINUTES}"
    assert settings.ACCESS_TOKEN_EXPIRE_MINUTES == 60 * 24 * 7, "Must be exactly 7 days"
    print("PASS: Access token expiration successfully set to 7 days (10080 minutes).")

if __name__ == "__main__":
    run_tests()
