# Service Level Objectives (SLOs)

This document defines the Service Level Indicators (SLIs) and Objectives (SLOs) for the DPROD catalog.

## Service Overview

| Attribute | Value |
|-----------|-------|
| Service Name | DPROD Catalog |
| Owner | Data Platform Team |
| Tier | Tier 2 (Business Critical) |

## SLIs and SLOs

### Availability

| SLI | Measurement | SLO |
|-----|-------------|-----|
| Service Uptime | `up{job="graphdb"}` | 99.9% monthly |
| Health Check Success | Successful `/rest/repositories` calls | 99.9% monthly |

**Calculation**:
```
Availability = (Total minutes - Downtime minutes) / Total minutes * 100
```

### Latency

| SLI | Measurement | SLO |
|-----|-------------|-----|
| Query Latency (p50) | SPARQL SELECT queries | < 100ms |
| Query Latency (p95) | SPARQL SELECT queries | < 500ms |
| Query Latency (p99) | SPARQL SELECT queries | < 2s |

**Excluded**:
- CONSTRUCT queries (may return large datasets)
- Administrative queries
- Bulk data loads

### Error Rate

| SLI | Measurement | SLO |
|-----|-------------|-----|
| Query Error Rate | Failed queries / Total queries | < 0.1% |
| Validation Error Rate | SHACL validation failures | < 1% |

### Throughput

| SLI | Measurement | SLO |
|-----|-------------|-----|
| Query Throughput | Queries per second | > 100 qps |
| Data Load | Triples loaded per minute | > 10,000/min |

## Error Budget

### Monthly Error Budget

| SLO Target | Allowed Downtime |
|------------|------------------|
| 99.9% | 43.2 minutes/month |
| 99.5% | 3.6 hours/month |
| 99.0% | 7.2 hours/month |

### Budget Consumption

Track error budget consumption:

```
Budget Remaining = SLO Target - Current Achievement
```

If error budget is exhausted:
1. Freeze non-critical changes
2. Focus on reliability improvements
3. Increase testing requirements

## Alerting Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Availability | < 99.95% (1h) | < 99.5% (1h) |
| Query Latency p95 | > 500ms | > 2s |
| Error Rate | > 0.5% | > 1% |
| Heap Usage | > 80% | > 95% |

## Measurement Period

- **Real-time**: Displayed on dashboards
- **Daily**: Aggregated for trending
- **Monthly**: Used for SLO compliance reporting

## Exclusions

The following are excluded from SLO calculations:

1. **Planned maintenance** - Announced 24h in advance
2. **External dependencies** - Network issues, cloud provider outages
3. **Load testing** - Intentional stress testing
4. **Development environment** - Only production counts

## Review Cadence

| Review | Frequency | Attendees |
|--------|-----------|-----------|
| SLO Dashboard Review | Daily | On-call |
| SLO Compliance Report | Monthly | Team |
| SLO Target Review | Quarterly | Leadership |

## Reporting

### Monthly SLO Report Template

```
DPROD Catalog - SLO Report - [Month Year]

Availability:
  Target: 99.9%
  Actual: XX.XX%
  Status: [MET/MISSED]

Latency (p95):
  Target: < 500ms
  Actual: XXXms
  Status: [MET/MISSED]

Error Rate:
  Target: < 0.1%
  Actual: X.XX%
  Status: [MET/MISSED]

Incidents:
  - [Date]: [Description] - [Duration]

Error Budget:
  Consumed: XX%
  Remaining: XX minutes

Action Items:
  - [Action item if SLO missed]
```
