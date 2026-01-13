"""FastAPI application for the DPROD Catalog API."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .routes import chat_router, lineage_router, products_router, quality_router
from ..client import DPRODClient


def create_app(
    title: str = "DPROD Catalog API",
    description: str = "REST API and WebSocket interface for the DPROD Data Product Catalog",
    version: str = "1.0.0",
    enable_cors: bool = True,
    cors_origins: list[str] | None = None,
) -> FastAPI:
    """Create and configure the FastAPI application.

    Args:
        title: API title
        description: API description
        version: API version
        enable_cors: Whether to enable CORS middleware
        cors_origins: List of allowed CORS origins (defaults to localhost for dev)

    Returns:
        Configured FastAPI application
    """
    app = FastAPI(
        title=title,
        description=description,
        version=version,
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
    )

    # CORS configuration
    if enable_cors:
        origins = cors_origins or [
            "http://localhost:3000",  # React dev server
            "http://localhost:5173",  # Vite default
            "http://localhost:5174",  # Vite alternate port
            "http://localhost:8080",  # Alternative dev port
            "http://127.0.0.1:3000",
            "http://127.0.0.1:5173",
            "http://127.0.0.1:5174",
        ]

        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Include routers
    app.include_router(products_router, prefix="/api/v1")
    app.include_router(lineage_router, prefix="/api/v1")
    app.include_router(quality_router, prefix="/api/v1")
    app.include_router(chat_router)  # WebSocket at root level

    # Health check endpoint
    @app.get("/api/v1/health", tags=["health"])
    async def health_check() -> dict:
        """Check API and GraphDB health."""
        client = DPRODClient()

        try:
            is_healthy = client.health_check()
            product_count = client.count_products() if is_healthy else None

            return {
                "status": "healthy" if is_healthy else "degraded",
                "graphdb_connected": is_healthy,
                "repository": client.repository,
                "product_count": product_count,
            }
        except Exception as e:
            return {
                "status": "unhealthy",
                "graphdb_connected": False,
                "repository": client.repository,
                "error": str(e),
            }

    # Root endpoint
    @app.get("/", tags=["root"])
    async def root() -> dict:
        """API root with links to documentation."""
        return {
            "name": title,
            "version": version,
            "docs": "/api/docs",
            "health": "/api/v1/health",
            "endpoints": {
                "products": "/api/v1/products",
                "lineage": "/api/v1/lineage/{product_uri}",
                "quality": "/api/v1/quality",
                "chat": "ws://localhost:8000/ws/chat",
            },
        }

    return app


# Create the default app instance
app = create_app()


# CLI entry point
def run_server(
    host: str = "0.0.0.0",
    port: int = 8000,
    reload: bool = False,
):
    """Run the development server.

    Args:
        host: Host to bind to
        port: Port to listen on
        reload: Enable auto-reload for development
    """
    import uvicorn

    uvicorn.run(
        "src.dprod.api.main:app",
        host=host,
        port=port,
        reload=reload,
    )


if __name__ == "__main__":
    run_server(reload=True)
