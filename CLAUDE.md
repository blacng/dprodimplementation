# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project implements the **DPROD (Data Product Ontology)** specification using Ontotext GraphDB. DPROD extends W3C DCAT (Data Catalog Vocabulary) to describe Data Products in decentralized data architectures.

The system is a **full-stack data product catalog** with:
- **GraphDB** (RDF triple store with SHACL validation)
- **Python FastAPI** REST API with WebSocket chat
- **React + TypeScript** frontend (Vite, Tailwind CSS)
- **Docker Compose** for dev and production environments
- **Prometheus + Grafana** optional monitoring

Key specifications are in `.claude/docs/`:
- `spec.md` - Complete technical specification for GraphDB configuration, SHACL validation, SPARQL queries, and API patterns
- `plan.md` - Implementation phases and project structure
- `requirements.md` - Technical requirements

## Important: Planning Before Development

**Always update `.claude/docs/plan.md` before starting any new feature development.** This ensures:
- Features are properly designed and documented
- Implementation phases are tracked
- Dependencies and acceptance criteria are defined
- The project maintains a clear development roadmap

## Development Commands

```bash
# Python environment (uses uv)
uv sync                    # Install dependencies
uv run python main.py      # Run main script
uv run pytest              # Run tests
uv run ruff check .        # Lint
uv run ruff format .       # Format

# GraphDB management (Docker)
make setup                 # Start GraphDB, create repo, load ontologies & shapes
make setup-full            # Full setup + vocabularies + sample data products
make up                    # Start GraphDB container
make down                  # Stop GraphDB container
make health                # Verify deployment status
make logs                  # View container logs
make clean                 # Remove volumes and cached files

# Web application
make api                   # Start FastAPI server (port 8000)
make frontend              # Start React dev server (port 5173)
make frontend-build        # Build React for production
make frontend-install      # Install frontend dependencies
make dev                   # Show instructions for running both

# Data operations
make load-ontologies       # Load PROV-O, DCAT, DPROD ontologies
make load-shapes           # Load SHACL validation shapes
make load-vocab            # Load vocabularies (domains, agents, protocols, lifecycle, security)
make load-products         # Load sample data products
make list-products         # List all data products in catalog
make query FILE=<path>     # Run a SPARQL query file

# Validation testing
make test                  # Run all validation tests
make test-valid            # Test valid examples pass SHACL
make test-invalid          # Test invalid examples fail SHACL

# Production deployment
make prod-setup            # Build, start, and initialize production stack
make prod-up               # Start production stack
make prod-down             # Stop production stack
make prod-health           # Check production health
make prod-logs             # View production logs
make prod-monitoring       # Start with Prometheus + Grafana
make prod-clean            # Stop and remove volumes
```

## Architecture

### Directory Structure

```
config/                    # GraphDB repository configuration (dprod-repo-config.ttl)
ontologies/                # DPROD, DCAT, PROV-O ontology files (.ttl) + SHACL shapes
shapes/                    # Custom SHACL validation shapes
data/
  products/                # Sample data product definitions (.ttl)
  vocab/                   # Supporting vocabularies (domains, lifecycle, agents, protocols, security)
queries/                   # 20 reusable SPARQL queries (.rq)
src/dprod/                 # Python backend
  client.py                #   DPRODClient - GraphDB SPARQL interface
  models.py                #   Data models (DataProduct, LineageEntry, etc.)
  mcp_server.py            #   MCP server for Claude integration
  tools.py                 #   Tools exported to Claude MCP
  api/
    main.py                #   FastAPI application factory
    routes/                #   REST endpoints (products, lineage, quality, chat)
    schemas/               #   Pydantic request/response models
frontend/                  # React + TypeScript (Vite)
  src/
    pages/                 #   DashboardPage, CatalogPage, ProductDetailPage, LineagePage, QualityPage, RegisterPage
    components/            #   Layout, Sidebar, ChatPanel
monitoring/                # Prometheus + Grafana configuration
docs/                      # API docs, runbooks, onboarding, governance
tests/
  test_client.py           # Python client tests
  valid/                   # Valid test data for SHACL validation
  invalid/                 # Invalid test data (expected to fail)
scripts/                   # Deployment and utility scripts
```

### Key Technologies

| Layer | Technology |
|-------|-----------|
| Triple Store | GraphDB 10.8.0 |
| Backend | Python 3.11+, FastAPI 0.109+, Uvicorn |
| Frontend | React 19, TypeScript, Vite 7, Tailwind CSS 4, React Router 7, TanStack Query, XYFlow |
| Infrastructure | Docker Compose, Nginx (prod frontend) |
| Monitoring | Prometheus 2.51, Grafana 10.4 (optional) |
| CI/CD | GitHub Actions (validate.yml, deploy.yml) |
| Deployment | Render.com (API), Vercel (frontend) |

### Named Graphs

- `urn:ontology:prov` / `urn:ontology:dcat` / `urn:ontology:dprod` - Ontologies
- `http://rdf4j.org/schema/rdf4j#SHACLShapeGraph` - SHACL shapes
- `urn:vocab:*` - Vocabularies (domains, lifecycle, agents, protocols, security)
- `urn:data:products` - Data product instances

### Important Prefixes

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX sh: <http://www.w3.org/ns/shacl#>
```

## API Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/products` | List products (filters: domain, status, owner) |
| GET | `/api/v1/products/search` | Search products |
| GET | `/api/v1/products/{uri}` | Get product details |
| POST | `/api/v1/products` | Create product |
| PUT | `/api/v1/products/{uri}` | Update product |
| DELETE | `/api/v1/products/{uri}` | Delete product |
| GET | `/api/v1/lineage/{uri}` | Get data lineage |
| GET | `/api/v1/quality` | Quality metrics |
| GET | `/api/v1/health` | Health check |
| WS | `/ws/chat` | AI chat interface |

## Ports

| Service | Dev Port | Prod Port |
|---------|----------|-----------|
| GraphDB | 7200 | 7200 |
| FastAPI | 8000 | 8000 (internal) |
| React (Vite) | 5173 | 80 (Nginx) |
| Prometheus | - | 9090 |
| Grafana | - | 3000 |

## GraphDB Interaction

Default endpoint: `http://localhost:7200`
Repository: `dprod-catalog`

```bash
# Query
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=SELECT * WHERE { ?s a dprod:DataProduct } LIMIT 10" \
  -H "Accept: application/sparql-results+json"

# Load data to named graph
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  --data-binary @file.ttl
```
