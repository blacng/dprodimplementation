"""Lineage REST API endpoints."""

from fastapi import APIRouter, HTTPException, Query

from ...client import DPRODClient, NotFoundError
from ..schemas import LineageEdgeResponse, LineageGraphResponse, LineageNodeResponse

router = APIRouter(prefix="/lineage", tags=["lineage"])

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


@router.get("/{product_uri:path}", response_model=LineageGraphResponse)
async def get_lineage(
    product_uri: str,
    direction: str = Query(
        "full",
        description="Direction to trace: upstream, downstream, or full",
        pattern="^(upstream|downstream|full)$",
    ),
    depth: int = Query(
        1,
        description="How many levels of lineage to trace",
        ge=1,
        le=5,
    ),
) -> LineageGraphResponse:
    """Get lineage graph for a data product.

    Returns nodes and edges suitable for visualization with React Flow.
    """
    client = get_client()

    try:
        # Verify the product exists
        source_product = client.get_product(product_uri)
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Product not found: {product_uri}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    nodes: dict[str, LineageNodeResponse] = {}
    edges: list[LineageEdgeResponse] = []

    # Add source node
    nodes[product_uri] = LineageNodeResponse(
        uri=product_uri,
        label=source_product.label,
        status_uri=source_product.status_uri,
        domain_uri=source_product.domain_uri,
        is_source=True,
    )

    try:
        # Trace upstream (sources)
        if direction in ("upstream", "full"):
            _trace_upstream(client, product_uri, nodes, edges, depth, 0)

        # Trace downstream (consumers)
        if direction in ("downstream", "full"):
            _trace_downstream(client, product_uri, nodes, edges, depth, 0)

        return LineageGraphResponse(
            source_uri=product_uri,
            direction=direction,
            nodes=list(nodes.values()),
            edges=edges,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


def _trace_upstream(
    client: DPRODClient,
    product_uri: str,
    nodes: dict[str, LineageNodeResponse],
    edges: list[LineageEdgeResponse],
    max_depth: int,
    current_depth: int,
) -> None:
    """Recursively trace upstream dependencies."""
    if current_depth >= max_depth:
        return

    upstream = client.get_upstream(product_uri)

    for entry in upstream:
        # Add edge (upstream -> current product)
        edges.append(
            LineageEdgeResponse(
                source=entry.product_uri,
                target=product_uri,
                port_uri=entry.port_uri,
                port_label=entry.port_label,
            )
        )

        # Add node if not already present
        if entry.product_uri not in nodes:
            nodes[entry.product_uri] = LineageNodeResponse(
                uri=entry.product_uri,
                label=entry.product_label,
                status_uri=entry.status_uri,
                is_source=False,
            )

            # Recurse
            _trace_upstream(client, entry.product_uri, nodes, edges, max_depth, current_depth + 1)


def _trace_downstream(
    client: DPRODClient,
    product_uri: str,
    nodes: dict[str, LineageNodeResponse],
    edges: list[LineageEdgeResponse],
    max_depth: int,
    current_depth: int,
) -> None:
    """Recursively trace downstream consumers."""
    if current_depth >= max_depth:
        return

    downstream = client.get_downstream(product_uri)

    for entry in downstream:
        # Add edge (current product -> downstream)
        edges.append(
            LineageEdgeResponse(
                source=product_uri,
                target=entry.product_uri,
                port_uri=entry.port_uri,
                port_label=entry.port_label,
            )
        )

        # Add node if not already present
        if entry.product_uri not in nodes:
            nodes[entry.product_uri] = LineageNodeResponse(
                uri=entry.product_uri,
                label=entry.product_label,
                status_uri=entry.status_uri,
                is_source=False,
            )

            # Recurse
            _trace_downstream(client, entry.product_uri, nodes, edges, max_depth, current_depth + 1)
