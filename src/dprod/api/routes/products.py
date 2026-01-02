"""Product REST API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from ...client import DPRODClient, NotFoundError
from ..schemas import (
    DataProductCreate,
    DataProductDetailResponse,
    DataProductResponse,
    DataProductSummaryResponse,
    DomainResponse,
)

router = APIRouter(prefix="/products", tags=["products"])

# Shared client instance
_client: DPRODClient | None = None


def get_client() -> DPRODClient:
    """Get or create the DPROD client."""
    global _client
    if _client is None:
        _client = DPRODClient()
    return _client


def set_client(client: DPRODClient) -> None:
    """Set the DPROD client (for testing)."""
    global _client
    _client = client


@router.get("", response_model=list[DataProductSummaryResponse])
async def list_products(
    domain: str | None = Query(None, description="Filter by domain URI"),
    status: str | None = Query(None, description="Filter by status URI"),
    owner: str | None = Query(None, description="Filter by owner URI"),
) -> list[DataProductSummaryResponse]:
    """List all data products with optional filtering."""
    client = get_client()

    try:
        if domain:
            products = client.find_by_domain(domain)
        elif status:
            products = client.find_by_status(status)
        elif owner:
            products = client.find_by_owner(owner)
        else:
            products = client.list_products()

        return [
            DataProductSummaryResponse(
                uri=p.uri,
                label=p.label,
                description=p.description,
                owner_uri=p.owner_uri,
                owner_label=p.owner_label,
                domain_uri=p.domain_uri,
                domain_label=p.domain_label,
                status_uri=p.status_uri,
                created=p.created,
                modified=p.modified,
            )
            for p in products
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=list[DataProductSummaryResponse])
async def search_products(
    q: str = Query(..., description="Search query", min_length=1),
) -> list[DataProductSummaryResponse]:
    """Search for data products by keyword."""
    client = get_client()

    try:
        results = client.search(q)
        return [
            DataProductSummaryResponse(
                uri=r.uri,
                label=r.label,
                description=r.description,
                status_uri=r.status_uri,
            )
            for r in results
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/detail/{product_uri:path}", response_model=DataProductDetailResponse)
async def get_product_detail(product_uri: str) -> DataProductDetailResponse:
    """Get comprehensive details about a data product including nested ports, datasets, and distributions."""
    client = get_client()

    try:
        detail = client.get_product_detail(product_uri)
        return detail
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Product not found: {product_uri}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{product_uri:path}", response_model=DataProductResponse)
async def get_product(product_uri: str) -> DataProductResponse:
    """Get detailed information about a specific data product."""
    client = get_client()

    try:
        product = client.get_product(product_uri)
        return DataProductResponse(
            uri=product.uri,
            label=product.label,
            description=product.description,
            owner_uri=product.owner_uri,
            domain_uri=product.domain_uri,
            status_uri=product.status_uri,
            created=product.created,
            modified=product.modified,
            output_ports=product.output_ports or [],
            input_ports=product.input_ports or [],
        )
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Product not found: {product_uri}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("", response_model=DataProductResponse, status_code=201)
async def create_product(product: DataProductCreate) -> DataProductResponse:
    """Create a new data product."""
    client = get_client()

    # Generate URI if not provided
    product_uri = product.uri
    if not product_uri:
        # Generate a URI based on the label
        safe_label = product.label.lower().replace(" ", "-")
        product_uri = f"urn:product:{safe_label}"

    try:
        # Create the product
        client.create_product(
            uri=product_uri,
            label=product.label,
            owner_uri=product.owner_uri,
            status_uri=product.status_uri or "urn:lifecycle:Design",
            description=product.description,
            domain_uri=product.domain_uri,
        )

        # Return the created product
        created = client.get_product(product_uri)
        return DataProductResponse(
            uri=created.uri,
            label=created.label,
            description=created.description,
            owner_uri=created.owner_uri,
            domain_uri=created.domain_uri,
            status_uri=created.status_uri,
            created=created.created,
            modified=created.modified,
            output_ports=created.output_ports or [],
            input_ports=created.input_ports or [],
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/domains/", response_model=list[DomainResponse])
async def list_domains() -> list[DomainResponse]:
    """List all domains with product counts."""
    client = get_client()

    try:
        stats = client.stats_by_domain()
        return [
            DomainResponse(
                uri=s.domain_uri,
                label=s.domain_label,
                product_count=s.product_count,
            )
            for s in stats
        ]
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
