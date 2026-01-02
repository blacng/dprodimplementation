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

# Conditionally export agent tools and MCP server if claude-agent-sdk is available
try:
    from .tools import (  # noqa: F401
        catalog_query,
        trace_lineage,
        check_quality,
        register_product,
        run_sparql,
        get_client,
        set_client,
    )
    from .mcp_server import (  # noqa: F401
        create_dprod_server,
        get_agent_options,
        CATALOG_AGENT_PROMPT,
        TOOL_NAMES,
    )

    __all__.extend([
        # Tools
        "catalog_query",
        "trace_lineage",
        "check_quality",
        "register_product",
        "run_sparql",
        "get_client",
        "set_client",
        # MCP Server
        "create_dprod_server",
        "get_agent_options",
        "CATALOG_AGENT_PROMPT",
        "TOOL_NAMES",
    ])
except ImportError:
    pass  # claude-agent-sdk not installed
