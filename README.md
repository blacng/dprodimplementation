# DPROD Implementation for GraphDB

Implementation of the [Data Product Ontology (DPROD)](https://ekgf.github.io/dprod/) specification using Ontotext GraphDB. DPROD extends W3C DCAT to describe Data Products in decentralized data architectures.

## Quick Start

```bash
# Full setup with sample data
make setup-full

# Access GraphDB Workbench
open http://localhost:7200
```

## Requirements

- Docker & Docker Compose
- curl
- make

## Make Targets

### Core Operations

| Target | Description |
|--------|-------------|
| `make setup` | Start GraphDB, create repo, load ontologies |
| `make setup-full` | Full setup including sample data products |
| `make up` | Start GraphDB container |
| `make down` | Stop GraphDB container |
| `make health` | Verify deployment status |
| `make clean` | Remove volumes and cached files |

### Data Management

| Target | Description |
|--------|-------------|
| `make load-ontologies` | Load PROV-O, DCAT, DPROD ontologies |
| `make load-shapes` | Load SHACL validation shapes |
| `make load-vocab` | Load vocabularies (domains, agents, protocols) |
| `make load-products` | Load sample data products |
| `make list-products` | List all data products in catalog |

### Query Execution

| Target | Description |
|--------|-------------|
| `make query FILE=<path>` | Run a SPARQL query from file |
| `make queries-list` | List all available queries |

### Utilities

| Target | Description |
|--------|-------------|
| `make logs` | View container logs |
| `make shell` | Open shell in container |
| `make help` | Show all available targets |

## Query Library

The `queries/` directory contains ready-to-use SPARQL queries:

### Core Queries
| Query | Description |
|-------|-------------|
| `list-products.rq` | List all data products with details |
| `get-product.rq` | Get complete details for a single product |
| `find-by-domain.rq` | Find products by business domain |
| `find-by-status.rq` | Find products by lifecycle status |
| `find-by-owner.rq` | Find products by owner/team |
| `search.rq` | Full-text search across product metadata |

### Lineage Queries
| Query | Description |
|-------|-------------|
| `lineage-full.rq` | Complete dependency graph |
| `lineage-upstream.rq` | Trace data sources for a product |
| `lineage-downstream.rq` | Trace consumers of a product |

### Analytics Queries
| Query | Description |
|-------|-------------|
| `stats-by-domain.rq` | Product count by domain |
| `stats-by-status.rq` | Product count by lifecycle status |
| `stats-by-owner.rq` | Product count by owner |
| `recent-changes.rq` | Recently modified products |

### Admin Queries
| Query | Description |
|-------|-------------|
| `orphaned-datasets.rq` | Datasets not linked to any product |
| `missing-owners.rq` | Products without an owner |
| `missing-descriptions.rq` | Products without descriptions |
| `products-without-ports.rq` | Products missing input/output ports |
| `stale-products.rq` | Products not recently modified |

### Running Queries

```bash
# Run a query (CSV output by default)
make query FILE=queries/list-products.rq

# Get JSON output
make query FILE=queries/stats-by-domain.rq FORMAT=json

# List all available queries
make queries-list
```

## Project Structure

```
├── config/
│   └── dprod-repo-config.ttl    # GraphDB repository config (SHACL enabled)
├── data/
│   ├── products/                 # Data product definitions
│   │   ├── customer-360.ttl
│   │   ├── sales-analytics.ttl
│   │   ├── hr-workforce.ttl
│   │   ├── finance-reporting.ttl
│   │   └── marketing-campaigns.ttl
│   └── vocab/                    # Supporting vocabularies
│       ├── domains.ttl
│       ├── lifecycle-status.ttl
│       ├── agents.ttl
│       └── protocols.ttl
├── queries/                      # SPARQL query library
│   ├── list-products.rq
│   ├── get-product.rq
│   ├── find-by-*.rq             # Discovery queries
│   ├── lineage-*.rq             # Lineage queries
│   ├── stats-by-*.rq            # Analytics queries
│   └── *.rq                     # Admin queries
├── docker-compose.yml
├── Makefile
└── .env.example
```

## Named Graphs

| Graph URI | Content |
|-----------|---------|
| `urn:ontology:prov` | W3C PROV-O |
| `urn:ontology:dcat` | W3C DCAT v3 |
| `urn:ontology:dprod` | EKGF DPROD |
| `urn:vocab:domains` | Business domains |
| `urn:vocab:lifecycle` | Lifecycle statuses |
| `urn:vocab:agents` | Data product owners |
| `urn:vocab:protocols` | Access protocols |
| `urn:data:products` | Data product instances |

## Sample Data Products

| Product | Domain | Status | Description |
|---------|--------|--------|-------------|
| Customer 360 | Customer Analytics | Consume | Unified customer view |
| Sales Analytics | Sales Operations | Build | Sales performance metrics |
| HR Workforce | Human Resources | Consume | Workforce analytics |
| Finance Reporting | Finance | Consume | Financial statements |
| Marketing Campaigns | Marketing | Consume | Campaign performance |

## SPARQL Examples

### List all data products

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label ?status
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus ?status .
}
```

### Find products by domain

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:domain <https://data.vcondition.com/domains/customer-analytics> .
}
```

### Trace data lineage

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?downstream ?downstreamLabel ?upstream ?upstreamLabel
WHERE {
  ?downstream a dprod:DataProduct ;
              rdfs:label ?downstreamLabel ;
              dprod:inputPort ?port .
  ?upstream a dprod:DataProduct ;
            rdfs:label ?upstreamLabel ;
            dprod:outputPort ?port .
}
```

## Configuration

Copy `.env.example` to `.env` and customize:

```bash
GRAPHDB_HEAP_SIZE=2g
GRAPHDB_ENABLE_AUTH=false
BASE_NAMESPACE=https://data.vcondition.com/
```

## References

- [DPROD Specification](https://ekgf.github.io/dprod/)
- [W3C DCAT v3](https://www.w3.org/TR/vocab-dcat-3/)
- [GraphDB Documentation](https://graphdb.ontotext.com/documentation/)
- [SHACL Specification](https://www.w3.org/TR/shacl/)
