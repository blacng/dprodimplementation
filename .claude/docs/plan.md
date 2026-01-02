# DPROD Implementation Plan

**Status:** In Progress (Phase 7 Planned)
**Last Updated:** January 2025
**Prerequisite:** spec.md (completed)

---

## Overview

This document outlines the logical next steps following the completion of the DPROD product specification (`spec.md`). The plan is organized into phases with clear deliverables, dependencies, and acceptance criteria.

---

## Phase 1: Environment Setup ✓

**Timeline:** Week 1
**Goal:** Establish a working GraphDB environment with DPROD ontologies loaded

### 1.1 Infrastructure Provisioning

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create Docker Compose configuration | `docker-compose.yml` | DevOps | ✓ Complete |
| Configure GraphDB environment variables | `.env` | DevOps | ✓ Complete |
| Set up persistent volume for data | `volumes/graphdb-data` | DevOps | ✓ Complete |
| Configure network and ports | Docker network config | DevOps | ✓ Complete |

### 1.2 Repository Configuration

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create repository config file | `config/dprod-repo-config.ttl` | Data Architect | ✓ Complete |
| Document SHACL settings | Config documentation | Data Architect | ✓ Complete |
| Validate config against spec.md | Test report | QA | ✓ Complete |

### 1.3 Deployment Automation

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create master deployment script | `Makefile (make setup)` | DevOps | ✓ Complete |
| Create ontology loading script | `Makefile (make load-ontologies)` | DevOps | ✓ Complete |
| Create SHACL shapes loading script | `Makefile (make load-shapes)` | DevOps | ✓ Complete |
| Create health check script | `Makefile (make health)` | DevOps | ✓ Complete |

### Acceptance Criteria — Phase 1

- [x] GraphDB accessible at `http://localhost:7200`
- [x] DPROD repository created with SHACL validation enabled
- [x] All ontologies loaded (DCAT, DPROD, PROV-O)
- [x] SHACL shapes loaded and active
- [x] Health check passes

---

## Phase 2: Data Model Validation ✓

**Timeline:** Week 2
**Goal:** Validate the DPROD data model with sample data products

### 2.1 Sample Data Products

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create Customer 360 data product | `data/products/customer-360.ttl` | Data Architect | ✓ Complete |
| Create Sales Analytics data product | `data/products/sales-analytics.ttl` | Data Architect | ✓ Complete |
| Create HR Workforce data product | `data/products/hr-workforce.ttl` | Data Architect | ✓ Complete |
| Create Finance Reporting data product | `data/products/finance-reporting.ttl` | Data Architect | ✓ Complete |
| Create Marketing Campaigns data product | `data/products/marketing-campaigns.ttl` | Data Architect | ✓ Complete |

### 2.2 Supporting Vocabulary

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Define business domains | `data/vocab/domains.ttl` | Business Analyst | ✓ Complete |
| Define lifecycle statuses | `data/vocab/lifecycle-status.ttl` | Data Architect | ✓ Complete |
| Define data owners/agents | `data/vocab/agents.ttl` | Business Analyst | ✓ Complete |
| Define protocols | `data/vocab/protocols.ttl` | Data Architect | ✓ Complete |
| Define security schema types | `data/vocab/security-types.ttl` | Security | ✓ Complete |

### 2.3 SHACL Test Suite

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create valid data product examples | `tests/valid/*.ttl` | QA | ✓ Complete |
| Create invalid examples (missing owner) | `tests/invalid/missing-owner.ttl` | QA | ✓ Complete |
| Create invalid examples (wrong datatype) | `tests/invalid/wrong-type-*.ttl` | QA | ✓ Complete |
| Create invalid examples (missing required) | `tests/invalid/missing-*.ttl` | QA | ✓ Complete |
| Create validation test runner | `Makefile (make test-shacl)` | QA | ✓ Complete |

### Acceptance Criteria — Phase 2

- [x] All 5 sample data products pass SHACL validation
- [x] All invalid test cases correctly fail validation
- [x] Lineage relationships verified between products
- [x] Query patterns from spec.md return expected results

---

## Phase 3: Query Library Development ✓

**Timeline:** Week 3
**Goal:** Build reusable SPARQL query library for catalog operations

### 3.1 Core Queries

| Query | File | Purpose | Status |
|-------|------|---------|--------|
| List all products | `queries/list-products.rq` | Catalog browsing | ✓ Complete |
| Get product details | `queries/get-product.rq` | Product view | ✓ Complete |
| Find by domain | `queries/find-by-domain.rq` | Filtered search | ✓ Complete |
| Find by status | `queries/find-by-status.rq` | Lifecycle filtering | ✓ Complete |
| Find by owner | `queries/find-by-owner.rq` | Ownership lookup | ✓ Complete |
| Full-text search | `queries/search.rq` | Keyword search | ✓ Complete |

### 3.2 Lineage Queries

| Query | File | Purpose | Status |
|-------|------|---------|--------|
| Trace upstream | `queries/lineage-upstream.rq` | Source tracing | ✓ Complete |
| Trace downstream | `queries/lineage-downstream.rq` | Impact analysis | ✓ Complete |
| Full lineage graph | `queries/lineage-full.rq` | Complete lineage | ✓ Complete |

### 3.3 Analytics Queries

| Query | File | Purpose | Status |
|-------|------|---------|--------|
| Products per domain | `queries/stats-by-domain.rq` | Domain metrics | ✓ Complete |
| Products per status | `queries/stats-by-status.rq` | Lifecycle metrics | ✓ Complete |
| Products per owner | `queries/stats-by-owner.rq` | Ownership metrics | ✓ Complete |
| Recently modified | `queries/recent-changes.rq` | Activity tracking | ✓ Complete |

### 3.4 Administrative Queries

| Query | File | Purpose | Status |
|-------|------|---------|--------|
| Orphaned datasets | `queries/orphaned-datasets.rq` | Data quality | ✓ Complete |
| Missing owners | `queries/missing-owners.rq` | Governance | ✓ Complete |
| Stale products | `queries/stale-products.rq` | Maintenance | ✓ Complete |
| Missing descriptions | `queries/missing-descriptions.rq` | Data quality | ✓ Complete |
| Products without ports | `queries/products-without-ports.rq` | Completeness | ✓ Complete |
| Validate product | `queries/validate-product.rq` | Validation | ✓ Complete |

### Acceptance Criteria — Phase 3

- [x] All queries execute successfully against test data
- [x] Query response time < 500ms for all core queries
- [x] Queries documented with examples and expected outputs
- [x] Parameterized queries tested with multiple inputs

---

## Phase 4: API Integration Layer ✓

**Timeline:** Week 4
**Goal:** Create integration patterns for consuming applications

### 4.1 API Documentation

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Document SPARQL endpoints | `docs/api/sparql-endpoints.md` | Developer | ✓ Complete |
| Document Graph Store protocol | `docs/api/graph-store.md` | Developer | ✓ Complete |
| Document REST API patterns | `docs/api/rest-patterns.md` | Developer | ✓ Complete |
| Create Postman collection | `postman/dprod-api.postman_collection.json` | Developer | ✓ Complete |

### 4.2 Client Libraries

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Python client wrapper | `src/dprod/client.py` | Developer | ✓ Complete |
| Python client tests | `tests/test_client.py` | Developer | ✓ Complete |
| JavaScript client wrapper | `clients/js/dprod-client.js` | Developer | ☐ Not Started |

### 4.3 JSON-LD Integration

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create JSON-LD context | `examples/jsonld/dprod-context.jsonld` | Developer | ✓ Complete |
| Create JSON-LD examples | `examples/jsonld/*.jsonld` | Developer | ✓ Complete |
| Document JSON-LD usage | `docs/jsonld-guide.md` | Developer | ☐ Not Started |

### Acceptance Criteria — Phase 4

- [x] Postman collection tested against live GraphDB
- [x] Example integrations working end-to-end
- [x] API documentation reviewed and approved

---

## Phase 5: CI/CD Pipeline ✓

**Timeline:** Week 5
**Goal:** Automate validation and deployment

### 5.1 Continuous Integration

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create GitHub Actions workflow | `.github/workflows/validate.yml` | DevOps | ✓ Complete |
| Add SHACL validation step | CI pipeline config | DevOps | ✓ Complete |
| Add syntax checking (TTL) | CI pipeline config | DevOps | ✓ Complete |
| Add Python linting (ruff) | CI pipeline config | DevOps | ✓ Complete |
| Add unit tests (pytest) | CI pipeline config | DevOps | ✓ Complete |

### 5.2 Continuous Deployment

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create deployment workflow | `.github/workflows/deploy.yml` | DevOps | ✓ Complete |
| Add environment selector | dev/staging/prod | DevOps | ✓ Complete |
| Configure environment secrets | GitHub Secrets | DevOps | ☐ Not Started |
| Configure rollback procedures | Runbook | DevOps | ☐ Not Started |

### 5.3 Quality Gates

| Gate | Criteria | Blocking |
|------|----------|----------|
| Syntax validation | All TTL files parse correctly | Yes |
| SHACL validation | All data products conform to shapes | Yes |
| Python linting | ruff check passes | Yes |
| Unit tests | pytest passes | Yes |

### Acceptance Criteria — Phase 5

- [x] PR validation runs automatically
- [x] Failed validation blocks merge
- [x] Manual deployment with environment selection
- [ ] Production deployment requires approval (secrets pending)

---

## Phase 6: Operations & Governance ✓

**Timeline:** Week 6
**Goal:** Establish operational procedures and governance

### 6.1 Operational Runbooks

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create daily operations runbook | `docs/runbooks/daily-ops.md` | Ops | ✓ Complete |
| Create backup/restore procedures | `docs/runbooks/backup-restore.md` | Ops | ✓ Complete |
| Create incident response guide | `docs/runbooks/incident-response.md` | Ops | ✓ Complete |
| Create scaling procedures | `docs/runbooks/scaling.md` | Ops | ✓ Complete |

### 6.2 Monitoring Setup

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Configure Prometheus scraping | `monitoring/prometheus.yml` | Ops | ✓ Complete |
| Create Grafana dashboards | `monitoring/grafana/dprod-dashboard.json` | Ops | ✓ Complete |
| Set up alerting rules | `monitoring/alerts.yml` | Ops | ✓ Complete |
| Document SLIs/SLOs | `docs/slo.md` | Ops | ✓ Complete |

### 6.3 Governance Framework

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Define data product ownership model | `docs/governance.md` | Data Governance | ✓ Complete |
| Create onboarding guide | `docs/onboarding.md` | Data Governance | ✓ Complete |
| Define review/approval process | `docs/governance.md` | Data Governance | ✓ Complete |
| Create training materials | `docs/onboarding.md` | Data Governance | ✓ Complete |

### Acceptance Criteria — Phase 6

- [x] All runbooks reviewed and tested
- [x] Monitoring dashboards operational
- [x] Alerting validated with test scenarios
- [x] Governance process documented and approved

---

## Phase 7: Agentic Interface ☐

**Goal:** Create an AI agent interface for natural language interaction with the data product catalog

### 7.1 Design Principles

This phase follows research-backed patterns from context engineering best practices:

| Principle | Source | Application |
|-----------|--------|-------------|
| **Architectural Reduction** | Tool Design | Single agent with consolidated tools outperforms multi-agent complexity |
| **Consolidation Principle** | Tool Design | If a human can't decide which tool to use, neither can an agent |
| **Context Isolation** | Multi-Agent Patterns | Sub-agents only when context limits are exceeded |
| **GraphDB as Memory** | Memory Systems | No additional memory infrastructure needed—GraphDB is already a temporal knowledge graph |

### 7.2 Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DPROD CATALOG AGENT                           │
│                                                                   │
│  System Prompt: "You help users discover, understand, and        │
│  manage data products in the enterprise catalog."                │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│                     CONSOLIDATED TOOL SET                        │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐  │
│  │  catalog_query  │  │  trace_lineage  │  │ register_product│  │
│  │  (search/get)   │  │  (up/down/full) │  │  (validate+add) │  │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘  │
│                                                                   │
│  ┌─────────────────┐  ┌─────────────────┐                       │
│  │  check_quality  │  │  run_sparql     │                       │
│  │  (governance)   │  │  (advanced)     │                       │
│  └─────────────────┘  └─────────────────┘                       │
│                                                                   │
├─────────────────────────────────────────────────────────────────┤
│              GraphDB (Semantic Memory + Temporal KG)              │
└─────────────────────────────────────────────────────────────────┘
```

### 7.3 Consolidated Tools

| Tool | Purpose | Wraps Queries |
|------|---------|---------------|
| `catalog_query` | Search, list, and get product details | `list-products.rq`, `get-product.rq`, `find-by-*.rq`, `search.rq` |
| `trace_lineage` | Trace upstream/downstream dependencies | `lineage-upstream.rq`, `lineage-downstream.rq`, `lineage-full.rq` |
| `check_quality` | Run governance and quality checks | `orphaned-datasets.rq`, `missing-owners.rq`, `stale-products.rq`, `missing-descriptions.rq` |
| `register_product` | Validate and ingest new products | SHACL validation + Graph Store API |
| `run_sparql` | Execute custom SPARQL for advanced users | Direct SPARQL endpoint |

### 7.4 Implementation Tasks

| Task | Deliverable | Owner | Status |
|------|-------------|-------|--------|
| Create tool wrapper module | `src/dprod/tools.py` | Developer | ☐ Not Started |
| Implement catalog_query tool | Tool with @tool decorator | Developer | ☐ Not Started |
| Implement trace_lineage tool | Tool with @tool decorator | Developer | ☐ Not Started |
| Implement check_quality tool | Tool with @tool decorator | Developer | ☐ Not Started |
| Implement register_product tool | Tool with @tool decorator | Developer | ☐ Not Started |
| Implement run_sparql tool | Tool with @tool decorator | Developer | ☐ Not Started |
| Create MCP server | `src/dprod/mcp_server.py` | Developer | ☐ Not Started |
| Write agent system prompt | `src/dprod/prompts.py` | Developer | ☐ Not Started |
| Create agent entry point | `src/dprod/agent.py` | Developer | ☐ Not Started |
| Add agent tests | `tests/test_agent.py` | Developer | ☐ Not Started |

### 7.5 Tool Implementation Pattern

Tools use the Claude Agent SDK `@tool` decorator wrapping the existing Python client:

```python
from claude_agent_sdk import tool, create_sdk_mcp_server
from typing import Any
from src.dprod.client import DPRODClient

client = DPRODClient()

@tool(
    "catalog_query",
    """Search and retrieve data products from the catalog.

    Use when:
    - User asks "what data products exist for X domain"
    - User wants details about a specific product
    - User searches by owner, status, or keyword

    Returns: List of matching products with key metadata""",
    {
        "query_type": str,  # "search" | "get" | "list"
        "filters": dict,    # domain, owner, status, keyword
        "product_uri": str, # For "get" type
        "format": str       # "concise" | "detailed"
    }
)
async def catalog_query(args: dict[str, Any]) -> dict[str, Any]:
    # Implementation wraps existing client methods
    ...
```

### 7.6 Agent Configuration

```python
from claude_agent_sdk import ClaudeAgentOptions, create_sdk_mcp_server

dprod_server = create_sdk_mcp_server(
    name="dprod-catalog",
    version="1.0.0",
    tools=[catalog_query, trace_lineage, check_quality, register_product, run_sparql]
)

options = ClaudeAgentOptions(
    model="sonnet",
    system_prompt=CATALOG_AGENT_PROMPT,
    mcp_servers={"catalog": dprod_server},
    allowed_tools=[
        "mcp__catalog__catalog_query",
        "mcp__catalog__trace_lineage",
        "mcp__catalog__check_quality",
        "mcp__catalog__register_product",
        "mcp__catalog__run_sparql"
    ]
)
```

### 7.7 Subagent Triggers (Only If Needed)

Subagents should only be added when specific triggers are hit:

| Trigger | Subagent | Rationale |
|---------|----------|-----------|
| Complex multi-step workflows (>5 tool calls) | `workflow-executor` | Context isolation prevents confusion |
| Parallel exploration of multiple domains | `domain-explorer` | Parallelization benefit |
| Deep schema analysis requiring file access | `schema-validator` | Different tool set needed |

### 7.8 Memory Architecture

No additional memory infrastructure required. GraphDB already provides:

| Memory Layer | GraphDB Implementation |
|--------------|------------------------|
| Semantic Memory | DPROD ontology + DCAT relationships |
| Temporal Memory | `dct:created`, `dct:modified` timestamps |
| Entity Memory | Named graphs (`urn:data:products`, `urn:data:agents`) |
| Relationship Memory | SPARQL traversal of `dprod:inputPort`/`dprod:outputPort` |

### 7.9 Dependencies

| Dependency | Version | Purpose |
|------------|---------|---------|
| claude-agent-sdk | latest | Agent framework and tool decorators |
| anthropic | latest | Claude API client |

### Acceptance Criteria — Phase 7

- [ ] All 5 tools implemented and tested
- [ ] MCP server created and functional
- [ ] Agent responds correctly to catalog queries
- [ ] Agent traces lineage with business context
- [ ] Agent runs governance checks on request
- [ ] Agent validates and registers new products
- [ ] Integration tests pass against live GraphDB

---

## Project Directory Structure

```
dprod-graphdb/
├── config/
│   └── dprod-repo-config.ttl
├── data/
│   ├── products/
│   │   ├── customer-360.ttl
│   │   ├── sales-analytics.ttl
│   │   ├── hr-workforce.ttl
│   │   ├── finance-reporting.ttl
│   │   └── marketing-campaigns.ttl
│   └── vocab/
│       ├── domains.ttl
│       ├── lifecycle-status.ttl
│       ├── agents.ttl
│       ├── protocols.ttl
│       └── security-types.ttl
├── ontologies/
│   ├── dprod.ttl
│   ├── dprod-shapes.ttl
│   ├── dcat.ttl
│   └── prov-o.ttl
├── queries/
│   ├── list-products.rq
│   ├── get-product.rq
│   ├── find-by-domain.rq
│   ├── lineage-upstream.rq
│   └── ...
├── src/
│   └── dprod/
│       ├── __init__.py
│       ├── client.py          # Existing GraphDB client
│       ├── tools.py           # Agent tool definitions (Phase 7)
│       ├── mcp_server.py      # MCP server setup (Phase 7)
│       ├── prompts.py         # System prompts (Phase 7)
│       └── agent.py           # Agent entry point (Phase 7)
├── scripts/
│   ├── deploy.sh
│   ├── load-ontologies.sh
│   ├── load-shapes.sh
│   ├── health-check.sh
│   └── run-validation-tests.sh
├── tests/
│   ├── valid/
│   │   └── *.ttl
│   ├── invalid/
│   │   └── *.ttl
│   ├── test_client.py
│   └── test_agent.py          # Agent tests (Phase 7)
├── docs/
│   ├── api/
│   ├── runbooks/
│   └── onboarding.md
├── monitoring/
│   ├── prometheus.yml
│   ├── alerts.yml
│   └── grafana/
├── .github/
│   └── workflows/
│       ├── validate.yml
│       └── deploy.yml
├── docker-compose.yml
├── .env.example
├── spec.md
├── plan.md
└── README.md
```

---

## Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| SHACL shapes incompatible with GraphDB version | High | Medium | Test shapes against target version early |
| Performance degradation at scale | Medium | Medium | Load test with realistic data volumes |
| Integration complexity with existing systems | High | High | Start with simple read-only integrations |
| Team unfamiliar with RDF/SPARQL | Medium | High | Plan training sessions in Phase 1 |
| Ontology changes break existing data | High | Low | Version ontologies, maintain backward compatibility |
| Agent tool selection ambiguity | Medium | Medium | Follow consolidation principle—fewer, comprehensive tools |
| Agent context window exhaustion | Medium | Low | GraphDB handles memory; add subagents only if needed |
| Claude Agent SDK API changes | Low | Medium | Pin SDK version, monitor release notes |

---

## Dependencies

| Dependency | Required By | Source |
|------------|-------------|--------|
| GraphDB 10.8+ | Phase 1 | Ontotext |
| Docker & Docker Compose | Phase 1 | docker.com |
| DPROD ontology files | Phase 1 | ekgf.github.io/dprod |
| DCAT v3 ontology | Phase 1 | w3.org |
| curl | All phases | System package |
| Access to target infrastructure | Phase 1 | Internal |
| claude-agent-sdk | Phase 7 | PyPI (anthropic) |
| anthropic | Phase 7 | PyPI |

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Data products cataloged | 50+ by end of Q1 | Count query |
| SHACL conformance rate | 100% | Validation reports |
| Query response time (p95) | < 500ms | Prometheus metrics |
| System uptime | 99.9% | Monitoring |
| User adoption | 20+ active users | Usage analytics |

---

## Next Actions

1. **Immediate:** Review Phase 7 agentic interface design
2. **This Week:** Add `claude-agent-sdk` dependency to `pyproject.toml`
3. **Implementation Priority:**
   - Wrap existing Python client with `@tool` decorators
   - Create MCP server with 5 consolidated tools
   - Write system prompt optimized for catalog operations
   - Test with real queries against sample products
4. **Defer:** Add subagents only when specific triggers are hit (>5 tool calls, parallel domain exploration)

---

*Document maintained by Data Architecture Team*
