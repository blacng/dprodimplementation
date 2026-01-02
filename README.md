# DPROD Implementation for GraphDB

Implementation of the [Data Product Ontology (DPROD)](https://ekgf.github.io/dprod/) specification using Ontotext GraphDB. DPROD extends W3C DCAT to describe Data Products in decentralized data architectures.

Features a full-stack application with:
- **GraphDB Backend** - RDF triple store with SHACL validation
- **Python REST API** - FastAPI service with SPARQL client
- **React Frontend** - Data product catalog with dark-themed dashboard

## :rocket: Quick Start

```bash
# Start GraphDB and load sample data
make setup-full

# Start the API server
uv run python -m uvicorn dprod.api:app --reload --port 8000

# Start the frontend (in another terminal)
cd frontend && npm run dev

# Access the application
open http://localhost:5173      # Frontend
open http://localhost:8000/docs # API Documentation
open http://localhost:7200      # GraphDB Workbench
```

## :clipboard: Requirements

- Docker & Docker Compose
- Python 3.11+ with [uv](https://docs.astral.sh/uv/)
- Node.js 18+
- curl, make

## :gear: Make Targets

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

### Validation Tests

| Target | Description |
|--------|-------------|
| `make test` | Run all validation tests |
| `make test-valid` | Test valid examples pass validation |
| `make test-invalid` | Test invalid examples fail validation |
| `make test-validate-file FILE=<path>` | Validate a single TTL file |

### Utilities

| Target | Description |
|--------|-------------|
| `make logs` | View container logs |
| `make shell` | Open shell in container |
| `make help` | Show all available targets |

## :mag: Query Library

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

## :electric_plug: REST API

The Python FastAPI service exposes DPROD data via REST endpoints.

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check with GraphDB status |
| `/api/v1/products` | GET | List all data products |
| `/api/v1/products` | POST | Create a new data product |
| `/api/v1/products/{uri}` | GET | Get product summary |
| `/api/v1/products/{uri}/detail` | GET | Get full product with nested ports/datasets |
| `/api/v1/products/search?q=` | GET | Search products by keyword |
| `/api/v1/products/domains/` | GET | List domains with product counts |
| `/api/v1/lineage/{uri}` | GET | Get lineage graph for a product |
| `/api/v1/quality` | GET | Get quality report across all products |

### Development

```bash
# Install dependencies
uv sync

# Run API server
uv run python -m uvicorn dprod.api:app --reload --port 8000

# Run tests
uv run pytest

# Lint and format
uv run ruff check .
uv run ruff format .
```

## :desktop_computer: Frontend

React application with TanStack Query, React Router, and Tailwind CSS.

### Pages

| Route | Description |
|-------|-------------|
| `/` | Dashboard - Command center with health status and metrics |
| `/catalog` | Catalog - Browse and search data products |
| `/catalog/:uri` | Product Detail - Full metadata with ports, datasets, distributions |
| `/lineage` | Lineage - Interactive dependency graph visualization |
| `/quality` | Quality - Data quality issues and reports |
| `/register` | Register - Create new data products |

### Development

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev

# Build for production
npm run build

# Type check
npx tsc --noEmit
```

## :file_folder: Project Structure

```
├── config/
│   └── dprod-repo-config.ttl    # GraphDB repository config (SHACL enabled)
├── ontologies/                   # Local ontology copies (version controlled)
│   ├── prov-o.ttl               # W3C PROV-O
│   ├── dcat.ttl                 # W3C DCAT v3
│   ├── dprod.ttl                # EKGF DPROD
│   └── dprod-shapes.ttl         # DPROD SHACL shapes
├── shapes/                       # Custom SHACL validation shapes
│   └── custom-shapes.ttl
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
│       ├── protocols.ttl
│       └── security-types.ttl
├── queries/                      # SPARQL query library
│   ├── list-products.rq
│   ├── get-product.rq
│   ├── find-by-*.rq             # Discovery queries
│   ├── lineage-*.rq             # Lineage queries
│   ├── stats-by-*.rq            # Analytics queries
│   ├── validate-*.rq            # Validation queries
│   └── *.rq                     # Admin queries
├── src/dprod/                    # Python API package
│   ├── api/                     # FastAPI application
│   │   ├── routes/              # API route handlers
│   │   └── schemas/             # Pydantic models
│   └── client.py                # GraphDB SPARQL client
├── frontend/                     # React application
│   ├── src/
│   │   ├── api/                 # API client and types
│   │   ├── components/          # Reusable UI components
│   │   └── pages/               # Route page components
│   └── package.json
├── tests/                        # Validation test suite
│   ├── valid/                   # Valid examples (should pass)
│   └── invalid/                 # Invalid examples (should fail)
├── docker-compose.yml
├── Makefile
└── pyproject.toml
```

## :label: Named Graphs

| Graph URI | Content |
|-----------|---------|
| `urn:ontology:prov` | W3C PROV-O |
| `urn:ontology:dcat` | W3C DCAT v3 |
| `urn:ontology:dprod` | EKGF DPROD |
| `urn:vocab:domains` | Business domains |
| `urn:vocab:lifecycle` | Lifecycle statuses |
| `urn:vocab:agents` | Data product owners |
| `urn:vocab:protocols` | Access protocols |
| `urn:vocab:security` | Security schema types |
| `urn:data:products` | Data product instances |

## :package: Sample Data Products

| Product | Domain | Status | Description |
|---------|--------|--------|-------------|
| Customer 360 | Customer Analytics | Consume | Unified customer view |
| Sales Analytics | Sales Operations | Build | Sales performance metrics |
| HR Workforce | Human Resources | Consume | Workforce analytics |
| Finance Reporting | Finance | Consume | Financial statements |
| Marketing Campaigns | Marketing | Consume | Campaign performance |

## :pencil: SPARQL Examples

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

## :wrench: Configuration

Copy `.env.example` to `.env` and customize:

```bash
GRAPHDB_HEAP_SIZE=2g
GRAPHDB_ENABLE_AUTH=false
BASE_NAMESPACE=https://data.vcondition.com/
```

## :books: References

### Ontologies & Standards
- [DPROD Specification](https://ekgf.github.io/dprod/)
- [W3C DCAT v3](https://www.w3.org/TR/vocab-dcat-3/)
- [SHACL Specification](https://www.w3.org/TR/shacl/)

### Technologies
- [GraphDB Documentation](https://graphdb.ontotext.com/documentation/)
- [FastAPI](https://fastapi.tiangolo.com/)
- [TanStack Query](https://tanstack.com/query/)
- [React Router](https://reactrouter.com/)
- [Tailwind CSS](https://tailwindcss.com/)
