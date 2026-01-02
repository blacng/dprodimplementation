# Incident Response Runbook

This document covers incident response procedures for the DPROD catalog.

## Severity Levels

| Level | Description | Response Time | Examples |
|-------|-------------|---------------|----------|
| **P1 - Critical** | Service completely down | 15 minutes | GraphDB unreachable, data loss |
| **P2 - High** | Major functionality impaired | 1 hour | Queries failing, validation broken |
| **P3 - Medium** | Minor functionality impaired | 4 hours | Slow queries, intermittent errors |
| **P4 - Low** | Cosmetic or minor issues | 24 hours | Documentation errors, warnings |

## Incident Response Steps

### 1. Detect

Indicators of an incident:
- Health check failures (`make health` returns error)
- Monitoring alerts (if configured)
- User reports

### 2. Assess

```bash
# Check if GraphDB is running
docker ps | grep graphdb

# Check GraphDB logs
make logs

# Check repository status
curl -s http://localhost:7200/rest/repositories

# Test basic query
make query QUERY=validate-count
```

### 3. Communicate

- Update status page (if applicable)
- Notify stakeholders for P1/P2
- Create incident ticket

### 4. Mitigate

See specific runbooks below.

### 5. Resolve & Document

- Implement fix
- Verify resolution
- Document root cause
- Update runbooks if needed

## Common Incidents

### GraphDB Container Down

**Symptoms**: Connection refused, health check fails

**Diagnosis**:
```bash
docker ps -a | grep graphdb
docker logs graphdb --tail 100
```

**Resolution**:
```bash
# Restart container
make down && make up

# If persistent, check disk space
df -h

# Check for OOM
dmesg | grep -i "out of memory"
```

### Query Timeouts

**Symptoms**: Queries hang or timeout

**Diagnosis**:
```bash
# Check active queries
curl http://localhost:7200/rest/monitor/query

# Check system resources
docker stats graphdb
```

**Resolution**:
```bash
# Kill long-running queries
curl -X DELETE "http://localhost:7200/rest/monitor/query/{query-id}"

# If persistent, increase timeout or optimize query
```

### SHACL Validation Failures

**Symptoms**: Data products failing validation unexpectedly

**Diagnosis**:
```bash
# Check SHACL shapes are loaded
curl "http://localhost:7200/repositories/dprod-catalog/statements?context=<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>" \
  -H "Accept: text/turtle"

# Run validation with details
make test-shacl
```

**Resolution**:
```bash
# Reload shapes
make load-shapes

# If shapes changed, reload all
make setup
```

### Data Corruption

**Symptoms**: Unexpected query results, missing data

**Diagnosis**:
```bash
# Check graph sizes
curl http://localhost:7200/repositories/dprod-catalog/size

# Compare with expected count
make query QUERY=validate-count
```

**Resolution**:
```bash
# Restore from backup (see backup-restore.md)
# Or rebuild from Git
make clean && make setup
```

### Out of Memory

**Symptoms**: GraphDB crashes, container restarts

**Diagnosis**:
```bash
docker logs graphdb | grep -i "memory\|heap\|oom"
docker stats graphdb
```

**Resolution**:
```bash
# Increase memory in docker-compose.yml
# environment:
#   - GDB_HEAP_SIZE=4g

# Restart
make down && make up
```

## Escalation Matrix

| Issue Type | First Responder | Escalation |
|------------|-----------------|------------|
| Infrastructure | Platform team | Cloud provider |
| Data issues | Data team | Data governance |
| Security | Security team | CISO |
| Application | Development | Tech lead |

## Post-Incident

### Required Documentation

- Incident timeline
- Root cause analysis
- Resolution steps taken
- Prevention measures

### Review Checklist

- [ ] Incident ticket updated
- [ ] Runbooks updated if needed
- [ ] Monitoring improved if gap found
- [ ] Stakeholders notified of resolution
