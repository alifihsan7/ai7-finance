#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/backend" || exit 1

if [ -f "$DIR/venv/bin/python" ]; then
    exec "$DIR/venv/bin/python" -m uvicorn main:app --host 0.0.0.0 --port 8080
else
    exec uvicorn main:app --host 0.0.0.0 --port 8080
fi
