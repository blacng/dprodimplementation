# Daily Operations Runbook

This document covers routine operational tasks for the DPROD catalog.

## Health Checks

### Morning Check (recommended)

```bash
# Verify GraphDB is running
make health

# Check repository size
curl -s "http://localhost:7200/repositories/dprod-catalog/size"

# Verify data product count
make query QUERY=validate-count
```

### Automated Monitoring

If Prometheus/Grafana is configured, check:
- GraphDB uptime dashboard
- Query latency metrics
- Error rate trends

## Common Operations

### List All Data Products

```bash
make query QUERY=list-products
```

### Check for Data Quality Issues

```bash
# Products missing owners
make query QUERY=missing-owners

# Products missing descriptions
make query QUERY=missing-descriptions

# Orphaned datasets
make query QUERY=orphaned-datasets
```

### View Recent Changes

```bash
make query QUERY=recent-changes
```

## Adding New Data Products

### 1. Create TTL File

Create a new file in `data/products/`:

```turtle
@prefix dprod: <https://ekgf.github.io/dprod/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://data.example.com/products/new-product>
    a dprod:DataProduct ;
    rdfs:label "New Product" ;
    dprod:dataProductOwner <https://data.example.com/agents/team> ;
    dprod:lifecycleStatus <https://ekgf.github.io/dprod/data/lifecycle-status/Design> .
```

### 2. Validate Locally

```bash
# Check TTL syntax
rapper -i turtle -c data/products/new-product.ttl

# Run SHACL validation (requires GraphDB running)
make test-shacl
```

### 3. Load to GraphDB

```bash
make load-products
```

## Updating Data Products

### Via Python Client

```python
from src.dprod import DPRODClient

client = DPRODClient()
client.update_product_status(
    uri="https://data.example.com/products/my-product",
    new_status_uri="https://ekgf.github.io/dprod/data/lifecycle-status/Deploy"
)
```

### Via SPARQL Update

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/sparql-update" \
  -d 'DELETE { <uri> dprod:lifecycleStatus ?old }
      INSERT { <uri> dprod:lifecycleStatus <new-status> }
      WHERE { <uri> dprod:lifecycleStatus ?old }'
```

## Log Locations

| Component | Location |
|-----------|----------|
| GraphDB logs | `docker logs graphdb` or `make logs` |
| Application logs | stdout/stderr |

## Escalation

| Issue | Contact |
|-------|---------|
| GraphDB down | Platform team |
| Data quality issues | Data governance team |
| Access issues | Security team |
