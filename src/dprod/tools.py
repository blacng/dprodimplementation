"""Agent tools for DPROD catalog operations.

This module provides tools for the Claude Agent SDK that wrap the DPROD client,
following the consolidation principle: fewer, comprehensive tools that combine
related operations.
"""

from typing import Any

from claude_agent_sdk import tool

from .client import DPRODClient, DPRODClientError, NotFoundError
from .models import DataProduct, DataProductSummary, LineageEntry, SearchResult


def _format_product_summary(product: DataProductSummary) -> dict[str, Any]:
    """Convert a DataProductSummary to a serializable dict."""
    return {
        "uri": product.uri,
        "label": product.label,
        "description": product.description,
        "owner": product.owner_label or product.owner_uri,
        "domain": product.domain_label or product.domain_uri,
        "status": _extract_status_name(product.status_uri),
        "created": product.created.isoformat() if product.created else None,
        "modified": product.modified.isoformat() if product.modified else None,
    }


def _format_product_detail(product: DataProduct) -> dict[str, Any]:
    """Convert a DataProduct to a detailed serializable dict."""
    return {
        "uri": product.uri,
        "label": product.label,
        "description": product.description,
        "owner_uri": product.owner_uri,
        "domain_uri": product.domain_uri,
        "status": _extract_status_name(product.status_uri),
        "status_uri": product.status_uri,
        "created": product.created.isoformat() if product.created else None,
        "modified": product.modified.isoformat() if product.modified else None,
        "output_ports": product.output_ports,
        "input_ports": product.input_ports,
    }


def _format_search_result(result: SearchResult) -> dict[str, Any]:
    """Convert a SearchResult to a serializable dict."""
    return {
        "uri": result.uri,
        "label": result.label,
        "description": result.description,
        "status": _extract_status_name(result.status_uri),
        "matched_in": result.matched_field,
    }


def _extract_status_name(status_uri: str | None) -> str | None:
    """Extract readable status name from URI."""
    if not status_uri:
        return None
    # URIs like https://ekgf.github.io/dprod/data/lifecycle-status/Consume
    return status_uri.rsplit("/", 1)[-1] if "/" in status_uri else status_uri


def _format_concise_list(products: list[DataProductSummary]) -> str:
    """Format products as a concise text list."""
    if not products:
        return "No data products found."

    lines = [f"Found {len(products)} data product(s):\n"]
    for p in products:
        status = _extract_status_name(p.status_uri) or "Unknown"
        domain = p.domain_label or "No domain"
        lines.append(f"- {p.label} [{status}] ({domain})")
        if p.description:
            # Truncate long descriptions
            desc = p.description[:100] + "..." if len(p.description) > 100 else p.description
            lines.append(f"  {desc}")

    return "\n".join(lines)


def _format_detailed_product(product: DataProduct) -> str:
    """Format a single product with full details."""
    lines = [
        f"# {product.label}",
        f"URI: {product.uri}",
        f"Status: {_extract_status_name(product.status_uri) or 'Unknown'}",
    ]

    if product.description:
        lines.append(f"\n## Description\n{product.description}")

    if product.owner_uri:
        lines.append(f"\nOwner: {product.owner_uri}")

    if product.domain_uri:
        lines.append(f"Domain: {product.domain_uri}")

    if product.created:
        lines.append(f"Created: {product.created.isoformat()}")

    if product.modified:
        lines.append(f"Modified: {product.modified.isoformat()}")

    if product.output_ports:
        lines.append(f"\n## Output Ports ({len(product.output_ports)})")
        for port in product.output_ports:
            lines.append(f"- {port}")

    if product.input_ports:
        lines.append(f"\n## Input Ports ({len(product.input_ports)})")
        for port in product.input_ports:
            lines.append(f"- {port}")

    return "\n".join(lines)


def _format_search_results(results: list[SearchResult]) -> str:
    """Format search results as text."""
    if not results:
        return "No matching data products found."

    lines = [f"Found {len(results)} matching product(s):\n"]
    for r in results:
        status = _extract_status_name(r.status_uri) or "Unknown"
        lines.append(f"- {r.label} [{status}] (matched in: {r.matched_field})")
        if r.description:
            desc = r.description[:100] + "..." if len(r.description) > 100 else r.description
            lines.append(f"  {desc}")

    return "\n".join(lines)


# Global client instance - initialized lazily
_client: DPRODClient | None = None


def get_client() -> DPRODClient:
    """Get or create the DPROD client instance."""
    global _client
    if _client is None:
        _client = DPRODClient()
    return _client


def set_client(client: DPRODClient) -> None:
    """Set a custom client instance (useful for testing)."""
    global _client
    _client = client


@tool(
    "catalog_query",
    """Search and retrieve data products from the DPROD catalog.

Use when:
- User asks "what data products exist" or "list all products"
- User asks about products in a specific domain (e.g., "customer analytics products")
- User wants details about a specific product by name or URI
- User searches by keyword (e.g., "find products about customers")
- User asks about products by owner or status

Query types:
- "list": List all data products (default)
- "get": Get detailed information about a specific product (requires product_uri)
- "search": Full-text search across product names and descriptions (requires keyword)
- "filter": Filter by domain, owner, or status (requires one of domain_uri, owner_uri, status_uri)

Returns: Formatted list of products or detailed product information""",
    {
        "query_type": str,
        "product_uri": str,
        "keyword": str,
        "domain_uri": str,
        "owner_uri": str,
        "status_uri": str,
        "format": str,
    },
)
async def catalog_query(args: dict[str, Any]) -> dict[str, Any]:
    """Execute a catalog query against the DPROD repository.

    Args:
        args: Dictionary containing:
            - query_type: "list" | "get" | "search" | "filter" (default: "list")
            - product_uri: URI of product for "get" queries
            - keyword: Search term for "search" queries
            - domain_uri: Domain URI for "filter" queries
            - owner_uri: Owner URI for "filter" queries
            - status_uri: Status URI for "filter" queries
            - format: "concise" | "detailed" (default: "concise")

    Returns:
        Tool response with content blocks
    """
    query_type = args.get("query_type", "list")
    output_format = args.get("format", "concise")
    client = get_client()

    try:
        if query_type == "get":
            # Get specific product details
            product_uri = args.get("product_uri")
            if not product_uri:
                return {
                    "content": [{"type": "text", "text": "Error: product_uri is required for 'get' queries"}],
                    "is_error": True,
                }

            product = client.get_product(product_uri)

            if output_format == "detailed":
                text = _format_detailed_product(product)
            else:
                text = f"{product.label}: {product.description or 'No description'}"

            return {"content": [{"type": "text", "text": text}]}

        elif query_type == "search":
            # Full-text search
            keyword = args.get("keyword")
            if not keyword:
                return {
                    "content": [{"type": "text", "text": "Error: keyword is required for 'search' queries"}],
                    "is_error": True,
                }

            results = client.search(keyword)
            text = _format_search_results(results)
            return {"content": [{"type": "text", "text": text}]}

        elif query_type == "filter":
            # Filter by domain, owner, or status
            domain_uri = args.get("domain_uri")
            owner_uri = args.get("owner_uri")
            status_uri = args.get("status_uri")

            if domain_uri:
                products = client.find_by_domain(domain_uri)
                filter_desc = f"in domain {domain_uri}"
            elif owner_uri:
                products = client.find_by_owner(owner_uri)
                filter_desc = f"owned by {owner_uri}"
            elif status_uri:
                products = client.find_by_status(status_uri)
                filter_desc = f"with status {_extract_status_name(status_uri)}"
            else:
                return {
                    "content": [{"type": "text", "text": "Error: domain_uri, owner_uri, or status_uri required for 'filter' queries"}],
                    "is_error": True,
                }

            text = _format_concise_list(products)
            if products:
                text = f"Products {filter_desc}:\n\n{text}"

            return {"content": [{"type": "text", "text": text}]}

        else:
            # Default: list all products
            products = client.list_products()
            text = _format_concise_list(products)
            return {"content": [{"type": "text", "text": text}]}

    except NotFoundError as e:
        return {
            "content": [{"type": "text", "text": f"Not found: {e}"}],
            "is_error": True,
        }
    except DPRODClientError as e:
        return {
            "content": [{"type": "text", "text": f"Catalog error: {e}"}],
            "is_error": True,
        }
    except Exception as e:
        return {
            "content": [{"type": "text", "text": f"Unexpected error: {e}"}],
            "is_error": True,
        }


# -------------------------------------------------------------------------
# Lineage Formatting
# -------------------------------------------------------------------------


def _format_lineage_entry(entry: LineageEntry, direction: str) -> str:
    """Format a single lineage entry."""
    status = _extract_status_name(entry.status_uri) or "Unknown"
    port_info = f" via {entry.port_label or entry.port_uri}" if entry.port_uri else ""
    arrow = "←" if direction == "upstream" else "→"
    return f"  {arrow} {entry.product_label} [{status}]{port_info}"


def _format_lineage_results(
    product_uri: str,
    upstream: list[LineageEntry] | None,
    downstream: list[LineageEntry] | None,
) -> str:
    """Format lineage results as readable text."""
    # Extract product name from URI for display
    product_name = product_uri.rsplit("/", 1)[-1] if "/" in product_uri else product_uri

    lines = [f"# Lineage for {product_name}\n"]

    if upstream is not None:
        lines.append(f"## Upstream Dependencies ({len(upstream)})")
        if upstream:
            lines.append("Data sources this product consumes from:")
            for entry in upstream:
                lines.append(_format_lineage_entry(entry, "upstream"))
        else:
            lines.append("  No upstream dependencies (this is a source product)")
        lines.append("")

    if downstream is not None:
        lines.append(f"## Downstream Consumers ({len(downstream)})")
        if downstream:
            lines.append("Products that depend on this product:")
            for entry in downstream:
                lines.append(_format_lineage_entry(entry, "downstream"))
        else:
            lines.append("  No downstream consumers")
        lines.append("")

    # Add impact analysis summary for downstream
    if downstream and len(downstream) > 0:
        lines.append("## Impact Analysis")
        lines.append(f"Changes to {product_name} will directly affect {len(downstream)} product(s).")

    return "\n".join(lines)


@tool(
    "trace_lineage",
    """Trace data lineage relationships between data products.

Use when:
- User asks "what depends on X" or "what uses X" (downstream)
- User asks "where does X get its data" or "what are X's sources" (upstream)
- User needs impact analysis before making changes to a product
- User wants to understand the full data flow through a product

Directions:
- "upstream": Find data sources this product consumes from
- "downstream": Find products that depend on this product
- "full": Get both upstream and downstream (default)

Returns: Formatted lineage graph with product names, statuses, and connection ports""",
    {
        "product_uri": str,
        "direction": str,
    },
)
async def trace_lineage(args: dict[str, Any]) -> dict[str, Any]:
    """Trace data lineage for a product.

    Args:
        args: Dictionary containing:
            - product_uri: URI of the product to trace lineage for (required)
            - direction: "upstream" | "downstream" | "full" (default: "full")

    Returns:
        Tool response with lineage information
    """
    product_uri = args.get("product_uri")
    direction = args.get("direction", "full")
    client = get_client()

    if not product_uri:
        return {
            "content": [{"type": "text", "text": "Error: product_uri is required"}],
            "is_error": True,
        }

    valid_directions = {"upstream", "downstream", "full"}
    if direction not in valid_directions:
        return {
            "content": [{"type": "text", "text": f"Error: direction must be one of {valid_directions}"}],
            "is_error": True,
        }

    try:
        upstream = None
        downstream = None

        if direction in ("upstream", "full"):
            upstream = client.get_upstream(product_uri)

        if direction in ("downstream", "full"):
            downstream = client.get_downstream(product_uri)

        text = _format_lineage_results(product_uri, upstream, downstream)
        return {"content": [{"type": "text", "text": text}]}

    except NotFoundError as e:
        return {
            "content": [{"type": "text", "text": f"Product not found: {e}"}],
            "is_error": True,
        }
    except DPRODClientError as e:
        return {
            "content": [{"type": "text", "text": f"Catalog error: {e}"}],
            "is_error": True,
        }
    except Exception as e:
        return {
            "content": [{"type": "text", "text": f"Unexpected error: {e}"}],
            "is_error": True,
        }


# -------------------------------------------------------------------------
# Quality Check Queries
# -------------------------------------------------------------------------

_PREFIXES = """
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
"""

_QUALITY_CHECKS: dict[str, dict[str, str]] = {
    "missing_owners": {
        "name": "Missing Owners",
        "description": "Data products without an assigned owner",
        "severity": "high",
        "query": _PREFIXES + """
SELECT ?product ?label ?status ?domain
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus ?status .
  OPTIONAL { ?product dprod:domain ?domain }
  FILTER NOT EXISTS {
    ?product dprod:dataProductOwner ?owner .
  }
}
ORDER BY ?label
""",
    },
    "missing_descriptions": {
        "name": "Missing Descriptions",
        "description": "Data products without documentation",
        "severity": "medium",
        "query": _PREFIXES + """
SELECT ?product ?label ?status ?owner
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus ?status .
  OPTIONAL { ?product dprod:dataProductOwner ?owner }
  FILTER NOT EXISTS {
    ?product dct:description ?desc .
  }
}
ORDER BY ?label
""",
    },
    "stale_products": {
        "name": "Stale Products",
        "description": "Products not modified in the last 90 days",
        "severity": "low",
        "query": _PREFIXES + """
SELECT ?product ?label ?status ?modified ?owner
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus ?status .
  OPTIONAL { ?product dct:modified ?modified }
  OPTIONAL { ?product dprod:dataProductOwner ?owner }
  FILTER (
    !BOUND(?modified) ||
    ?modified < (NOW() - "P90D"^^xsd:duration)
  )
}
ORDER BY ?modified ?label
""",
    },
    "orphaned_datasets": {
        "name": "Orphaned Datasets",
        "description": "Datasets not linked to any data product",
        "severity": "medium",
        "query": _PREFIXES + """
SELECT ?dataset ?datasetLabel ?datasetDescription
WHERE {
  ?dataset a dcat:Dataset .
  OPTIONAL { ?dataset rdfs:label ?datasetLabel }
  OPTIONAL { ?dataset dct:description ?datasetDescription }
  FILTER NOT EXISTS {
    ?port a dprod:OutputPort ;
          dprod:datasetSource ?dataset .
  }
}
ORDER BY ?datasetLabel
""",
    },
    "incomplete_ports": {
        "name": "Incomplete Port Definitions",
        "description": "Products missing input or output ports",
        "severity": "medium",
        "query": _PREFIXES + """
SELECT ?product ?label ?status ?hasInput ?hasOutput
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus ?status .
  BIND(EXISTS { ?product dprod:inputPort ?in } AS ?hasInput)
  BIND(EXISTS { ?product dprod:outputPort ?out } AS ?hasOutput)
  FILTER (!?hasInput || !?hasOutput)
}
ORDER BY ?label
""",
    },
}


def _run_quality_check(client: DPRODClient, check_id: str) -> dict[str, Any]:
    """Run a single quality check and return results."""
    check = _QUALITY_CHECKS[check_id]
    results = client._query(check["query"])
    bindings = results.get("results", {}).get("bindings", [])

    return {
        "check_id": check_id,
        "name": check["name"],
        "description": check["description"],
        "severity": check["severity"],
        "issue_count": len(bindings),
        "issues": bindings,
    }


def _format_quality_report(results: list[dict[str, Any]]) -> str:
    """Format quality check results as a readable report."""
    lines = ["# Data Catalog Quality Report\n"]

    total_issues = sum(r["issue_count"] for r in results)
    high_severity = sum(r["issue_count"] for r in results if r["severity"] == "high")
    medium_severity = sum(r["issue_count"] for r in results if r["severity"] == "medium")
    low_severity = sum(r["issue_count"] for r in results if r["severity"] == "low")

    lines.append("## Summary")
    lines.append(f"- Total issues: {total_issues}")
    lines.append(f"- High severity: {high_severity}")
    lines.append(f"- Medium severity: {medium_severity}")
    lines.append(f"- Low severity: {low_severity}")
    lines.append("")

    # Sort by severity (high first) then by issue count
    severity_order = {"high": 0, "medium": 1, "low": 2}
    sorted_results = sorted(results, key=lambda r: (severity_order[r["severity"]], -r["issue_count"]))

    for result in sorted_results:
        severity_icon = {"high": "🔴", "medium": "🟡", "low": "🟢"}[result["severity"]]
        lines.append(f"## {severity_icon} {result['name']} ({result['issue_count']} issues)")
        lines.append(f"*{result['description']}*\n")

        if result["issue_count"] == 0:
            lines.append("✓ No issues found\n")
        else:
            # Format up to 10 issues
            issues = result["issues"][:10]
            for issue in issues:
                # Extract label or URI for display
                if "label" in issue:
                    name = issue["label"]["value"]
                elif "datasetLabel" in issue:
                    name = issue["datasetLabel"]["value"]
                elif "product" in issue:
                    name = issue["product"]["value"].rsplit("/", 1)[-1]
                elif "dataset" in issue:
                    name = issue["dataset"]["value"].rsplit("/", 1)[-1]
                else:
                    name = "Unknown"

                # Add status if available
                status = ""
                if "status" in issue:
                    status = f" [{_extract_status_name(issue['status']['value'])}]"

                lines.append(f"  - {name}{status}")

            if result["issue_count"] > 10:
                lines.append(f"  ... and {result['issue_count'] - 10} more")

            lines.append("")

    return "\n".join(lines)


@tool(
    "check_quality",
    """Run governance and quality checks on the data product catalog.

Use when:
- User asks about catalog health or data quality
- User wants to find products without owners ("who owns X?")
- User asks about orphaned or incomplete products
- User needs a governance audit or compliance report
- User asks "what needs attention" or "what's missing"

Check types:
- "missing_owners": Products without assigned owners (high severity)
- "missing_descriptions": Products without documentation (medium severity)
- "stale_products": Products not updated in 90+ days (low severity)
- "orphaned_datasets": Datasets not linked to products (medium severity)
- "incomplete_ports": Products missing input/output ports (medium severity)
- "all": Run all checks (default)

Returns: Quality report with issues grouped by severity""",
    {
        "check_type": str,
    },
)
async def check_quality(args: dict[str, Any]) -> dict[str, Any]:
    """Run quality checks on the data catalog.

    Args:
        args: Dictionary containing:
            - check_type: Specific check to run, or "all" for all checks (default: "all")

    Returns:
        Tool response with quality report
    """
    check_type = args.get("check_type", "all")
    client = get_client()

    valid_checks = set(_QUALITY_CHECKS.keys()) | {"all"}
    if check_type not in valid_checks:
        return {
            "content": [{"type": "text", "text": f"Error: check_type must be one of {valid_checks}"}],
            "is_error": True,
        }

    try:
        if check_type == "all":
            results = [_run_quality_check(client, check_id) for check_id in _QUALITY_CHECKS]
        else:
            results = [_run_quality_check(client, check_type)]

        text = _format_quality_report(results)
        return {"content": [{"type": "text", "text": text}]}

    except DPRODClientError as e:
        return {
            "content": [{"type": "text", "text": f"Catalog error: {e}"}],
            "is_error": True,
        }
    except Exception as e:
        return {
            "content": [{"type": "text", "text": f"Unexpected error: {e}"}],
            "is_error": True,
        }
