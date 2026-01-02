"""DPROD Python Client for GraphDB."""

from .client import DPRODClient
from .models import DataProduct, DataProductSummary, LineageEntry, DomainStats

__all__ = [
    "DPRODClient",
    "DataProduct",
    "DataProductSummary",
    "LineageEntry",
    "DomainStats",
]

# Conditionally export agent tools if claude-agent-sdk is available
try:
    from .tools import catalog_query, trace_lineage, get_client, set_client

    __all__.extend(["catalog_query", "trace_lineage", "get_client", "set_client"])
except ImportError:
    pass  # claude-agent-sdk not installed
