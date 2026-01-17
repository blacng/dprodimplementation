"""Entry point for deployment services (Railway, Render, Fly.io, etc.)."""

import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent / "src"))

from dprod.api import app

# Re-export for uvicorn: uvicorn main:app
__all__ = ["app"]
