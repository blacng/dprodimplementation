"""API route modules."""

from .chat import router as chat_router
from .lineage import router as lineage_router
from .products import router as products_router
from .quality import router as quality_router

__all__ = [
    "chat_router",
    "lineage_router",
    "products_router",
    "quality_router",
]
