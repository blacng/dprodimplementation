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

### Utilities

| Target | Description |
|--------|-------------|
| `make logs` | View container logs |
| `make shell` | Open shell in container |
| `make help` | Show all available targets |

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
