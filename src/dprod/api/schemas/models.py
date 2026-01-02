"""Pydantic models for API requests and responses."""

from datetime import date

from pydantic import BaseModel, Field


# Health check
class HealthResponse(BaseModel):
    """Health check response."""

    status: str = Field(description="Health status")
    graphdb_connected: bool = Field(description="Whether GraphDB is accessible")
    repository: str | None = Field(default=None, description="GraphDB repository name")
    product_count: int | None = Field(default=None, description="Number of data products")


# Domain models
class DomainResponse(BaseModel):
    """Domain summary."""

    uri: str = Field(description="Domain URI")
    label: str = Field(description="Domain label")
    product_count: int = Field(default=0, description="Number of products in domain")


# Data Product models
class DataProductSummaryResponse(BaseModel):
    """Summary of a data product for list views."""

    uri: str = Field(description="Product URI")
    label: str = Field(description="Product label")
    description: str | None = Field(default=None, description="Product description")
    owner_uri: str | None = Field(default=None, description="Owner URI")
    owner_label: str | None = Field(default=None, description="Owner display name")
    domain_uri: str | None = Field(default=None, description="Domain URI")
    domain_label: str | None = Field(default=None, description="Domain display name")
    status_uri: str | None = Field(default=None, description="Lifecycle status URI")
    created: date | None = Field(default=None, description="Creation date")
    modified: date | None = Field(default=None, description="Last modified date")


class PortConfig(BaseModel):
    """Configuration for an input or output port."""

    uri: str | None = Field(default=None, description="Port URI (auto-generated if not provided)")
    label: str = Field(description="Port label")
    description: str | None = Field(default=None, description="Port description")
    dataset_uri: str | None = Field(default=None, description="Dataset URI this port connects to")


class DataProductResponse(BaseModel):
    """Full data product with all properties."""

    uri: str = Field(description="Product URI")
    label: str = Field(description="Product label")
    description: str | None = Field(default=None, description="Product description")
    owner_uri: str | None = Field(default=None, description="Owner URI")
    owner_label: str | None = Field(default=None, description="Owner display name")
    domain_uri: str | None = Field(default=None, description="Domain URI")
    domain_label: str | None = Field(default=None, description="Domain display name")
    status_uri: str | None = Field(default=None, description="Lifecycle status URI")
    status_label: str | None = Field(default=None, description="Lifecycle status display name")
    created: date | None = Field(default=None, description="Creation date")
    modified: date | None = Field(default=None, description="Last modified date")
    output_ports: list[str] = Field(default_factory=list, description="Output port URIs")
    input_ports: list[str] = Field(default_factory=list, description="Input port URIs")


class DataProductCreate(BaseModel):
    """Request body for creating a new data product."""

    uri: str | None = Field(default=None, description="Product URI (auto-generated if not provided)")
    label: str = Field(description="Product label", min_length=1)
    description: str = Field(description="Product description", min_length=1)
    owner_uri: str = Field(description="Owner URI")
    domain_uri: str = Field(description="Domain URI")
    status_uri: str | None = Field(
        default="urn:lifecycle:Design",
        description="Lifecycle status URI (defaults to Design)",
    )
    input_ports: list[PortConfig] = Field(
        default_factory=list,
        description="Input port configurations",
    )
    output_ports: list[PortConfig] = Field(
        default_factory=list,
        description="Output port configurations (at least one required)",
        min_length=1,
    )


class SearchRequest(BaseModel):
    """Search request parameters."""

    keyword: str = Field(description="Search keyword", min_length=1)
    domain_uri: str | None = Field(default=None, description="Filter by domain")
    status_uri: str | None = Field(default=None, description="Filter by status")
    owner_uri: str | None = Field(default=None, description="Filter by owner")


# Lineage models
class LineageNodeResponse(BaseModel):
    """A node in the lineage graph."""

    uri: str = Field(description="Product URI")
    label: str = Field(description="Product label")
    status_uri: str | None = Field(default=None, description="Lifecycle status URI")
    domain_uri: str | None = Field(default=None, description="Domain URI")
    is_source: bool = Field(default=False, description="Whether this is the source node")


class LineageEdgeResponse(BaseModel):
    """An edge in the lineage graph."""

    source: str = Field(description="Source product URI")
    target: str = Field(description="Target product URI")
    port_uri: str | None = Field(default=None, description="Port URI")
    port_label: str | None = Field(default=None, description="Port label")


class LineageGraphResponse(BaseModel):
    """Lineage graph for visualization."""

    source_uri: str = Field(description="The product we traced lineage from")
    direction: str = Field(description="Direction of trace: upstream, downstream, or full")
    nodes: list[LineageNodeResponse] = Field(default_factory=list, description="Graph nodes")
    edges: list[LineageEdgeResponse] = Field(default_factory=list, description="Graph edges")


# Quality models
class QualityIssueResponse(BaseModel):
    """A single quality issue."""

    product_uri: str = Field(description="Affected product URI")
    product_label: str = Field(description="Affected product label")
    issue_type: str = Field(description="Type of issue")
    severity: str = Field(description="Severity: high, medium, low")
    description: str = Field(description="Issue description")
    suggestion: str | None = Field(default=None, description="Suggested fix")


class QualityCheckResponse(BaseModel):
    """Results of a single quality check."""

    check_type: str = Field(description="Type of check performed")
    issue_count: int = Field(description="Number of issues found")
    issues: list[QualityIssueResponse] = Field(default_factory=list, description="Issues found")


class QualityReportResponse(BaseModel):
    """Full quality report across all checks."""

    total_products: int = Field(description="Total number of products checked")
    total_issues: int = Field(description="Total number of issues found")
    high_severity_count: int = Field(description="Number of high severity issues")
    medium_severity_count: int = Field(description="Number of medium severity issues")
    low_severity_count: int = Field(description="Number of low severity issues")
    checks: list[QualityCheckResponse] = Field(default_factory=list, description="Individual check results")
