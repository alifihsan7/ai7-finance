#!/bin/bash
cd /home/alifihsan/ai7-finance/backend
exec /home/alifihsan/ai7-finance/venv/bin/python -m uvicorn main:app --host 0.0.0.0 --port 8080
