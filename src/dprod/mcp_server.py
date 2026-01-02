"""MCP Server for DPROD Catalog Agent.

This module creates an in-process MCP server that exposes the DPROD catalog
tools to Claude agents. The server can be used with the Claude Agent SDK
to create an AI-powered interface for the data product catalog.

Usage:
    from src.dprod.mcp_server import create_dprod_server, get_agent_options

    # Create the MCP server
    server = create_dprod_server()

    # Get pre-configured agent options
    options = get_agent_options()

    # Use with Claude Agent SDK
    async with ClaudeSDKClient(options=options) as client:
        await client.query("List all data products")
"""

from claude_agent_sdk import ClaudeAgentOptions, create_sdk_mcp_server

from .tools import (
    catalog_query,
    check_quality,
    register_product,
    run_sparql,
    trace_lineage,
)

# Server metadata
SERVER_NAME = "dprod-catalog"
SERVER_VERSION = "1.0.0"

# All available tools
TOOLS = [
    catalog_query,
    trace_lineage,
    check_quality,
    register_product,
    run_sparql,
]

# Tool names for allowed_tools configuration
TOOL_NAMES = [
    "mcp__catalog__catalog_query",
    "mcp__catalog__trace_lineage",
    "mcp__catalog__check_quality",
    "mcp__catalog__register_product",
    "mcp__catalog__run_sparql",
]

# Default system prompt for the catalog agent
CATALOG_AGENT_PROMPT = """You are a data product catalog assistant for an enterprise data mesh.

You help users:
- Discover data products by domain, owner, or keyword
- Understand data lineage and dependencies between products
- Check catalog quality and governance compliance
- Register new data products in the catalog
- Run custom queries for advanced analysis

Guidelines:
- Always verify product existence before providing details
- When tracing lineage, explain the business impact of dependencies
- For quality checks, prioritize high-severity issues
- When registering products, validate all required fields
- Use run_sparql only for queries not covered by other tools

Available lifecycle statuses: Design, Build, Consume, Retire

Be concise and focus on actionable information."""


def create_dprod_server():
    """Create the DPROD catalog MCP server.

    Returns:
        An MCP server instance with all catalog tools registered.

    Example:
        server = create_dprod_server()
        options = ClaudeAgentOptions(
            mcp_servers={"catalog": server},
            allowed_tools=TOOL_NAMES
        )
    """
    return create_sdk_mcp_server(
        name=SERVER_NAME,
        version=SERVER_VERSION,
        tools=TOOLS,
    )


def get_agent_options(
    model: str = "sonnet",
    system_prompt: str | None = None,
    additional_tools: list[str] | None = None,
) -> ClaudeAgentOptions:
    """Get pre-configured agent options for the DPROD catalog agent.

    Args:
        model: Claude model to use ("sonnet", "opus", "haiku")
        system_prompt: Custom system prompt (uses default if not provided)
        additional_tools: Additional tool names to allow beyond catalog tools

    Returns:
        ClaudeAgentOptions configured for the catalog agent.

    Example:
        options = get_agent_options(model="opus")
        async with ClaudeSDKClient(options=options) as client:
            await client.query("What products need attention?")
    """
    server = create_dprod_server()

    allowed_tools = TOOL_NAMES.copy()
    if additional_tools:
        allowed_tools.extend(additional_tools)

    return ClaudeAgentOptions(
        model=model,
        system_prompt=system_prompt or CATALOG_AGENT_PROMPT,
        mcp_servers={"catalog": server},
        allowed_tools=allowed_tools,
    )


# Convenience exports
__all__ = [
    "create_dprod_server",
    "get_agent_options",
    "CATALOG_AGENT_PROMPT",
    "TOOL_NAMES",
    "SERVER_NAME",
    "SERVER_VERSION",
]
