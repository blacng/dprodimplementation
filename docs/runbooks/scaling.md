# Scaling Runbook

This document covers scaling procedures for the DPROD catalog.

## Current Architecture

```
┌─────────────────┐
│   Clients       │
└────────┬────────┘
         │
┌────────▼────────┐
│   GraphDB       │  Single instance
│   (Docker)      │  Default: 2GB heap
└────────┬────────┘
         │
┌────────▼────────┐
│   Volume        │  Persistent storage
│   (graphdb-data)│
└─────────────────┘
```

## Vertical Scaling (Scale Up)

### Increase Memory

Edit `docker-compose.yml`:

```yaml
services:
  graphdb:
    environment:
      - GDB_HEAP_SIZE=4g  # Increase from default
    deploy:
      resources:
        limits:
          memory: 6g
```

Apply:
```bash
make down && make up
```

### Memory Guidelines

| Data Size | Recommended Heap | Container Memory |
|-----------|------------------|------------------|
| < 10M triples | 2GB | 3GB |
| 10-50M triples | 4GB | 6GB |
| 50-100M triples | 8GB | 12GB |
| > 100M triples | 16GB+ | 24GB+ |

### Increase CPU

```yaml
services:
  graphdb:
    deploy:
      resources:
        limits:
          cpus: '4'  # Increase CPU allocation
```

## Horizontal Scaling

### GraphDB Cluster (Enterprise)

GraphDB Enterprise supports clustering for high availability:

```
┌─────────────┐  ┌─────────────┐  ┌─────────────┐
│   Master    │  │   Worker 1  │  │   Worker 2  │
└─────────────┘  └─────────────┘  └─────────────┘
```

> Note: Requires GraphDB Enterprise license.

### Read Replicas Pattern

For read-heavy workloads:

1. Primary instance handles writes
2. Read replicas handle queries
3. Periodic sync via RDF export/import

## Query Optimization

Before scaling, optimize:

### Add Indexes

```sparql
# Example: Add index for frequent property
PREFIX sys: <http://www.ontotext.com/owlim/system#>
INSERT DATA {
  _:idx sys:addIndex "dprod:lifecycleStatus" .
}
```

### Query Patterns

- Use `LIMIT` for large result sets
- Avoid `SELECT *` - specify needed variables
- Use `FILTER` early in query patterns
- Consider materialized views for complex aggregations

## Load Testing

### Baseline Performance

```bash
# Measure query time
time make query QUERY=list-products

# Run multiple concurrent queries
for i in {1..10}; do
  make query QUERY=list-products &
done
wait
```

### Stress Testing

```bash
# Install hey (HTTP load generator)
# brew install hey

# Test query endpoint
hey -n 1000 -c 50 \
  -H "Accept: application/sparql-results+json" \
  "http://localhost:7200/repositories/dprod-catalog?query=SELECT%20*%20WHERE%20%7B%20%3Fs%20a%20%3Chttp%3A%2F%2Fexample.org%2FDataProduct%3E%20%7D%20LIMIT%2010"
```

## Capacity Planning

### Metrics to Monitor

| Metric | Warning | Critical |
|--------|---------|----------|
| Heap usage | > 70% | > 90% |
| Query latency (p95) | > 500ms | > 2s |
| Disk usage | > 70% | > 90% |
| Error rate | > 1% | > 5% |

### Growth Estimation

```
Current triples: X
Monthly growth: Y triples
Months until capacity: (Max - X) / Y
```

## Scaling Checklist

### Before Scaling

- [ ] Document current baseline performance
- [ ] Identify bottleneck (CPU, memory, disk, network)
- [ ] Review query patterns for optimization
- [ ] Plan maintenance window

### After Scaling

- [ ] Verify health check passes
- [ ] Compare performance to baseline
- [ ] Update monitoring thresholds
- [ ] Document new configuration

## Emergency Scaling

If service is degraded:

1. **Immediate**: Kill expensive queries
   ```bash
   curl -X DELETE "http://localhost:7200/rest/monitor/query/{id}"
   ```

2. **Short-term**: Increase resources
   ```bash
   # Quick memory increase
   docker update --memory=8g graphdb
   ```

3. **Medium-term**: Proper scaling per this runbook
