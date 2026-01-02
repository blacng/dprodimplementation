"""Quality REST API endpoints."""

from fastapi import APIRouter, HTTPException

from ...client import DPRODClient

router = APIRouter(prefix="/quality", tags=["quality"])

# Quality check types
CHECK_TYPES = [
    "missing_owners",
    "missing_descriptions",
    "stale_products",
    "orphaned_datasets",
    "incomplete_ports",
]

# SPARQL queries for each check type
QUALITY_QUERIES = {
    "missing_owners": """
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label .
  FILTER NOT EXISTS { ?product dprod:dataProductOwner ?owner }
}
ORDER BY ?label
""",
    "missing_descriptions": """
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label .
  FILTER NOT EXISTS { ?product dct:description ?desc }
}
ORDER BY ?label
""",
    "stale_products": """
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

SELECT ?product ?label ?modified
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label .
  OPTIONAL { ?product dct:modified ?modified }
  FILTER(!BOUND(?modified) || ?modified < (NOW() - "P90D"^^xsd:duration))
}
ORDER BY ?modified
""",
    "orphaned_datasets": """
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?dataset ?label
WHERE {
  ?dataset a dcat:Dataset ;
           rdfs:label ?label .
  FILTER NOT EXISTS {
    ?port dcat:servesDataset ?dataset .
    ?product dprod:outputPort ?port .
    ?product a dprod:DataProduct .
  }
}
ORDER BY ?label
""",
    "incomplete_ports": """
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label .
  FILTER NOT EXISTS { ?product dprod:outputPort ?port }
}
ORDER BY ?label
""",
}

# Issue severity and description mappings
ISSUE_METADATA = {
    "missing_owners": {
        "severity": "high",
        "description": "Product has no designated owner",
        "suggestion": "Assign an owner to ensure accountability",
    },
    "missing_descriptions": {
        "severity": "medium",
        "description": "Product lacks a description",
        "suggestion": "Add a description to improve discoverability",
    },
    "stale_products": {
        "severity": "low",
        "description": "Product not modified in 90+ days",
        "suggestion": "Review and update the product or mark as retired",
    },
    "orphaned_datasets": {
        "severity": "medium",
        "description": "Dataset not served by any product output port",
        "suggestion": "Connect dataset to a product or remove if unused",
    },
    "incomplete_ports": {
        "severity": "high",
        "description": "Product has no output ports defined",
        "suggestion": "Add at least one output port to make data accessible",
    },
}

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


def _run_quality_check(client: DPRODClient, check_type: str) -> list[dict]:
    """Run a specific quality check and return issues."""
    query = QUALITY_QUERIES.get(check_type)
    if not query:
        return []

    metadata = ISSUE_METADATA.get(check_type, {})

    # Execute query directly using client's internal method
    results = client._query(query)
    issues = []

    for binding in results.get("results", {}).get("bindings", []):
        uri = binding.get("product", binding.get("dataset", {})).get("value", "")
        label = binding.get("label", {}).get("value", "Unknown")

        issues.append(
            {
                "product_uri": uri,
                "product_label": label,
                "issue_type": check_type,
                "severity": metadata.get("severity", "medium"),
                "description": metadata.get("description", ""),
                "suggestion": metadata.get("suggestion"),
            }
        )

    return issues


@router.get("")
async def get_quality_report() -> dict:
    """Get a full quality report across all check types."""
    client = get_client()

    try:
        total_products = client.count_products()
        all_issues = []
        checks = []

        for check_type in CHECK_TYPES:
            issues = _run_quality_check(client, check_type)
            all_issues.extend(issues)

            checks.append(
                {
                    "check_type": check_type,
                    "issue_count": len(issues),
                    "issues": issues,
                }
            )

        # Count by severity
        high_count = sum(1 for i in all_issues if i["severity"] == "high")
        medium_count = sum(1 for i in all_issues if i["severity"] == "medium")
        low_count = sum(1 for i in all_issues if i["severity"] == "low")

        return {
            "total_products": total_products,
            "total_issues": len(all_issues),
            "high_severity_count": high_count,
            "medium_severity_count": medium_count,
            "low_severity_count": low_count,
            "checks": checks,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{check_type}")
async def get_quality_check(
    check_type: str,
) -> dict:
    """Run a specific quality check."""
    if check_type not in CHECK_TYPES:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid check type. Valid types: {', '.join(CHECK_TYPES)}",
        )

    client = get_client()

    try:
        issues = _run_quality_check(client, check_type)

        return {
            "check_type": check_type,
            "issue_count": len(issues),
            "issues": issues,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
