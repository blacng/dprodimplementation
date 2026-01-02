# Onboarding Guide

Welcome to the DPROD Data Product Catalog. This guide will help you get started.

## What is DPROD?

DPROD (Data Product Ontology) is a W3C-aligned specification for describing data products in a decentralized data architecture. This catalog uses GraphDB to store and query data product metadata.

## Quick Start

### 1. Set Up Your Environment

```bash
# Clone the repository
git clone <repository-url>
cd dprodimplementation

# Start GraphDB and load data
make setup

# Verify everything is working
make health
```

### 2. Explore the Catalog

```bash
# List all data products
make query QUERY=list-products

# Search for a product
make query QUERY=search PARAMS="customer"

# View product statistics
make query QUERY=stats-by-domain
```

### 3. Use the Python Client

```python
from src.dprod import DPRODClient

client = DPRODClient()

# List products
for product in client.list_products():
    print(f"{product.label} - {product.status_uri}")

# Search
results = client.search("analytics")
```

## Key Concepts

### Data Product

A data product is a self-contained unit of data with:
- **Owner** - Team responsible for the product
- **Domain** - Business domain it belongs to
- **Lifecycle Status** - Current stage (Ideation → Consume → Retire)
- **Output Ports** - How the data is accessed

### Lifecycle Statuses

| Status | Description |
|--------|-------------|
| Ideation | Concept phase |
| Design | Architecture and planning |
| Build | Development in progress |
| Deploy | Being released |
| Consume | Available for use |
| Retire | Being decommissioned |

### Ports and Datasets

- **Output Port** - An API or service that exposes data
- **Input Port** - Connection to upstream data products
- **Dataset** - The actual data served by a port

## Creating a Data Product

### 1. Define Your Product

Create a Turtle file in `data/products/`:

```turtle
@prefix dprod: <https://ekgf.github.io/dprod/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://data.example.com/products/my-product>
    a dprod:DataProduct ;
    rdfs:label "My Data Product" ;
    dct:description "What this product provides" ;
    dprod:dataProductOwner <https://data.example.com/agents/my-team> ;
    dprod:domain <https://data.example.com/domains/my-domain> ;
    dprod:lifecycleStatus <https://ekgf.github.io/dprod/data/lifecycle-status/Design> ;
    dprod:purpose "Why this product exists" .
```

### 2. Validate

```bash
# Check TTL syntax
rapper -i turtle -c data/products/my-product.ttl

# Run SHACL validation
make test-shacl
```

### 3. Submit for Review

1. Create a branch: `git checkout -b add-my-product`
2. Commit your changes
3. Open a pull request
4. CI will validate automatically

## Directory Structure

```
.
├── data/
│   ├── products/     # Data product definitions
│   └── vocab/        # Controlled vocabularies
├── ontologies/       # DPROD, DCAT, PROV-O ontologies
├── shapes/           # SHACL validation shapes
├── queries/          # Reusable SPARQL queries
├── src/dprod/        # Python client library
├── docs/             # Documentation
└── postman/          # API collection
```

## Common Tasks

### Find Products by Domain

```bash
make query QUERY=find-by-domain PARAMS="<domain-uri>"
```

### Check Lineage

```bash
# What feeds into this product?
make query QUERY=lineage-upstream PARAMS="<product-uri>"

# What consumes this product?
make query QUERY=lineage-downstream PARAMS="<product-uri>"
```

### Update Product Status

```python
client.update_product_status(
    uri="https://data.example.com/products/my-product",
    new_status_uri="https://ekgf.github.io/dprod/data/lifecycle-status/Deploy"
)
```

## Getting Help

| Question | Resource |
|----------|----------|
| How do I...? | This guide, `docs/` folder |
| Something's broken | `docs/runbooks/incident-response.md` |
| API reference | `docs/api/` folder |
| DPROD specification | `.claude/docs/spec.md` |

## Next Steps

1. Browse existing data products
2. Identify products your team owns
3. Check if your products are in the catalog
4. Create missing product definitions
5. Set up lineage relationships
