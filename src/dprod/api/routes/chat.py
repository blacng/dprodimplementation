"""WebSocket chat endpoint for Claude agent interaction."""

import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect

router = APIRouter(tags=["chat"])


# Track active connections
class ConnectionManager:
    """Manage WebSocket connections."""

    def __init__(self):
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        """Accept and track a new connection."""
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        """Remove a connection."""
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def send_message(self, websocket: WebSocket, message: dict):
        """Send a JSON message to a client."""
        await websocket.send_json(message)


manager = ConnectionManager()


@router.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    """WebSocket endpoint for chat with the DPROD catalog agent.

    Message format (client -> server):
    {
        "type": "message",
        "content": "What data products exist in the Sales domain?"
    }

    Message format (server -> client):
    {
        "type": "response" | "tool_call" | "error" | "done",
        "content": "...",
        "tool_name": "...",  # Only for tool_call type
        "tool_args": {...}   # Only for tool_call type
    }
    """
    await manager.connect(websocket)

    try:
        # Send welcome message
        await manager.send_message(
            websocket,
            {
                "type": "system",
                "content": "Connected to DPROD Catalog Agent. How can I help you?",
            },
        )

        while True:
            # Receive message from client
            data = await websocket.receive_text()

            try:
                message = json.loads(data)
            except json.JSONDecodeError:
                await manager.send_message(
                    websocket,
                    {"type": "error", "content": "Invalid JSON message"},
                )
                continue

            if message.get("type") != "message":
                await manager.send_message(
                    websocket,
                    {"type": "error", "content": "Unknown message type"},
                )
                continue

            user_content = message.get("content", "").strip()
            if not user_content:
                await manager.send_message(
                    websocket,
                    {"type": "error", "content": "Empty message"},
                )
                continue

            # Process the message with the agent
            try:
                await _process_chat_message(websocket, user_content)
            except Exception as e:
                await manager.send_message(
                    websocket,
                    {"type": "error", "content": f"Agent error: {str(e)}"},
                )

    except WebSocketDisconnect:
        manager.disconnect(websocket)


async def _process_chat_message(websocket: WebSocket, content: str):
    """Process a chat message using the DPROD agent.

    This function attempts to use the Claude Agent SDK if available,
    otherwise falls back to a simple direct response.
    """
    try:
        # Verify agent SDK is available (imports will be used in full implementation)
        import importlib.util

        if importlib.util.find_spec("claude_agent_sdk") is None:
            raise ImportError("claude_agent_sdk not available")

        # For now, we'll use a simplified approach that processes
        # the query directly using our tools
        # Full agent integration requires async Claude API calls

        # Acknowledge message received
        await manager.send_message(
            websocket,
            {"type": "thinking", "content": "Processing your request..."},
        )

        # Simple keyword-based routing to tools
        response = await _simple_query_handler(content)

        await manager.send_message(
            websocket,
            {"type": "response", "content": response},
        )

        await manager.send_message(
            websocket,
            {"type": "done", "content": ""},
        )

    except ImportError:
        # Claude Agent SDK not available, use fallback
        await manager.send_message(
            websocket,
            {
                "type": "response",
                "content": (
                    "The Claude Agent SDK is not installed. "
                    "Install it with: pip install claude-agent-sdk\n\n"
                    "In the meantime, you can use the REST API endpoints directly."
                ),
            },
        )
        await manager.send_message(
            websocket,
            {"type": "done", "content": ""},
        )


async def _simple_query_handler(content: str) -> str:
    """Simple query handler without full agent capabilities.

    This is a fallback that routes common queries to the appropriate tools.
    """
    from ...client import DPRODClient

    client = DPRODClient()
    content_lower = content.lower()

    # List products
    if any(kw in content_lower for kw in ["list", "all products", "show products", "what products"]):
        products = client.list_products()
        if not products:
            return "No data products found in the catalog."

        lines = ["Found {} data products:\n".format(len(products))]
        for p in products[:10]:  # Limit to first 10
            status = p.status_uri.split(":")[-1] if p.status_uri else "Unknown"
            lines.append(f"- **{p.label}** ({status})")
            if p.description:
                lines.append(f"  {p.description[:100]}...")

        if len(products) > 10:
            lines.append(f"\n...and {len(products) - 10} more products")

        return "\n".join(lines)

    # Search
    if "search" in content_lower or "find" in content_lower:
        # Extract search term (simple approach)
        words = content.split()
        search_term = words[-1] if words else ""

        if search_term and search_term.lower() not in ["search", "find", "for"]:
            results = client.search(search_term)
            if not results:
                return f"No products found matching '{search_term}'"

            lines = [f"Found {len(results)} products matching '{search_term}':\n"]
            for r in results[:5]:
                lines.append(f"- **{r.label}**: {r.description or 'No description'}")

            return "\n".join(lines)

    # Quality check
    if any(kw in content_lower for kw in ["quality", "issues", "problems", "check"]):
        # Run basic quality checks
        from .quality import _run_quality_check, CHECK_TYPES

        issues = []
        for check_type in CHECK_TYPES:
            issues.extend(_run_quality_check(client, check_type))

        if not issues:
            return "No quality issues found! The catalog is in good shape."

        high = sum(1 for i in issues if i["severity"] == "high")
        medium = sum(1 for i in issues if i["severity"] == "medium")
        low = sum(1 for i in issues if i["severity"] == "low")

        lines = [
            f"Found {len(issues)} quality issues:\n",
            f"- High severity: {high}",
            f"- Medium severity: {medium}",
            f"- Low severity: {low}",
            "\nTop issues:",
        ]

        for issue in issues[:5]:
            lines.append(f"- [{issue['severity'].upper()}] {issue['product_label']}: {issue['description']}")

        return "\n".join(lines)

    # Default help response
    return """I can help you with the DPROD catalog. Try asking:

- "List all products" - Show all data products
- "Search for customer" - Search products by keyword
- "Check quality" - Run quality checks on the catalog
- "Show lineage for [product]" - View product dependencies

You can also use the web interface for visual exploration."""
