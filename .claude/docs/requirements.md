# DPROD Implementation Requirements

This document captures the requirements and decisions made for the DPROD GraphDB implementation.

## Phase 1: Environment Setup

### Scope
- Phase 1 only (Environment Setup)
- Future phases will include data products, query library, and Python client

### Infrastructure

| Requirement | Decision |
|-------------|----------|
| Deployment Target | Local Docker |
| GraphDB Version | 10.8.0 |
| Base Namespace | `https://data.vcondition.com/` |
| Authentication | Configurable via `.env` (disabled by default) |
| Automation | Makefile |

### Ontology Sources

Ontologies are downloaded from official sources at setup time:

| Ontology | Source URL |
|----------|------------|
| PROV-O | https://www.w3.org/ns/prov-o.ttl |
| DCAT v3 | https://www.w3.org/ns/dcat.ttl |
| DPROD | https://ekgf.github.io/dprod/dprod.ttl |
| DPROD Shapes | https://ekgf.github.io/dprod/dprod-shapes.ttl |

### Named Graphs

| Graph URI | Content |
|-----------|---------|
| `urn:ontology:prov` | W3C PROV-O ontology |
| `urn:ontology:dcat` | W3C DCAT v3 ontology |
| `urn:ontology:dprod` | EKGF DPROD ontology |
| `http://rdf4j.org/schema/rdf4j#SHACLShapeGraph` | SHACL validation shapes |

### Future Phases

| Phase | Planned |
|-------|---------|
| Data Products | All 5 from plan (Customer 360, Sales Analytics, HR Workforce, Finance Reporting, Marketing Campaigns) |
| Client Libraries | Python only |

---

## Quick Start

```bash
# Full setup
make setup

# Or step by step:
make up           # Start GraphDB
make wait         # Wait for ready
make create-repo  # Create repository
make load-ontologies
make load-shapes
make health       # Verify

# Access
open http://localhost:7200
```
