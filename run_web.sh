#!/bin/bash
cd /home/alifihsan/ai7-finance
exec /home/alifihsan/.hermes/installs/6991b9ec1156e6f5/environments/4c9c8b8b84364e2abd01e760b0a8f829/venv/bin/python -m uvicorn web:app --host 0.0.0.0 --port 8080
