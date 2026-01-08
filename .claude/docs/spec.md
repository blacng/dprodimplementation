# DPROD Implementation Specification for GraphDB

**Version:** 1.0  
**Date:** December 2024  
**Status:** Draft  
**Author:** Data Architecture Team

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Scope and Objectives](#2-scope-and-objectives)
3. [Architecture Overview](#3-architecture-overview)
4. [Technical Requirements](#4-technical-requirements)
5. [GraphDB Configuration](#5-graphdb-configuration)
6. [Named Graph Strategy](#6-named-graph-strategy)
7. [Ontology Deployment](#7-ontology-deployment)
8. [SHACL Validation Setup](#8-shacl-validation-setup)
9. [Data Ingestion Pipeline](#9-data-ingestion-pipeline)
10. [SPARQL Query Patterns](#10-sparql-query-patterns)
11. [REST API Integration](#11-rest-api-integration)
12. [Security Configuration](#12-security-configuration)
13. [Monitoring and Operations](#13-monitoring-and-operations)
14. [Migration Strategy](#14-migration-strategy)
15. [Appendices](#15-appendices)

---

## 1. Executive Summary

This specification defines the technical implementation of the **Data Product Ontology (DPROD)** within **Ontotext GraphDB** to establish a semantic metadata layer for enterprise data product management. DPROD extends the W3C Data Catalog Vocabulary (DCAT) to describe Data Products in decentralized data architectures.

### Key Deliverables

- Configured GraphDB repository with SHACL validation enabled
- Deployed DPROD ontology and validation shapes
- Named graph architecture for multi-tenant data product catalogs
- SPARQL query templates for common operations
- REST API integration patterns for catalog applications
- Validation pipeline for data product conformance

---

## 2. Scope and Objectives

### 2.1 In Scope

| Item | Description |
|------|-------------|
| DPROD Ontology | Full deployment of EKGF DPROD specification |
| DCAT v3 | W3C Data Catalog Vocabulary (dependency) |
| SHACL Validation | dprod-shapes.ttl conformance checking |
| GraphDB Configuration | Repository setup, reasoning, indexing |
| API Integration | REST and SPARQL endpoints |
| Data Product Lifecycle | Ideation → Design → Build → Deploy → Consume |

### 2.2 Out of Scope

- Application UI development (separate project)
- Data pipeline orchestration tools
- Source system integrations (handled by ETL layer)
- Business domain ontology extensions (phase 2)

### 2.3 Success Criteria

1. All data product definitions pass SHACL validation
2. SPARQL query response time < 500ms for catalog queries
3. Zero data loss during ingestion
4. 99.9% uptime for GraphDB service

---

## 3. Architecture Overview

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    DATA PRODUCT CATALOG                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │  Catalog UI │    │  Data Mesh  │    │   CI/CD     │          │
│  │   (React)   │    │   Portal    │    │  Pipeline   │          │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘          │
│         │                  │                   │                  │
│         └──────────────────┼───────────────────┘                  │
│                            ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   API GATEWAY                                │ │
│  │            (Authentication / Rate Limiting)                  │ │
│  └─────────────────────────┬───────────────────────────────────┘ │
│                            ▼                                      │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                   GraphDB Server                             │ │
│  │  ┌───────────────────────────────────────────────────────┐  │ │
│  │  │              DPROD Repository                          │  │ │
│  │  │  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐      │  │ │
│  │  │  │  Ontology   │ │   SHACL     │ │    Data     │      │  │ │
│  │  │  │   Graphs    │ │   Shapes    │ │   Graphs    │      │  │ │
│  │  │  └─────────────┘ └─────────────┘ └─────────────┘      │  │ │
│  │  └───────────────────────────────────────────────────────┘  │ │
│  │                                                              │ │
│  │  ┌─────────────────────┐  ┌─────────────────────┐           │ │
│  │  │   SPARQL Endpoint   │  │    REST API         │           │ │
│  │  │   :7200/sparql      │  │    :7200/rest       │           │ │
│  │  └─────────────────────┘  └─────────────────────┘           │ │
│  └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 3.2 Component Responsibilities

| Component | Responsibility |
|-----------|----------------|
| GraphDB | Triple store, SPARQL processing, SHACL validation |
| DPROD Ontology | Data Product class definitions and properties |
| SHACL Shapes | Validation constraints for conformance |
| API Gateway | Authentication, rate limiting, routing |
| Catalog UI | Human interface for browsing/editing |

---

## 4. Technical Requirements

### 4.1 Infrastructure Requirements

| Resource | Minimum | Recommended | Production |
|----------|---------|-------------|------------|
| CPU Cores | 4 | 8 | 16+ |
| RAM | 16 GB | 32 GB | 64 GB |
| Storage | 100 GB SSD | 500 GB SSD | 1 TB NVMe |
| Network | 1 Gbps | 10 Gbps | 10 Gbps |

### 4.2 Software Requirements

| Component | Version | Purpose |
|-----------|---------|---------|
| GraphDB | 10.8+ or 11.x | Triple store with SHACL support |
| Java | JDK 11 or 17 | GraphDB runtime |
| Docker | 24.x+ | Container deployment (optional) |
| curl | 7.x+ | API testing and automation |

### 4.3 Ontology Dependencies

```turtle
# Required ontology files
dprod.ttl          # DPROD core ontology
dprod-shapes.ttl   # SHACL validation shapes
dcat.ttl           # W3C DCAT v3 (imported by DPROD)
prov-o.ttl         # W3C PROV-O (for agents/ownership)
```

---

## 5. GraphDB Configuration

### 5.1 Repository Creation

**CRITICAL:** SHACL validation must be enabled at repository creation time. It cannot be enabled on existing repositories.

#### 5.1.1 Repository Configuration File

Create `dprod-repo-config.ttl`:

```turtle
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix rep: <http://www.openrdf.org/config/repository#> .
@prefix sr: <http://www.openrdf.org/config/repository/sail#> .
@prefix sail: <http://www.openrdf.org/config/sail#> .
@prefix graphdb: <http://www.ontotext.com/config/graphdb#> .

[] a rep:Repository ;
    rep:repositoryID "dprod-catalog" ;
    rdfs:label "DPROD Data Product Catalog" ;
    rep:repositoryImpl [
        rep:repositoryType "graphdb:SailRepository" ;
        sr:sailImpl [
            sail:sailType "graphdb:Sail" ;
            
            # Reasoning configuration
            graphdb:ruleset "rdfsplus-optimized" ;
            graphdb:check-for-inconsistencies "true" ;
            
            # Storage configuration
            graphdb:storage-folder "storage" ;
            graphdb:base-URL "https://data.yourorg.com/" ;
            graphdb:repository-type "file-repository" ;
            graphdb:defaultNS "https://data.yourorg.com/" ;
            
            # SHACL configuration (CRITICAL)
            graphdb:enable-shacl-validation "true" ;
            graphdb:shacl-shapes-graph "http://rdf4j.org/schema/rdf4j#SHACLShapeGraph" ;
            graphdb:shacl-parallel-validation "false" ;
            graphdb:shacl-cache-select-nodes "false" ;
            graphdb:shacl-log-validation-violations "true" ;
            
            # Performance tuning
            graphdb:entity-index-size "10000000" ;
            graphdb:cache-memory "4g" ;
            graphdb:tuple-index-memory "2g" ;
            
            # Full-text search
            graphdb:fts-indexes "default" ;
            graphdb:fts-string-literals-index "default" ;
            graphdb:fts-iris-index "none"
        ]
    ] .
```

#### 5.1.2 Create Repository via REST API

```bash
# Create the repository
curl -X POST http://localhost:7200/rest/repositories \
  -H 'Content-Type: multipart/form-data' \
  -F "config=@dprod-repo-config.ttl"

# Verify creation
curl -X GET http://localhost:7200/rest/repositories \
  -H 'Accept: application/json'
```

#### 5.1.3 Create Repository via JSON API

```bash
curl -X PUT http://localhost:7200/rest/repositories/dprod-catalog \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "dprod-catalog",
    "title": "DPROD Data Product Catalog",
    "type": "graphdb",
    "sesameType": "graphdb:SailRepository",
    "params": {
      "queryTimeout": { "value": "30" },
      "cacheSelectNodes": { "value": "false" },
      "rdfsSubClassReasoning": { "value": "true" },
      "validationEnabled": { "value": "true" },
      "shapesGraph": { "value": "http://rdf4j.org/schema/rdf4j#SHACLShapeGraph" },
      "parallelValidation": { "value": "false" },
      "logValidationViolations": { "value": "true" },
      "performanceLogging": { "value": "false" }
    }
  }'
```

### 5.2 Repository Settings Explanation

| Setting | Value | Rationale |
|---------|-------|-----------|
| `validationEnabled` | `true` | Enable SHACL validation on commit |
| `parallelValidation` | `false` | Required for logging; enable in production for performance |
| `cacheSelectNodes` | `false` | Reduce memory during large data loads |
| `logValidationViolations` | `true` | Debug mode; disable in production |
| `rdfsSubClassReasoning` | `true` | Enable for DPROD class hierarchy |

---

## 6. Named Graph Strategy

### 6.1 Graph Architecture

Organize data into separate named graphs for isolation, governance, and query performance.

| Graph URI | Purpose | Content |
|-----------|---------|---------|
| `urn:ontology:dcat` | DCAT ontology | W3C DCAT v3 classes/properties |
| `urn:ontology:dprod` | DPROD ontology | EKGF DPROD extension |
| `urn:ontology:prov` | PROV-O ontology | Agent/ownership vocabulary |
| `urn:shapes:dprod` | SHACL shapes | Loaded into special SHACL graph |
| `urn:data:catalog` | Enterprise catalog | dcat:Catalog instances |
| `urn:data:products` | Data products | dprod:DataProduct instances |
| `urn:data:services` | Data services | dcat:DataService (ports) |
| `urn:data:datasets` | Datasets | dcat:Dataset instances |
| `urn:data:agents` | Owners/Teams | prov:Agent instances |
| `urn:vocab:domains` | Business domains | Domain taxonomy |
| `urn:vocab:lifecycle` | Lifecycle statuses | Status enumeration |

### 6.2 Graph Loading Commands

```bash
# Load DCAT ontology
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: text/turtle" \
  -d "@dcat.ttl" \
  --data-urlencode "context=<urn:ontology:dcat>"

# Load DPROD ontology  
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: text/turtle" \
  -d "@dprod.ttl" \
  --data-urlencode "context=<urn:ontology:dprod>"

# Load SHACL shapes (special graph)
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: text/turtle" \
  -d "@dprod-shapes.ttl" \
  --data-urlencode "context=<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>"
```

### 6.3 Default Graph Configuration

Configure the repository to query across all graphs by default:

```sparql
# Set default graph behavior
PREFIX graphdb: <http://www.ontotext.com/config/graphdb#>

INSERT DATA {
  GRAPH <http://www.ontotext.com/config/graphdb#> {
    graphdb:defaultGraphFromAllNamedGraphs "true" .
  }
}
```

---

## 7. Ontology Deployment

### 7.1 Deployment Sequence

Execute in order:

```bash
#!/bin/bash
# deploy-ontologies.sh

GRAPHDB_URL="http://localhost:7200"
REPO="dprod-catalog"
ENDPOINT="${GRAPHDB_URL}/repositories/${REPO}/statements"

echo "Step 1: Loading PROV-O ontology..."
curl -X POST "${ENDPOINT}?context=<urn:ontology:prov>" \
  -H "Content-Type: text/turtle" \
  --data-binary @prov-o.ttl

echo "Step 2: Loading DCAT v3 ontology..."
curl -X POST "${ENDPOINT}?context=<urn:ontology:dcat>" \
  -H "Content-Type: text/turtle" \
  --data-binary @dcat.ttl

echo "Step 3: Loading DPROD ontology..."
curl -X POST "${ENDPOINT}?context=<urn:ontology:dprod>" \
  -H "Content-Type: text/turtle" \
  --data-binary @dprod.ttl

echo "Step 4: Loading SHACL shapes..."
curl -X POST "${ENDPOINT}?context=<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>" \
  -H "Content-Type: text/turtle" \
  --data-binary @dprod-shapes.ttl

echo "Step 5: Loading vocabulary instances..."
curl -X POST "${ENDPOINT}?context=<urn:vocab:lifecycle>" \
  -H "Content-Type: text/turtle" \
  --data-binary @lifecycle-status.ttl

echo "Deployment complete. Verifying..."
curl -X GET "${GRAPHDB_URL}/repositories/${REPO}/size"
```

### 7.2 Ontology Verification Query

```sparql
PREFIX owl: <http://www.w3.org/2002/07/owl#>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>

SELECT ?ontology ?label (COUNT(?class) AS ?classCount)
WHERE {
  GRAPH ?ontology {
    ?ont a owl:Ontology ;
         rdfs:label ?label .
    ?class a owl:Class .
  }
}
GROUP BY ?ontology ?label
ORDER BY ?ontology
```

Expected output:

| ontology | label | classCount |
|----------|-------|------------|
| urn:ontology:dcat | DCAT vocabulary | 15 |
| urn:ontology:dprod | DPROD ontology | 6 |

---

## 8. SHACL Validation Setup

### 8.1 Critical Configuration Notes

> **WARNING:** The repository MUST be created with SHACL validation enabled. You cannot enable validation on an existing repository.

> **WARNING:** Importing new shapes appends to the graph. To replace shapes, you must first clear the shape graph.

### 8.2 Loading SHACL Shapes

```bash
# Clear existing shapes (if updating)
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/sparql-update" \
  -d "CLEAR GRAPH <http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>"

# Load DPROD shapes
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: text/turtle" \
  --data-binary @dprod-shapes.ttl \
  --data-urlencode "context=<http://rdf4j.org/schema/rdf4j#SHACLShapeGraph>"
```

### 8.3 Validation Behavior

GraphDB validates data **on commit**. If validation fails, the transaction is rolled back and an exception is thrown.

Example validation error response:

```json
{
  "error": "org.eclipse.rdf4j.sail.shacl.ShaclSailValidationException",
  "message": "Failed SHACL validation",
  "report": {
    "conforms": false,
    "results": [
      {
        "focusNode": "https://data.yourorg.com/products/customer-360",
        "path": "dprod:dataProductOwner",
        "severity": "sh:Violation",
        "message": "Value is required for dprod:dataProductOwner"
      }
    ]
  }
}
```

### 8.4 Bulk Validation API

For validating existing data without modifying it:

```bash
# Validate repository against shapes in another repository
curl -X POST \
  "http://localhost:7200/rest/repositories/dprod-catalog/validate/repository/dprod-shapes-repo"

# Validate with inline shapes
curl -X POST \
  "http://localhost:7200/rest/repositories/dprod-catalog/validate" \
  -H "Content-Type: text/turtle" \
  --data-binary @dprod-shapes.ttl
```

### 8.5 SHACL Extensions Configuration

Enable additional SHACL features in repository settings:

| Extension | Purpose | Enable When |
|-----------|---------|-------------|
| DASH Extensions | `dash:hasValueIn`, advanced targets | Extended validation rules |
| RDF4J Extensions | `rsx:targetShape` | Shape-based targeting |
| SPARQL Constraints | Custom SPARQL-based rules | Complex business rules |

---

## 9. Data Ingestion Pipeline

### 9.1 Ingestion Architecture

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Source    │───▶│  Transform  │───▶│   Validate  │───▶│   GraphDB   │
│   Systems   │    │  (RDF/TTL)  │    │   (SHACL)   │    │   Ingest    │
└─────────────┘    └─────────────┘    └─────────────┘    └─────────────┘
      │                   │                  │                  │
      ▼                   ▼                  ▼                  ▼
  Metadata APIs      RDF Mappers       Validation         Named Graphs
  Config Files       JSON-LD Context   Reports            Transactions
```

### 9.2 Data Product Template

```turtle
@prefix dprod: <https://ekgf.github.io/dprod/> .
@prefix dcat: <http://www.w3.org/ns/dcat#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .
@prefix prov: <http://www.w3.org/ns/prov#> .
@prefix org: <https://data.yourorg.com/> .

# Data Product Definition
org:products/customer-360 a dprod:DataProduct ;
    rdfs:label "Customer 360" ;
    dct:title "Customer 360 Data Product" ;
    dct:description "Unified customer view combining CRM, transactions, and support data" ;
    dprod:dataProductOwner org:agents/customer-data-team ;
    dprod:domain org:domains/customer-analytics ;
    dprod:lifecycleStatus <https://ekgf.github.io/dprod/data/lifecycle-status/Consume> ;
    dprod:purpose "Enable personalized marketing and customer service optimization" ;
    dprod:outputPort org:services/customer-360-api ;
    dprod:outputDataset org:datasets/customer-master ;
    dct:created "2024-01-15"^^xsd:date ;
    dct:modified "2024-12-01"^^xsd:date .

# Output Port (Data Service)
org:services/customer-360-api a dcat:DataService ;
    rdfs:label "Customer 360 REST API" ;
    dcat:endpointURL <https://api.yourorg.com/v1/customers> ;
    dcat:endpointDescription <https://api.yourorg.com/v1/customers/openapi.yaml> ;
    dprod:protocol org:protocols/rest ;
    dprod:isAccessServiceOf org:distributions/customer-master-json .

# Distribution
org:distributions/customer-master-json a dcat:Distribution ;
    rdfs:label "Customer Master - JSON" ;
    dct:format <https://www.iana.org/assignments/media-types/application/json> ;
    dprod:isDistributionOf org:datasets/customer-master .

# Dataset
org:datasets/customer-master a dcat:Dataset ;
    rdfs:label "Customer Master Dataset" ;
    dct:description "Golden record of all customers" ;
    dct:conformsTo org:schemas/customer-entity .

# Owner
org:agents/customer-data-team a prov:Agent ;
    rdfs:label "Customer Data Team" .
```

### 9.3 Ingestion via SPARQL UPDATE

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX org: <https://data.yourorg.com/>

INSERT DATA {
  GRAPH <urn:data:products> {
    org:products/sales-analytics a dprod:DataProduct ;
      rdfs:label "Sales Analytics" ;
      dct:description "Sales performance and pipeline analytics" ;
      dprod:dataProductOwner org:agents/sales-team ;
      dprod:domain org:domains/sales-operations ;
      dprod:lifecycleStatus <https://ekgf.github.io/dprod/data/lifecycle-status/Build> ;
      dct:created "2024-11-01"^^xsd:date .
  }
}
```

### 9.4 Batch Import Script

```bash
#!/bin/bash
# batch-import.sh - Import multiple data product files

GRAPHDB_URL="http://localhost:7200"
REPO="dprod-catalog"
INPUT_DIR="./data-products"

for file in ${INPUT_DIR}/*.ttl; do
  echo "Importing: ${file}"
  
  # Validate before import
  response=$(curl -s -X POST \
    "${GRAPHDB_URL}/rest/repositories/${REPO}/validate" \
    -H "Content-Type: text/turtle" \
    --data-binary @"${file}")
  
  if echo "${response}" | grep -q '"conforms":true'; then
    # Import to data graph
    curl -X POST \
      "${GRAPHDB_URL}/repositories/${REPO}/statements?context=<urn:data:products>" \
      -H "Content-Type: text/turtle" \
      --data-binary @"${file}"
    echo "  ✓ Imported successfully"
  else
    echo "  ✗ Validation failed: ${response}"
  fi
done
```

---

## 10. SPARQL Query Patterns

### 10.1 List All Data Products

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label ?description ?owner ?ownerName ?status
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:dataProductOwner ?owner ;
           dprod:lifecycleStatus ?status .
  
  OPTIONAL { ?product dct:description ?description }
  OPTIONAL { ?owner rdfs:label ?ownerName }
}
ORDER BY ?label
```

### 10.2 Get Data Product Details

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

CONSTRUCT {
  ?product ?p ?o .
  ?port ?pp ?po .
  ?dist ?dp ?do .
  ?dataset ?dsp ?dso .
}
WHERE {
  BIND(<https://data.yourorg.com/products/customer-360> AS ?product)
  
  ?product ?p ?o .
  
  OPTIONAL {
    ?product dprod:outputPort ?port .
    ?port ?pp ?po .
  }
  
  OPTIONAL {
    ?port dprod:isAccessServiceOf ?dist .
    ?dist ?dp ?do .
  }
  
  OPTIONAL {
    ?dist dprod:isDistributionOf ?dataset .
    ?dataset ?dsp ?dso .
  }
}
```

### 10.3 Find Products by Domain

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label ?status
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:domain <https://data.yourorg.com/domains/customer-analytics> ;
           dprod:lifecycleStatus ?status .
}
```

### 10.4 Trace Data Lineage (Upstream)

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?upstream ?upstreamLabel
WHERE {
  <https://data.yourorg.com/products/marketing-campaigns> 
    dprod:inputPort ?inputPort .
  
  ?upstream a dprod:DataProduct ;
            dprod:outputPort ?inputPort ;
            rdfs:label ?upstreamLabel .
}
```

### 10.5 Find Products by Lifecycle Status

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

SELECT ?product ?label ?owner
WHERE {
  ?product a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:dataProductOwner ?owner ;
           dprod:lifecycleStatus <https://ekgf.github.io/dprod/data/lifecycle-status/Consume> .
}
```

### 10.6 Full-Text Search

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX luc: <http://www.ontotext.com/connectors/lucene#>
PREFIX inst: <http://www.ontotext.com/connectors/lucene/instance#>

SELECT ?product ?label ?snippet
WHERE {
  ?search a inst:dprod_fts ;
          luc:query "customer" ;
          luc:entities ?product .
  
  ?product a dprod:DataProduct ;
           rdfs:label ?label .
  
  OPTIONAL { ?product dct:description ?snippet }
}
LIMIT 10
```

---

## 11. REST API Integration

### 11.1 SPARQL Endpoint

| Method | Endpoint | Content-Type | Purpose |
|--------|----------|--------------|---------|
| GET | `/repositories/{repo}` | `application/sparql-results+json` | SELECT queries |
| POST | `/repositories/{repo}` | `application/sparql-query` | Complex queries |
| POST | `/repositories/{repo}/statements` | `application/sparql-update` | INSERT/DELETE |

### 11.2 Query Examples

```bash
# GET query (URL-encoded)
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=SELECT * WHERE { ?s a <https://ekgf.github.io/dprod/DataProduct> } LIMIT 10" \
  -H "Accept: application/sparql-results+json"

# POST query (body)
curl -X POST "http://localhost:7200/repositories/dprod-catalog" \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d "SELECT * WHERE { ?s a <https://ekgf.github.io/dprod/DataProduct> } LIMIT 10"

# SPARQL UPDATE
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/sparql-update" \
  -d "DELETE WHERE { <urn:example:product> ?p ?o }"
```

### 11.3 Graph Store Protocol

```bash
# Get named graph
curl -X GET \
  "http://localhost:7200/repositories/dprod-catalog/rdf-graphs/service?graph=urn:data:products" \
  -H "Accept: text/turtle"

# Replace named graph
curl -X PUT \
  "http://localhost:7200/repositories/dprod-catalog/rdf-graphs/service?graph=urn:data:products" \
  -H "Content-Type: text/turtle" \
  --data-binary @products.ttl

# Delete named graph
curl -X DELETE \
  "http://localhost:7200/repositories/dprod-catalog/rdf-graphs/service?graph=urn:data:products"
```

### 11.4 Lineage Visualization

The lineage viewer provides an interactive DAG (Directed Acyclic Graph) visualization of data product dependencies.

#### DAG Layout

The visualization uses a left-to-right hierarchical layout powered by Dagre.js:
- **Upstream sources** positioned on the left (negative depth values)
- **Selected product** centered with highlight (depth 0)
- **Downstream consumers** positioned on the right (positive depth values)

Layout parameters: `rankdir: 'LR'`, `ranksep: 180`, `nodesep: 60`

#### Depth-Based Coloring

Nodes are colored based on their distance from the selected product:

| Depth | Direction | Color | CSS Border |
|-------|-----------|-------|------------|
| -3 to -5 | Upstream (far) | Orange/Red | `border-orange-500` |
| -2 | Upstream | Amber | `border-amber-500/50` |
| -1 | Upstream (near) | Yellow | `border-yellow-500/50` |
| 0 | Source | Cyan | `border-cyan-500` |
| 1 | Downstream (near) | Emerald | `border-emerald-500/50` |
| 2 | Downstream | Teal | `border-teal-500/50` |
| 3 to 5 | Downstream (far) | Sky/Blue | `border-sky-500/50` |

#### Domain Grouping

Nodes sharing the same `domain_uri` are visually grouped:
- Subtle background regions with dashed borders
- Domain label displayed above each group
- Helps identify products in the same business domain

#### Animated Data Flow

Edges display animated cyan particles flowing left-to-right:
- 3 particles per edge with staggered timing (0s, 0.83s, 1.66s)
- SVG `<animateMotion>` along smooth step edge paths
- Glow filter for visual emphasis

#### API Response Structure

The lineage API returns depth information for each node:

```json
{
  "source_uri": "urn:products/customer-360",
  "direction": "full",
  "nodes": [
    { "uri": "...", "label": "...", "depth": 0, "is_source": true, "domain_label": "Customer Analytics" },
    { "uri": "...", "label": "...", "depth": 1, "is_source": false, "domain_label": "Sales" }
  ],
  "edges": [...]
}
```

---

## 12. Security Configuration

### 12.1 Authentication Setup

```bash
# Enable security (first time)
curl -X POST "http://localhost:7200/rest/security" \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'

# Create admin user
curl -X POST "http://localhost:7200/rest/security/users/admin" \
  -H "Content-Type: application/json" \
  -d '{
    "password": "SECURE_PASSWORD_HERE",
    "grantedAuthorities": ["ROLE_ADMIN"]
  }'
```

### 12.2 Role-Based Access Control

| Role | Permissions |
|------|-------------|
| `ROLE_ADMIN` | Full access to all repositories and settings |
| `ROLE_REPO_MANAGER` | Create/delete repositories |
| `ROLE_USER` | Read/write access to assigned repositories |
| `READ_{repo}` | Read-only access to specific repository |
| `WRITE_{repo}` | Write access to specific repository |

### 12.3 Create Service Account

```bash
curl -X POST "http://localhost:7200/rest/security/users/dprod-service" \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "password": "SERVICE_ACCOUNT_PASSWORD",
    "grantedAuthorities": [
      "READ_dprod-catalog",
      "WRITE_dprod-catalog"
    ]
  }'
```

---

## 13. Monitoring and Operations

### 13.1 Health Check Endpoints

```bash
# Repository size
curl "http://localhost:7200/repositories/dprod-catalog/size"

# Repository info
curl "http://localhost:7200/rest/repositories/dprod-catalog" \
  -H "Accept: application/json"

# Active queries
curl "http://localhost:7200/rest/monitor/query" \
  -H "Accept: application/json"
```

### 13.2 Prometheus Metrics

GraphDB exposes Prometheus-compatible metrics:

```bash
# Structures statistics
curl "http://localhost:7200/rest/monitor/structures"

# Repository statistics  
curl "http://localhost:7200/rest/monitor/repository"

# Infrastructure metrics
curl "http://localhost:7200/rest/monitor/infrastructure"
```

### 13.3 Key Metrics to Monitor

| Metric | Warning Threshold | Critical Threshold |
|--------|-------------------|-------------------|
| Query latency (p99) | > 1s | > 5s |
| Memory usage | > 80% | > 95% |
| Active connections | > 50 | > 100 |
| Transaction queue | > 10 | > 50 |
| Validation failures/hr | > 10 | > 50 |

### 13.4 Backup Procedures

```bash
# Create backup
curl -X POST "http://localhost:7200/rest/recovery/repository/dprod-catalog/backup" \
  -H "Content-Type: application/json" \
  -d '{"backupOptions": {"backupSystemData": true}}'

# List backups
curl "http://localhost:7200/rest/recovery/backups"

# Restore from backup
curl -X POST "http://localhost:7200/rest/recovery/repository/dprod-catalog/restore" \
  -H "Content-Type: application/json" \
  -d '{"backupName": "backup-2024-12-01"}'
```

---

## 14. Migration Strategy

### 14.1 Phase 1: Foundation (Weeks 1-2)

- [ ] Install GraphDB 10.8+ or 11.x
- [ ] Create DPROD repository with SHACL enabled
- [ ] Load ontologies (DCAT, DPROD, PROV-O)
- [ ] Load SHACL shapes
- [ ] Verify configuration with test data

### 14.2 Phase 2: Pilot (Weeks 3-4)

- [ ] Define 3-5 pilot data products
- [ ] Create data product definitions in TTL
- [ ] Validate against SHACL shapes
- [ ] Develop basic SPARQL queries
- [ ] Test API integration

### 14.3 Phase 3: Integration (Weeks 5-8)

- [ ] Connect to existing metadata sources
- [ ] Implement ingestion pipelines
- [ ] Configure security and RBAC
- [ ] Set up monitoring and alerting
- [ ] Document operational procedures

### 14.4 Phase 4: Rollout (Weeks 9-12)

- [ ] Migrate remaining data products
- [ ] Train data product owners
- [ ] Launch catalog UI
- [ ] Enable self-service registration
- [ ] Conduct operational handover

---

## 15. Appendices

### Appendix A: File Locations

| File | Source | Purpose |
|------|--------|---------|
| `dprod.ttl` | https://ekgf.github.io/dprod/dprod.ttl | Core ontology |
| `dprod-shapes.ttl` | https://ekgf.github.io/dprod/dprod-shapes.ttl | SHACL shapes |
| `dprod.jsonld` | https://ekgf.github.io/dprod/dprod.jsonld | JSON-LD context |
| `dcat.ttl` | https://www.w3.org/ns/dcat.ttl | W3C DCAT v3 |

### Appendix B: Namespace Prefixes

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX odrl: <http://www.w3.org/ns/odrl/2/>
PREFIX sh: <http://www.w3.org/ns/shacl#>
PREFIX org: <https://data.yourorg.com/>
```

### Appendix C: Troubleshooting

| Issue | Cause | Resolution |
|-------|-------|------------|
| SHACL validation not working | Repository created without SHACL | Recreate repository with `validationEnabled: true` |
| Shapes not loading | Wrong graph URI | Use `http://rdf4j.org/schema/rdf4j#SHACLShapeGraph` |
| Shapes appending not replacing | GraphDB behavior | Clear graph before reimporting shapes |
| Silent shape load failures | Unsupported SHACL features | Check GraphDB logs for warnings |
| Query timeout | Large dataset, complex query | Add LIMIT, optimize patterns, increase timeout |

### Appendix D: References

- [DPROD Specification](https://ekgf.github.io/dprod/)
- [GraphDB Documentation](https://graphdb.ontotext.com/documentation/)
- [GraphDB SHACL Validation](https://graphdb.ontotext.com/documentation/standard/shacl-validation.html)
- [W3C DCAT v3](https://www.w3.org/TR/vocab-dcat-3/)
- [W3C SHACL](https://www.w3.org/TR/shacl/)

---

**Document Control**

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2024-12-31 | Data Architecture | Initial specification |

---

*End of Specification*
