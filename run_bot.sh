#!/bin/bash
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
cd "$DIR/backend" || exit 1

if [ -f "$DIR/venv/bin/python" ]; then
    exec "$DIR/venv/bin/python" -u -m app.bot.bot
else
    exec python3 -u -m app.bot.bot
fi
