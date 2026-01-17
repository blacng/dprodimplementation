# REST API Patterns

This document describes common patterns for integrating with the DPROD catalog API.

## Architecture Overview

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────┐
│  Client App     │────▶│  GraphDB         │────▶│  RDF Store  │
│  (REST/SPARQL)  │     │  (SPARQL Engine) │     │  (Graphs)   │
└─────────────────┘     └──────────────────┘     └─────────────┘
```

## Common Patterns

### 1. List Resources

Fetch all data products with pagination.

```bash
# Basic list
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=
    PREFIX dprod: <https://ekgf.github.io/dprod/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT ?uri ?label
    WHERE { ?uri a dprod:DataProduct ; rdfs:label ?label }
    ORDER BY ?label
    LIMIT 20 OFFSET 0
  " \
  -H "Accept: application/sparql-results+json"
```

### 2. Get Single Resource

Fetch a specific data product by URI.

```bash
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=
    PREFIX dprod: <https://ekgf.github.io/dprod/>

    DESCRIBE <https://data.example.com/products/customer-360>
  " \
  -H "Accept: application/ld+json"
```

### 3. Search Resources

Full-text search across multiple fields.

```bash
SEARCH_TERM="customer"

curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=
    PREFIX dprod: <https://ekgf.github.io/dprod/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT DISTINCT ?uri ?label
    WHERE {
      ?uri a dprod:DataProduct ; rdfs:label ?label .
      FILTER(CONTAINS(LCASE(?label), LCASE(\"$SEARCH_TERM\")))
    }
  " \
  -H "Accept: application/sparql-results+json"
```

### 4. Filter Resources

Filter by property value.

```bash
# By status
STATUS_URI="https://data.example.com/lifecycle/Consume"

curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=
    PREFIX dprod: <https://ekgf.github.io/dprod/>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>

    SELECT ?uri ?label
    WHERE {
      ?uri a dprod:DataProduct ;
           rdfs:label ?label ;
           dprod:lifecycleStatus <$STATUS_URI> .
    }
  " \
  -H "Accept: application/sparql-results+json"
```

### 5. Create Resource

Add a new data product.

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  -d '
@prefix dprod: <https://ekgf.github.io/dprod/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .
@prefix xsd: <http://www.w3.org/2001/XMLSchema#> .

<https://data.example.com/products/new-product>
    a dprod:DataProduct ;
    rdfs:label "New Product" ;
    dct:description "Description here" ;
    dprod:dataProductOwner <https://data.example.com/agents/team-a> ;
    dprod:lifecycleStatus <https://data.example.com/lifecycle/Design> ;
    dct:created "2025-01-02"^^xsd:date .
'
```

### 6. Update Resource

Update specific properties using SPARQL UPDATE.

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/sparql-update" \
  -d '
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>

DELETE {
  GRAPH <urn:data:products> {
    <https://data.example.com/products/my-product> dprod:lifecycleStatus ?oldStatus .
    <https://data.example.com/products/my-product> dct:modified ?oldModified .
  }
}
INSERT {
  GRAPH <urn:data:products> {
    <https://data.example.com/products/my-product> dprod:lifecycleStatus <https://data.example.com/lifecycle/Deploy> .
    <https://data.example.com/products/my-product> dct:modified "2025-01-02"^^xsd:date .
  }
}
WHERE {
  GRAPH <urn:data:products> {
    <https://data.example.com/products/my-product> dprod:lifecycleStatus ?oldStatus .
    OPTIONAL { <https://data.example.com/products/my-product> dct:modified ?oldModified }
  }
}'
```

### 7. Delete Resource

Remove a data product.

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/sparql-update" \
  -d '
DELETE WHERE {
  GRAPH <urn:data:products> {
    <https://data.example.com/products/my-product> ?p ?o .
  }
}'
```

## Response Formats

### JSON Results (SELECT queries)

```json
{
  "head": {
    "vars": ["uri", "label"]
  },
  "results": {
    "bindings": [
      {
        "uri": { "type": "uri", "value": "https://data.example.com/products/customer-360" },
        "label": { "type": "literal", "value": "Customer 360" }
      }
    ]
  }
}
```

### JSON-LD (CONSTRUCT/DESCRIBE queries)

```json
{
  "@context": {
    "dprod": "https://ekgf.github.io/dprod/",
    "rdfs": "http://www.w3.org/2000/01/rdf-schema#"
  },
  "@id": "https://data.example.com/products/customer-360",
  "@type": "dprod:DataProduct",
  "rdfs:label": "Customer 360"
}
```

## Pagination Pattern

Use LIMIT and OFFSET for pagination:

```sparql
SELECT ?product ?label
WHERE { ?product a dprod:DataProduct ; rdfs:label ?label }
ORDER BY ?label
LIMIT 20
OFFSET 40
```

Get total count for pagination UI:

```sparql
SELECT (COUNT(?product) AS ?total)
WHERE { ?product a dprod:DataProduct }
```

## Error Handling Pattern

Wrap API calls with error handling:

```python
import requests

def query_catalog(sparql):
    response = requests.get(
        "http://localhost:7200/repositories/dprod-catalog",
        params={"query": sparql},
        headers={"Accept": "application/sparql-results+json"}
    )

    if response.status_code == 200:
        return response.json()
    elif response.status_code == 400:
        raise ValueError(f"Invalid query: {response.text}")
    elif response.status_code == 404:
        raise RuntimeError("Repository not found")
    else:
        raise RuntimeError(f"Server error: {response.status_code}")
```

## Validation Pattern

Validate data before insertion using ASK queries:

```bash
# Check if product already exists
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=
    ASK { <https://data.example.com/products/new-product> a ?type }
  " \
  -H "Accept: application/sparql-results+json"
```

Response:
```json
{ "boolean": false }
```

## Batch Operations

Use transactions for atomic batch operations:

```bash
# Insert multiple products atomically
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/sparql-update" \
  -d '
INSERT DATA {
  GRAPH <urn:data:products> {
    <https://data.example.com/products/product-1> a dprod:DataProduct ; rdfs:label "Product 1" .
    <https://data.example.com/products/product-2> a dprod:DataProduct ; rdfs:label "Product 2" .
    <https://data.example.com/products/product-3> a dprod:DataProduct ; rdfs:label "Product 3" .
  }
}'
```

## Caching Recommendations

| Query Type | Cache Duration |
|------------|----------------|
| List all products | 1-5 minutes |
| Get product details | 5-15 minutes |
| Statistics/counts | 5-15 minutes |
| Search results | No cache |

Use ETags or Last-Modified headers when available from GraphDB.
