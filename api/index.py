"""Vercel serverless function entry point."""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from dprod.api import app

# Vercel expects the app to be named 'app' or 'handler'
handler = app
