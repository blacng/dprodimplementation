"""Data models for DPROD client."""

from dataclasses import dataclass
from datetime import date


@dataclass
class DataProductSummary:
    """Summary of a data product for list views."""

    uri: str
    label: str
    description: str | None = None
    owner_uri: str | None = None
    owner_label: str | None = None
    domain_uri: str | None = None
    domain_label: str | None = None
    status_uri: str | None = None
    created: date | None = None
    modified: date | None = None


@dataclass
class DataProduct:
    """Full data product with all properties."""

    uri: str
    label: str
    description: str | None = None
    owner_uri: str | None = None
    domain_uri: str | None = None
    status_uri: str | None = None
    created: date | None = None
    modified: date | None = None
    output_ports: list[str] | None = None
    input_ports: list[str] | None = None
    raw_rdf: str | None = None


@dataclass
class LineageEntry:
    """A lineage relationship to another data product."""

    product_uri: str
    product_label: str
    status_uri: str | None = None
    port_uri: str | None = None
    port_label: str | None = None


@dataclass
class DomainStats:
    """Statistics for a domain."""

    domain_uri: str
    domain_label: str
    product_count: int


@dataclass
class StatusStats:
    """Statistics for a lifecycle status."""

    status_uri: str
    status_label: str | None
    product_count: int


@dataclass
class SearchResult:
    """A search result with match information."""

    uri: str
    label: str
    description: str | None = None
    status_uri: str | None = None
    matched_field: str | None = None
