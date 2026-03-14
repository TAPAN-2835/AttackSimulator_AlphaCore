#!/usr/bin/env bash

# This script ensures that Render runs the backend correctly
# by explicitly setting the current directory and python path.

cd backend
export PYTHONPATH=$(pwd)
python -m uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}
