"""DPROD Client for GraphDB SPARQL endpoint."""

from datetime import date
from urllib.parse import quote

import requests

from .models import (
    DataProduct,
    DataProductSummary,
    DomainStats,
    LineageEntry,
    SearchResult,
    StatusStats,
)

PREFIXES = """
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX prov: <http://www.w3.org/ns/prov#>
"""


class DPRODClientError(Exception):
    """Base exception for DPROD client errors."""

    pass


class QueryError(DPRODClientError):
    """Error executing a SPARQL query."""

    pass


class NotFoundError(DPRODClientError):
    """Resource not found."""

    pass


class DPRODClient:
    """Client for interacting with the DPROD catalog in GraphDB."""

    def __init__(
        self,
        base_url: str = "http://localhost:7200",
        repository: str = "dprod-catalog",
        timeout: int = 30,
    ):
        """Initialize the DPROD client.

        Args:
            base_url: GraphDB server URL
            repository: Repository name
            timeout: Request timeout in seconds
        """
        self.base_url = base_url.rstrip("/")
        self.repository = repository
        self.timeout = timeout
        self._session = requests.Session()

    @property
    def query_url(self) -> str:
        """SPARQL query endpoint URL."""
        return f"{self.base_url}/repositories/{self.repository}"

    @property
    def statements_url(self) -> str:
        """Graph Store Protocol endpoint URL."""
        return f"{self.base_url}/repositories/{self.repository}/statements"

    def _query(self, sparql: str, accept: str = "application/sparql-results+json") -> dict:
        """Execute a SPARQL query and return results."""
        response = self._session.get(
            self.query_url,
            params={"query": sparql},
            headers={"Accept": accept},
            timeout=self.timeout,
        )

        if response.status_code == 400:
            raise QueryError(f"Invalid query: {response.text}")
        elif response.status_code == 404:
            raise NotFoundError(f"Repository '{self.repository}' not found")
        elif response.status_code != 200:
            raise DPRODClientError(f"Query failed: {response.status_code} {response.text}")

        return response.json()

    def _construct(self, sparql: str) -> str:
        """Execute a CONSTRUCT query and return Turtle."""
        response = self._session.get(
            self.query_url,
            params={"query": sparql},
            headers={"Accept": "text/turtle"},
            timeout=self.timeout,
        )

        if response.status_code != 200:
            raise DPRODClientError(f"Query failed: {response.status_code}")

        return response.text

    def _update(self, sparql: str) -> None:
        """Execute a SPARQL UPDATE."""
        response = self._session.post(
            self.statements_url,
            data=sparql,
            headers={"Content-Type": "application/sparql-update"},
            timeout=self.timeout,
        )

        if response.status_code not in (200, 204):
            raise DPRODClientError(f"Update failed: {response.status_code} {response.text}")

    def _parse_date(self, value: str | None) -> date | None:
        """Parse an ISO date string."""
        if not value:
            return None
        try:
            return date.fromisoformat(value[:10])
        except (ValueError, TypeError):
            return None

    def _get_value(self, binding: dict, key: str) -> str | None:
        """Extract a value from a SPARQL binding."""
        if key in binding:
            return binding[key].get("value")
        return None

    # -------------------------------------------------------------------------
    # Core Methods
    # -------------------------------------------------------------------------

    def list_products(self) -> list[DataProductSummary]:
        """List all data products in the catalog."""
        query = f"""{PREFIXES}
SELECT ?product ?label ?description ?owner ?ownerLabel ?domain ?domainLabel ?status ?created ?modified
WHERE {{
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:dataProductOwner ?owner ;
           dprod:lifecycleStatus ?status .

  OPTIONAL {{ ?product dct:description ?description }}
  OPTIONAL {{ ?product dprod:domain ?domain }}
  OPTIONAL {{ ?product dct:created ?created }}
  OPTIONAL {{ ?product dct:modified ?modified }}
  OPTIONAL {{ ?owner rdfs:label ?ownerLabel }}
  OPTIONAL {{ ?domain rdfs:label ?domainLabel }}
}}
ORDER BY ?label
"""
        results = self._query(query)
        products = []

        for binding in results.get("results", {}).get("bindings", []):
            products.append(
                DataProductSummary(
                    uri=self._get_value(binding, "product"),
                    label=self._get_value(binding, "label"),
                    description=self._get_value(binding, "description"),
                    owner_uri=self._get_value(binding, "owner"),
                    owner_label=self._get_value(binding, "ownerLabel"),
                    domain_uri=self._get_value(binding, "domain"),
                    domain_label=self._get_value(binding, "domainLabel"),
                    status_uri=self._get_value(binding, "status"),
                    created=self._parse_date(self._get_value(binding, "created")),
                    modified=self._parse_date(self._get_value(binding, "modified")),
                )
            )

        return products

    def get_product(self, uri: str) -> DataProduct:
        """Get detailed information about a specific data product.

        Args:
            uri: The full URI of the data product

        Returns:
            DataProduct with full details

        Raises:
            NotFoundError: If the product doesn't exist
        """
        query = f"""{PREFIXES}
SELECT ?label ?description ?owner ?domain ?status ?created ?modified
WHERE {{
  <{uri}> a dprod:DataProduct ;
          rdfs:label ?label .

  OPTIONAL {{ <{uri}> dct:description ?description }}
  OPTIONAL {{ <{uri}> dprod:dataProductOwner ?owner }}
  OPTIONAL {{ <{uri}> dprod:domain ?domain }}
  OPTIONAL {{ <{uri}> dprod:lifecycleStatus ?status }}
  OPTIONAL {{ <{uri}> dct:created ?created }}
  OPTIONAL {{ <{uri}> dct:modified ?modified }}
}}
"""
        results = self._query(query)
        bindings = results.get("results", {}).get("bindings", [])

        if not bindings:
            raise NotFoundError(f"Product not found: {uri}")

        binding = bindings[0]

        # Get ports
        ports_query = f"""{PREFIXES}
SELECT ?outputPort ?inputPort
WHERE {{
  OPTIONAL {{ <{uri}> dprod:outputPort ?outputPort }}
  OPTIONAL {{ <{uri}> dprod:inputPort ?inputPort }}
}}
"""
        ports_results = self._query(ports_query)
        output_ports = set()
        input_ports = set()

        for b in ports_results.get("results", {}).get("bindings", []):
            if "outputPort" in b:
                output_ports.add(b["outputPort"]["value"])
            if "inputPort" in b:
                input_ports.add(b["inputPort"]["value"])

        return DataProduct(
            uri=uri,
            label=self._get_value(binding, "label"),
            description=self._get_value(binding, "description"),
            owner_uri=self._get_value(binding, "owner"),
            domain_uri=self._get_value(binding, "domain"),
            status_uri=self._get_value(binding, "status"),
            created=self._parse_date(self._get_value(binding, "created")),
            modified=self._parse_date(self._get_value(binding, "modified")),
            output_ports=list(output_ports) if output_ports else None,
            input_ports=list(input_ports) if input_ports else None,
        )

    def get_product_rdf(self, uri: str) -> str:
        """Get the full RDF representation of a data product.

        Args:
            uri: The full URI of the data product

        Returns:
            Turtle representation of the product and related resources
        """
        query = f"""{PREFIXES}
CONSTRUCT {{
  <{uri}> ?p ?o .
  ?outputPort ?op ?ov .
  ?inputPort ?ip ?iv .
  ?dataset ?dp ?dv .
}}
WHERE {{
  <{uri}> a dprod:DataProduct ;
          ?p ?o .

  OPTIONAL {{
    <{uri}> dprod:outputPort ?outputPort .
    ?outputPort ?op ?ov .
  }}

  OPTIONAL {{
    <{uri}> dprod:inputPort ?inputPort .
    ?inputPort ?ip ?iv .
  }}

  OPTIONAL {{
    ?outputPort dcat:servesDataset ?dataset .
    ?dataset ?dp ?dv .
  }}
}}
"""
        return self._construct(query)

    def get_product_detail(self, uri: str) -> dict:
        """Get detailed product info with nested port, dataset, and distribution data.

        Args:
            uri: The full URI of the data product

        Returns:
            Dictionary with full nested structure suitable for DataProductDetailResponse

        Raises:
            NotFoundError: If the product doesn't exist
        """
        # Query for product with all nested relationships
        query = f"""{PREFIXES}
SELECT
  ?label ?description ?owner ?ownerLabel ?domain ?domainLabel
  ?status ?statusLabel ?created ?modified
  ?outputPort ?outputPortLabel ?outputPortDesc ?endpointURL ?endpointDesc ?protocol ?protocolLabel
  ?dataset ?datasetLabel ?datasetDesc ?conformsTo
  ?distribution ?distributionLabel ?format ?mediaType
WHERE {{
  <{uri}> a dprod:DataProduct ;
          rdfs:label ?label .

  OPTIONAL {{ <{uri}> dct:description ?description }}
  OPTIONAL {{ <{uri}> dprod:dataProductOwner ?owner . OPTIONAL {{ ?owner rdfs:label ?ownerLabel }} }}
  OPTIONAL {{ <{uri}> dprod:domain ?domain . OPTIONAL {{ ?domain rdfs:label ?domainLabel }} }}
  OPTIONAL {{ <{uri}> dprod:lifecycleStatus ?status . OPTIONAL {{ ?status rdfs:label ?statusLabel }} }}
  OPTIONAL {{ <{uri}> dct:created ?created }}
  OPTIONAL {{ <{uri}> dct:modified ?modified }}

  OPTIONAL {{
    <{uri}> dprod:outputPort ?outputPort .
    ?outputPort a dcat:DataService .
    OPTIONAL {{ ?outputPort rdfs:label ?outputPortLabel }}
    OPTIONAL {{ ?outputPort dct:description ?outputPortDesc }}
    OPTIONAL {{ ?outputPort dcat:endpointURL ?endpointURL }}
    OPTIONAL {{ ?outputPort dcat:endpointDescription ?endpointDesc }}
    OPTIONAL {{ ?outputPort dprod:protocol ?protocol . OPTIONAL {{ ?protocol rdfs:label ?protocolLabel }} }}

    OPTIONAL {{
      ?outputPort dcat:servesDataset ?dataset .
      OPTIONAL {{ ?dataset rdfs:label ?datasetLabel }}
      OPTIONAL {{ ?dataset dct:description ?datasetDesc }}
      OPTIONAL {{ ?dataset dct:conformsTo ?conformsTo }}

      OPTIONAL {{
        ?dataset dcat:distribution ?distribution .
        OPTIONAL {{ ?distribution rdfs:label ?distributionLabel }}
        OPTIONAL {{ ?distribution dct:format ?format }}
        OPTIONAL {{ ?distribution dcat:mediaType ?mediaType }}
      }}
    }}
  }}
}}
"""
        results = self._query(query)
        bindings = results.get("results", {}).get("bindings", [])

        if not bindings:
            raise NotFoundError(f"Product not found: {uri}")

        # Build the base product structure from first binding
        first = bindings[0]
        product = {
            "uri": uri,
            "label": self._get_value(first, "label"),
            "description": self._get_value(first, "description"),
            "owner_uri": self._get_value(first, "owner"),
            "owner_label": self._get_value(first, "ownerLabel"),
            "domain_uri": self._get_value(first, "domain"),
            "domain_label": self._get_value(first, "domainLabel"),
            "status_uri": self._get_value(first, "status"),
            "status_label": self._get_value(first, "statusLabel"),
            "created": self._parse_date(self._get_value(first, "created")),
            "modified": self._parse_date(self._get_value(first, "modified")),
            "output_ports": [],
            "input_ports": [],
        }

        # Build nested structure for output ports
        ports_map: dict[str, dict] = {}
        datasets_map: dict[str, dict] = {}

        for binding in bindings:
            port_uri = self._get_value(binding, "outputPort")
            if not port_uri:
                continue

            # Initialize port if not seen
            if port_uri not in ports_map:
                ports_map[port_uri] = {
                    "uri": port_uri,
                    "label": self._get_value(binding, "outputPortLabel"),
                    "description": self._get_value(binding, "outputPortDesc"),
                    "endpoint_url": self._get_value(binding, "endpointURL"),
                    "endpoint_description": self._get_value(binding, "endpointDesc"),
                    "protocol": self._get_value(binding, "protocol"),
                    "protocol_label": self._get_value(binding, "protocolLabel"),
                    "serves_dataset": None,
                }

            # Handle dataset
            dataset_uri = self._get_value(binding, "dataset")
            if dataset_uri:
                if dataset_uri not in datasets_map:
                    datasets_map[dataset_uri] = {
                        "uri": dataset_uri,
                        "label": self._get_value(binding, "datasetLabel"),
                        "description": self._get_value(binding, "datasetDesc"),
                        "conforms_to": self._get_value(binding, "conformsTo"),
                        "distributions": [],
                    }

                # Handle distribution
                dist_uri = self._get_value(binding, "distribution")
                if dist_uri:
                    # Check if distribution already added
                    existing_dists = [d["uri"] for d in datasets_map[dataset_uri]["distributions"]]
                    if dist_uri not in existing_dists:
                        datasets_map[dataset_uri]["distributions"].append({
                            "uri": dist_uri,
                            "label": self._get_value(binding, "distributionLabel"),
                            "format_uri": self._get_value(binding, "format"),
                            "media_type": self._get_value(binding, "mediaType"),
                        })

                # Link dataset to port
                ports_map[port_uri]["serves_dataset"] = datasets_map[dataset_uri]

        product["output_ports"] = list(ports_map.values())

        # Query input ports separately (they reference other products' output ports)
        input_query = f"""{PREFIXES}
SELECT ?inputPort ?inputPortLabel ?inputPortDesc ?endpointURL ?endpointDesc ?protocol ?protocolLabel
       ?dataset ?datasetLabel ?datasetDesc ?conformsTo
       ?distribution ?distributionLabel ?format ?mediaType
WHERE {{
  <{uri}> dprod:inputPort ?inputPort .
  ?inputPort a dcat:DataService .
  OPTIONAL {{ ?inputPort rdfs:label ?inputPortLabel }}
  OPTIONAL {{ ?inputPort dct:description ?inputPortDesc }}
  OPTIONAL {{ ?inputPort dcat:endpointURL ?endpointURL }}
  OPTIONAL {{ ?inputPort dcat:endpointDescription ?endpointDesc }}
  OPTIONAL {{ ?inputPort dprod:protocol ?protocol . OPTIONAL {{ ?protocol rdfs:label ?protocolLabel }} }}

  OPTIONAL {{
    ?inputPort dcat:servesDataset ?dataset .
    OPTIONAL {{ ?dataset rdfs:label ?datasetLabel }}
    OPTIONAL {{ ?dataset dct:description ?datasetDesc }}
    OPTIONAL {{ ?dataset dct:conformsTo ?conformsTo }}

    OPTIONAL {{
      ?dataset dcat:distribution ?distribution .
      OPTIONAL {{ ?distribution rdfs:label ?distributionLabel }}
      OPTIONAL {{ ?distribution dct:format ?format }}
      OPTIONAL {{ ?distribution dcat:mediaType ?mediaType }}
    }}
  }}
}}
"""
        input_results = self._query(input_query)
        input_bindings = input_results.get("results", {}).get("bindings", [])

        input_ports_map: dict[str, dict] = {}
        input_datasets_map: dict[str, dict] = {}

        for binding in input_bindings:
            port_uri = self._get_value(binding, "inputPort")
            if not port_uri:
                continue

            if port_uri not in input_ports_map:
                input_ports_map[port_uri] = {
                    "uri": port_uri,
                    "label": self._get_value(binding, "inputPortLabel"),
                    "description": self._get_value(binding, "inputPortDesc"),
                    "endpoint_url": self._get_value(binding, "endpointURL"),
                    "endpoint_description": self._get_value(binding, "endpointDesc"),
                    "protocol": self._get_value(binding, "protocol"),
                    "protocol_label": self._get_value(binding, "protocolLabel"),
                    "serves_dataset": None,
                }

            dataset_uri = self._get_value(binding, "dataset")
            if dataset_uri:
                if dataset_uri not in input_datasets_map:
                    input_datasets_map[dataset_uri] = {
                        "uri": dataset_uri,
                        "label": self._get_value(binding, "datasetLabel"),
                        "description": self._get_value(binding, "datasetDesc"),
                        "conforms_to": self._get_value(binding, "conformsTo"),
                        "distributions": [],
                    }

                dist_uri = self._get_value(binding, "distribution")
                if dist_uri:
                    existing_dists = [d["uri"] for d in input_datasets_map[dataset_uri]["distributions"]]
                    if dist_uri not in existing_dists:
                        input_datasets_map[dataset_uri]["distributions"].append({
                            "uri": dist_uri,
                            "label": self._get_value(binding, "distributionLabel"),
                            "format_uri": self._get_value(binding, "format"),
                            "media_type": self._get_value(binding, "mediaType"),
                        })

                input_ports_map[port_uri]["serves_dataset"] = input_datasets_map[dataset_uri]

        product["input_ports"] = list(input_ports_map.values())

        return product

    def search(self, term: str) -> list[SearchResult]:
        """Full-text search across product labels, titles, descriptions, and purposes.

        Args:
            term: Search term (case-insensitive)

        Returns:
            List of matching products with match information
        """
        escaped_term = term.replace('"', '\\"')
        query = f"""{PREFIXES}
SELECT DISTINCT ?product ?label ?description ?status ?matchedField
WHERE {{
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus ?status .

  OPTIONAL {{ ?product dct:description ?description }}

  {{
    ?product rdfs:label ?matchValue .
    FILTER(CONTAINS(LCASE(?matchValue), LCASE("{escaped_term}")))
    BIND("label" AS ?matchedField)
  }}
  UNION
  {{
    ?product dct:title ?matchValue .
    FILTER(CONTAINS(LCASE(?matchValue), LCASE("{escaped_term}")))
    BIND("title" AS ?matchedField)
  }}
  UNION
  {{
    ?product dct:description ?matchValue .
    FILTER(CONTAINS(LCASE(?matchValue), LCASE("{escaped_term}")))
    BIND("description" AS ?matchedField)
  }}
  UNION
  {{
    ?product dprod:purpose ?matchValue .
    FILTER(CONTAINS(LCASE(?matchValue), LCASE("{escaped_term}")))
    BIND("purpose" AS ?matchedField)
  }}
}}
ORDER BY ?label
"""
        results = self._query(query)
        search_results = []

        for binding in results.get("results", {}).get("bindings", []):
            search_results.append(
                SearchResult(
                    uri=self._get_value(binding, "product"),
                    label=self._get_value(binding, "label"),
                    description=self._get_value(binding, "description"),
                    status_uri=self._get_value(binding, "status"),
                    matched_field=self._get_value(binding, "matchedField"),
                )
            )

        return search_results

    # -------------------------------------------------------------------------
    # Filter Methods
    # -------------------------------------------------------------------------

    def find_by_domain(self, domain_uri: str) -> list[DataProductSummary]:
        """Find all data products in a specific domain.

        Args:
            domain_uri: Full URI of the domain

        Returns:
            List of products in that domain
        """
        query = f"""{PREFIXES}
SELECT ?product ?label ?description ?status ?owner ?ownerLabel
WHERE {{
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:domain <{domain_uri}> ;
           dprod:lifecycleStatus ?status ;
           dprod:dataProductOwner ?owner .

  OPTIONAL {{ ?product dct:description ?description }}
  OPTIONAL {{ ?owner rdfs:label ?ownerLabel }}
}}
ORDER BY ?label
"""
        results = self._query(query)
        products = []

        for binding in results.get("results", {}).get("bindings", []):
            products.append(
                DataProductSummary(
                    uri=self._get_value(binding, "product"),
                    label=self._get_value(binding, "label"),
                    description=self._get_value(binding, "description"),
                    owner_uri=self._get_value(binding, "owner"),
                    owner_label=self._get_value(binding, "ownerLabel"),
                    domain_uri=domain_uri,
                    status_uri=self._get_value(binding, "status"),
                )
            )

        return products

    def find_by_status(self, status_uri: str) -> list[DataProductSummary]:
        """Find all data products with a specific lifecycle status.

        Args:
            status_uri: Full URI of the lifecycle status

        Returns:
            List of products with that status
        """
        query = f"""{PREFIXES}
SELECT ?product ?label ?description ?domain ?domainLabel ?owner ?ownerLabel
WHERE {{
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus <{status_uri}> ;
           dprod:dataProductOwner ?owner .

  OPTIONAL {{ ?product dct:description ?description }}
  OPTIONAL {{ ?product dprod:domain ?domain . ?domain rdfs:label ?domainLabel }}
  OPTIONAL {{ ?owner rdfs:label ?ownerLabel }}
}}
ORDER BY ?label
"""
        results = self._query(query)
        products = []

        for binding in results.get("results", {}).get("bindings", []):
            products.append(
                DataProductSummary(
                    uri=self._get_value(binding, "product"),
                    label=self._get_value(binding, "label"),
                    description=self._get_value(binding, "description"),
                    owner_uri=self._get_value(binding, "owner"),
                    owner_label=self._get_value(binding, "ownerLabel"),
                    domain_uri=self._get_value(binding, "domain"),
                    domain_label=self._get_value(binding, "domainLabel"),
                    status_uri=status_uri,
                )
            )

        return products

    def find_by_owner(self, owner_uri: str) -> list[DataProductSummary]:
        """Find all data products owned by a specific team/agent.

        Args:
            owner_uri: Full URI of the owner

        Returns:
            List of products owned by that owner
        """
        query = f"""{PREFIXES}
SELECT ?product ?label ?description ?domain ?domainLabel ?status
WHERE {{
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:dataProductOwner <{owner_uri}> ;
           dprod:lifecycleStatus ?status .

  OPTIONAL {{ ?product dct:description ?description }}
  OPTIONAL {{ ?product dprod:domain ?domain . ?domain rdfs:label ?domainLabel }}
}}
ORDER BY ?label
"""
        results = self._query(query)
        products = []

        for binding in results.get("results", {}).get("bindings", []):
            products.append(
                DataProductSummary(
                    uri=self._get_value(binding, "product"),
                    label=self._get_value(binding, "label"),
                    description=self._get_value(binding, "description"),
                    owner_uri=owner_uri,
                    domain_uri=self._get_value(binding, "domain"),
                    domain_label=self._get_value(binding, "domainLabel"),
                    status_uri=self._get_value(binding, "status"),
                )
            )

        return products

    # -------------------------------------------------------------------------
    # Lineage Methods
    # -------------------------------------------------------------------------

    def get_upstream(self, product_uri: str) -> list[LineageEntry]:
        """Get upstream dependencies (data sources) for a product.

        Args:
            product_uri: Full URI of the data product

        Returns:
            List of upstream products this product consumes from
        """
        query = f"""{PREFIXES}
SELECT ?upstream ?upstreamLabel ?upstreamStatus ?viaPort ?portLabel
WHERE {{
  <{product_uri}> dprod:inputPort ?viaPort .

  ?upstream a dprod:DataProduct ;
            rdfs:label ?upstreamLabel ;
            dprod:outputPort ?viaPort ;
            dprod:lifecycleStatus ?upstreamStatus .

  OPTIONAL {{ ?viaPort rdfs:label ?portLabel }}
}}
ORDER BY ?upstreamLabel
"""
        results = self._query(query)
        lineage = []

        for binding in results.get("results", {}).get("bindings", []):
            lineage.append(
                LineageEntry(
                    product_uri=self._get_value(binding, "upstream"),
                    product_label=self._get_value(binding, "upstreamLabel"),
                    status_uri=self._get_value(binding, "upstreamStatus"),
                    port_uri=self._get_value(binding, "viaPort"),
                    port_label=self._get_value(binding, "portLabel"),
                )
            )

        return lineage

    def get_downstream(self, product_uri: str) -> list[LineageEntry]:
        """Get downstream consumers for a product.

        Args:
            product_uri: Full URI of the data product

        Returns:
            List of downstream products that consume from this product
        """
        query = f"""{PREFIXES}
SELECT ?downstream ?downstreamLabel ?downstreamStatus ?viaPort ?portLabel
WHERE {{
  <{product_uri}> dprod:outputPort ?viaPort .

  ?downstream a dprod:DataProduct ;
              rdfs:label ?downstreamLabel ;
              dprod:inputPort ?viaPort ;
              dprod:lifecycleStatus ?downstreamStatus .

  OPTIONAL {{ ?viaPort rdfs:label ?portLabel }}
}}
ORDER BY ?downstreamLabel
"""
        results = self._query(query)
        lineage = []

        for binding in results.get("results", {}).get("bindings", []):
            lineage.append(
                LineageEntry(
                    product_uri=self._get_value(binding, "downstream"),
                    product_label=self._get_value(binding, "downstreamLabel"),
                    status_uri=self._get_value(binding, "downstreamStatus"),
                    port_uri=self._get_value(binding, "viaPort"),
                    port_label=self._get_value(binding, "portLabel"),
                )
            )

        return lineage

    # -------------------------------------------------------------------------
    # Statistics Methods
    # -------------------------------------------------------------------------

    def stats_by_domain(self) -> list[DomainStats]:
        """Get product counts grouped by domain."""
        query = f"""{PREFIXES}
SELECT ?domain ?domainLabel (COUNT(?product) AS ?productCount)
WHERE {{
  ?product a dprod:DataProduct ;
           dprod:domain ?domain .

  ?domain rdfs:label ?domainLabel .
}}
GROUP BY ?domain ?domainLabel
ORDER BY DESC(?productCount)
"""
        results = self._query(query)
        stats = []

        for binding in results.get("results", {}).get("bindings", []):
            stats.append(
                DomainStats(
                    domain_uri=self._get_value(binding, "domain"),
                    domain_label=self._get_value(binding, "domainLabel"),
                    product_count=int(self._get_value(binding, "productCount") or 0),
                )
            )

        return stats

    def stats_by_status(self) -> list[StatusStats]:
        """Get product counts grouped by lifecycle status."""
        query = f"""{PREFIXES}
SELECT ?status ?statusLabel (COUNT(?product) AS ?productCount)
WHERE {{
  ?product a dprod:DataProduct ;
           dprod:lifecycleStatus ?status .

  OPTIONAL {{ ?status rdfs:label ?statusLabel }}
}}
GROUP BY ?status ?statusLabel
ORDER BY DESC(?productCount)
"""
        results = self._query(query)
        stats = []

        for binding in results.get("results", {}).get("bindings", []):
            stats.append(
                StatusStats(
                    status_uri=self._get_value(binding, "status"),
                    status_label=self._get_value(binding, "statusLabel"),
                    product_count=int(self._get_value(binding, "productCount") or 0),
                )
            )

        return stats

    def count_products(self) -> int:
        """Get total count of data products."""
        query = f"""{PREFIXES}
SELECT (COUNT(?product) AS ?total)
WHERE {{ ?product a dprod:DataProduct }}
"""
        results = self._query(query)
        bindings = results.get("results", {}).get("bindings", [])

        if bindings:
            return int(bindings[0].get("total", {}).get("value", 0))
        return 0

    # -------------------------------------------------------------------------
    # Data Management Methods
    # -------------------------------------------------------------------------

    def create_product(
        self,
        uri: str,
        label: str,
        owner_uri: str,
        status_uri: str,
        description: str | None = None,
        domain_uri: str | None = None,
        graph: str = "urn:data:products",
    ) -> None:
        """Create a new data product.

        Args:
            uri: Full URI for the new product
            label: Display label
            owner_uri: Full URI of the owner
            status_uri: Full URI of the lifecycle status
            description: Optional description
            domain_uri: Optional domain URI
            graph: Named graph to store the product
        """
        triples = [
            f"<{uri}> a dprod:DataProduct",
            f'<{uri}> rdfs:label "{label}"',
            f"<{uri}> dprod:dataProductOwner <{owner_uri}>",
            f"<{uri}> dprod:lifecycleStatus <{status_uri}>",
            f'<{uri}> dct:created "{date.today().isoformat()}"^^xsd:date',
        ]

        if description:
            escaped_desc = description.replace('"', '\\"').replace("\n", "\\n")
            triples.append(f'<{uri}> dct:description "{escaped_desc}"')

        if domain_uri:
            triples.append(f"<{uri}> dprod:domain <{domain_uri}>")

        triples_str = " .\n    ".join(triples)
        query = f"""{PREFIXES}
INSERT DATA {{
  GRAPH <{graph}> {{
    {triples_str} .
  }}
}}
"""
        self._update(query)

    def update_product_status(self, uri: str, new_status_uri: str, graph: str = "urn:data:products") -> None:
        """Update a product's lifecycle status.

        Args:
            uri: Full URI of the product
            new_status_uri: Full URI of the new status
            graph: Named graph containing the product
        """
        query = f"""{PREFIXES}
DELETE {{
  GRAPH <{graph}> {{
    <{uri}> dprod:lifecycleStatus ?oldStatus .
    <{uri}> dct:modified ?oldModified .
  }}
}}
INSERT {{
  GRAPH <{graph}> {{
    <{uri}> dprod:lifecycleStatus <{new_status_uri}> .
    <{uri}> dct:modified "{date.today().isoformat()}"^^xsd:date .
  }}
}}
WHERE {{
  GRAPH <{graph}> {{
    <{uri}> dprod:lifecycleStatus ?oldStatus .
    OPTIONAL {{ <{uri}> dct:modified ?oldModified }}
  }}
}}
"""
        self._update(query)

    def delete_product(self, uri: str, graph: str = "urn:data:products") -> None:
        """Delete a data product.

        Args:
            uri: Full URI of the product to delete
            graph: Named graph containing the product
        """
        query = f"""{PREFIXES}
DELETE WHERE {{
  GRAPH <{graph}> {{
    <{uri}> ?p ?o .
  }}
}}
"""
        self._update(query)

    # -------------------------------------------------------------------------
    # Health Check
    # -------------------------------------------------------------------------

    def health_check(self) -> bool:
        """Check if the GraphDB repository is accessible.

        Returns:
            True if healthy, False otherwise
        """
        try:
            response = self._session.get(
                f"{self.base_url}/repositories/{self.repository}/size",
                timeout=5,
            )
            return response.status_code == 200
        except requests.RequestException:
            return False
