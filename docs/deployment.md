# DPROD Catalog Deployment Guide

This document provides comprehensive deployment instructions for the DPROD Data Product Catalog system.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        Load Balancer                            │
└─────────────────────────┬───────────────────────────────────────┘
                          │
          ┌───────────────┼───────────────┐
          ▼               ▼               ▼
┌─────────────────┐ ┌───────────┐ ┌─────────────────┐
│    Frontend     │ │  Backend  │ │    GraphDB      │
│  (Vite/React)   │ │ (FastAPI) │ │  (RDF Store)    │
│   Port: 5173    │ │ Port: 8000│ │   Port: 7200    │
└─────────────────┘ └───────────┘ └─────────────────┘
```

## Prerequisites

### System Requirements

| Component | Minimum | Recommended |
|-----------|---------|-------------|
| CPU | 2 cores | 4+ cores |
| RAM | 4 GB | 8+ GB |
| Disk | 10 GB | 50+ GB SSD |
| Docker | 24.0+ | Latest |
| Node.js | 18.x | 20.x LTS |
| Python | 3.11+ | 3.12+ |
| uv | 0.4+ | Latest |

### Required Software

```bash
# Docker & Docker Compose
docker --version
docker compose version

# Node.js & npm
node --version
npm --version

# Python & uv
python --version
uv --version
```

## Environment Configuration

### 1. Create Environment File

Copy the example environment file and configure:

```bash
cp .env.example .env
```

### 2. Environment Variables

```bash
# GraphDB Configuration
GRAPHDB_VERSION=10.8.0
GRAPHDB_PORT=7200
GRAPHDB_JAVA_OPTS=-Xmx4g -Xms2g
GRAPHDB_HEAP_SIZE=4g
GRAPHDB_REPOSITORY=dprod-catalog

# Backend Configuration
BACKEND_PORT=8000
BACKEND_HOST=0.0.0.0
GRAPHDB_URL=http://localhost:7200

# Frontend Configuration
VITE_API_URL=http://localhost:8000
VITE_WS_URL=ws://localhost:8000

# Production Settings
NODE_ENV=production
LOG_LEVEL=info
```

## Deployment Options

### Option 1: Local Development

Quick start for local development:

```bash
# Full setup (GraphDB + ontologies + sample data)
make setup

# Or step-by-step:
make up                    # Start GraphDB container
make wait-for-graphdb      # Wait for GraphDB to be ready
make create-repository     # Create DPROD repository
make load-ontologies       # Load DPROD/DCAT/PROV ontologies
make load-shapes           # Load SHACL validation shapes
make load-vocab            # Load supporting vocabularies
make load-products         # Load sample data products

# Start backend server
uv run uvicorn src.dprod.api.main:app --reload --host 0.0.0.0 --port 8000

# Start frontend (in separate terminal)
cd frontend && npm run dev
```

### Option 2: Docker Compose (Recommended for Production)

```bash
# Start all services
docker compose up -d

# View logs
docker compose logs -f

# Stop services
docker compose down
```

### Option 3: Kubernetes Deployment

For Kubernetes deployment, use the provided manifests:

```bash
# Apply configurations
kubectl apply -f k8s/namespace.yaml
kubectl apply -f k8s/graphdb/
kubectl apply -f k8s/backend/
kubectl apply -f k8s/frontend/

# Verify deployment
kubectl get pods -n dprod-catalog
```

## Component Deployment Details

### GraphDB Setup

GraphDB is the core RDF triple store.

```bash
# Start GraphDB container
docker compose up -d graphdb

# Health check
curl http://localhost:7200/rest/repositories

# Create repository (if not using make setup)
curl -X POST http://localhost:7200/rest/repositories \
  -H "Content-Type: multipart/form-data" \
  -F "config=@config/dprod-repo-config.ttl"
```

**GraphDB Configuration (`config/dprod-repo-config.ttl`):**
- SHACL validation enabled
- Full-text search enabled
- OWL-Horst-Optimized ruleset

### Backend Deployment

FastAPI backend server:

```bash
# Install dependencies
uv sync

# Development server (with auto-reload)
uv run uvicorn src.dprod.api.main:app --reload --host 0.0.0.0 --port 8000

# Production server (with workers)
uv run uvicorn src.dprod.api.main:app --host 0.0.0.0 --port 8000 --workers 4

# Or using the CLI entry point
uv run python -m src.dprod.api.main
```

**Production Configuration:**
```bash
# Use gunicorn for production
uv run gunicorn src.dprod.api.main:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8000 \
  --access-logfile - \
  --error-logfile -
```

### Frontend Deployment

#### Development Build

```bash
cd frontend
npm install
npm run dev
```

#### Production Build

```bash
cd frontend
npm install
npm run build
npm run preview  # Test production build locally
```

#### Vercel Deployment

The frontend is configured for Vercel deployment:

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

**Vercel Configuration (`frontend/vercel.json`):**
```json
{
  "rewrites": [
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```

## CORS Configuration

The backend allows requests from these origins by default:

```python
origins = [
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:8080",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:5174",
]
```

For production, configure `cors_origins` parameter in `create_app()`.

## Data Loading

### Initial Data Load

```bash
# Load all data (ontologies, shapes, vocabularies, products)
make load-all

# Or load individually:
make load-ontologies    # DPROD, DCAT v3, PROV-O
make load-shapes        # SHACL validation shapes
make load-vocab         # Domain and lifecycle vocabularies
make load-products      # Sample data products
```

### Named Graph Organization

| Graph | Content |
|-------|---------|
| `urn:ontology:dprod` | DPROD ontology |
| `urn:ontology:dcat` | DCAT v3 ontology |
| `urn:ontology:prov` | PROV-O ontology |
| `http://rdf4j.org/schema/rdf4j#SHACLShapeGraph` | SHACL shapes |
| `urn:vocab:domains` | Domain vocabulary |
| `urn:vocab:lifecycle` | Lifecycle stages |
| `urn:data:products` | Data product instances |

### Validate Data

```bash
# Run SHACL validation
make validate

# Check with test data
make test-valid      # Should pass
make test-invalid    # Should fail (expected)
```

## Health Checks

### Service Health Endpoints

| Service | Endpoint | Expected |
|---------|----------|----------|
| Backend API | `GET /api/v1/health` | `{"status": "healthy"}` |
| GraphDB | `GET /rest/repositories` | Repository list |
| Frontend | `GET /` | HTML page |

### Health Check Script

```bash
#!/bin/bash
# health-check.sh

# Check GraphDB
if curl -s http://localhost:7200/rest/repositories | grep -q "dprod-catalog"; then
    echo "✓ GraphDB: healthy"
else
    echo "✗ GraphDB: unhealthy"
    exit 1
fi

# Check Backend
if curl -s http://localhost:8000/api/v1/health | grep -q "healthy"; then
    echo "✓ Backend: healthy"
else
    echo "✗ Backend: unhealthy"
    exit 1
fi

# Check Frontend
if curl -s http://localhost:5173 | grep -q "html"; then
    echo "✓ Frontend: healthy"
else
    echo "✗ Frontend: unhealthy"
    exit 1
fi

echo "All services healthy!"
```

## Monitoring & Observability

### Logging

Backend logs use standard Python logging:

```bash
# View backend logs
docker compose logs -f backend

# View GraphDB logs
docker compose logs -f graphdb
make logs  # Alternative
```

### Metrics

GraphDB exposes Prometheus metrics at `/rest/monitor/cluster`:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'graphdb'
    static_configs:
      - targets: ['localhost:7200']
    metrics_path: /rest/monitor/cluster
```

### Grafana Dashboards

Import the provided dashboard:

```bash
# Start monitoring stack
docker compose -f docker-compose.monitoring.yml up -d
```

## Backup & Recovery

### Database Backup

```bash
# Export repository
curl -X GET "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Accept: application/n-quads" \
  > backup-$(date +%Y%m%d).nq

# Or use GraphDB Workbench export
```

### Database Restore

```bash
# Clear and reload
make clean-data
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/n-quads" \
  --data-binary @backup.nq
```

### Automated Backups

```bash
# Add to crontab
0 2 * * * /path/to/backup-script.sh
```

## CI/CD Pipeline

### GitHub Actions Workflows

**Validation (`validate.yml`):**
- Runs on push/PR to main
- Lints Python code with Ruff
- Type checks with pyright
- Runs pytest suite
- Validates SHACL shapes

**Deployment (`deploy.yml`):**
- Triggered on release tags
- Builds Docker images
- Pushes to container registry
- Deploys to production

### Manual Deployment

```bash
# Build and tag
docker build -t dprod-backend:latest -f Dockerfile.backend .
docker build -t dprod-frontend:latest -f Dockerfile.frontend ./frontend

# Push to registry
docker push registry.example.com/dprod-backend:latest
docker push registry.example.com/dprod-frontend:latest
```

## Troubleshooting

### Common Issues

#### GraphDB Won't Start

```bash
# Check Docker resources
docker system df
docker system prune -a

# Increase memory allocation
export GRAPHDB_JAVA_OPTS="-Xmx4g -Xms2g"
docker compose up -d graphdb
```

#### CORS Errors

Check that your frontend origin is in the allowed list in `src/dprod/api/main.py`.

#### Port Already in Use

```bash
# Find and kill process on port 8000
lsof -ti:8000 | xargs kill -9

# Or use different port
uv run uvicorn src.dprod.api.main:app --port 8001
```

#### SHACL Validation Errors

```bash
# Check validation report
curl "http://localhost:7200/repositories/dprod-catalog" \
  -H "Accept: application/json" \
  --data-urlencode "query=SELECT * WHERE { ?s a sh:ValidationReport }"
```

### Debug Mode

```bash
# Backend debug mode
LOG_LEVEL=debug uv run uvicorn src.dprod.api.main:app --reload

# GraphDB debug logs
docker compose logs -f graphdb 2>&1 | grep -i error
```

## Security Considerations

### Production Checklist

- [ ] Change default GraphDB credentials
- [ ] Enable HTTPS/TLS for all services
- [ ] Configure firewall rules
- [ ] Set up authentication for API endpoints
- [ ] Enable rate limiting
- [ ] Configure CORS for production domains only
- [ ] Set secure cookie flags
- [ ] Enable audit logging

### Network Security

```bash
# Restrict GraphDB to internal network
docker compose -f docker-compose.prod.yml up -d
```

## Scaling

### Horizontal Scaling

```yaml
# docker-compose.scale.yml
services:
  backend:
    deploy:
      replicas: 3
```

### GraphDB Cluster

For high availability, configure GraphDB Enterprise cluster:

```bash
# See GraphDB documentation for cluster setup
# https://graphdb.ontotext.com/documentation/
```

## Quick Reference

### Makefile Commands

| Command | Description |
|---------|-------------|
| `make setup` | Full initial setup |
| `make up` | Start GraphDB |
| `make down` | Stop GraphDB |
| `make health` | Check all services |
| `make load-all` | Load all data |
| `make clean` | Remove all data |
| `make logs` | View GraphDB logs |
| `make validate` | Run SHACL validation |

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/health` | GET | Health check |
| `/api/v1/products` | GET | List products |
| `/api/v1/products/{uri}` | GET | Product detail |
| `/api/v1/lineage/{uri}` | GET | Product lineage |
| `/api/v1/quality` | GET | Quality metrics |
| `/ws/chat` | WebSocket | AI chat |

### Default Ports

| Service | Port |
|---------|------|
| Frontend | 5173 |
| Backend API | 8000 |
| GraphDB | 7200 |
| GraphDB Workbench | 7200 |
