# Backup and Restore Runbook

This document covers backup and restore procedures for the DPROD catalog.

## Backup Strategy

### What to Back Up

| Data | Location | Method |
|------|----------|--------|
| Repository data | GraphDB volume | Export RDF |
| Configuration | `config/` | Git |
| Ontologies | `ontologies/` | Git |
| SHACL shapes | `shapes/` | Git |
| Data products | `data/products/` | Git + Export |
| Vocabularies | `data/vocab/` | Git |

### Backup Types

1. **Git-based** - All TTL files are version controlled
2. **RDF Export** - Full repository dump from GraphDB
3. **Named Graph Export** - Export specific graphs

## Backup Procedures

### Export Full Repository

```bash
# Export entire repository as TriG (includes named graphs)
curl "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Accept: application/trig" \
  -o backup-$(date +%Y%m%d).trig
```

### Export Specific Named Graph

```bash
# Export data products only
curl "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Accept: text/turtle" \
  -o products-backup-$(date +%Y%m%d).ttl
```

### Export as JSON-LD

```bash
curl "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Accept: application/ld+json" \
  -o backup-$(date +%Y%m%d).jsonld
```

### Automated Backup Script

```bash
#!/bin/bash
# backup.sh - Run daily via cron

BACKUP_DIR="/var/backups/dprod"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

# Full export
curl -s "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Accept: application/trig" \
  -o "$BACKUP_DIR/dprod-$DATE.trig"

# Compress
gzip "$BACKUP_DIR/dprod-$DATE.trig"

# Retain last 30 days
find "$BACKUP_DIR" -name "*.trig.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/dprod-$DATE.trig.gz"
```

## Restore Procedures

### Full Restore from Backup

```bash
# 1. Stop and clean existing data
make down
make clean

# 2. Start fresh GraphDB
make up

# 3. Wait for GraphDB to be ready
sleep 30

# 4. Create repository
make create-repo

# 5. Restore from backup
gunzip -c backup-20250101.trig.gz | \
  curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
    -H "Content-Type: application/trig" \
    --data-binary @-

# 6. Verify
make health
```

### Restore from Git (Clean Rebuild)

```bash
# If TTL files are current in Git
make clean
make setup
```

### Restore Specific Named Graph

```bash
# Clear the graph first
curl -X DELETE "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>"

# Restore from backup
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  --data-binary @products-backup.ttl
```

## Disaster Recovery

### Complete System Loss

1. Provision new infrastructure
2. Clone repository from Git
3. Run `make setup`
4. Restore latest RDF backup (if newer than Git)
5. Verify with `make health`

### Corrupted Data

1. Identify affected named graphs
2. Export current state (for analysis)
3. Clear affected graphs
4. Restore from last known good backup
5. Replay any changes from git history

## Backup Schedule Recommendations

| Environment | Frequency | Retention |
|-------------|-----------|-----------|
| Production | Daily | 30 days |
| Staging | Weekly | 14 days |
| Development | On-demand | 7 days |

## Verification

After any restore:

```bash
# Check health
make health

# Verify product count
make query QUERY=validate-count

# Run SHACL validation
make test-shacl
```
