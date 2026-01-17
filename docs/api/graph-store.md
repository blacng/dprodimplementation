# Graph Store Protocol

This document describes how to use the W3C Graph Store HTTP Protocol for managing RDF data in the DPROD catalog.

## Overview

The Graph Store Protocol provides RESTful CRUD operations for named graphs, complementing SPARQL for data management tasks.

## Base URL

```
http://localhost:7200/repositories/dprod-catalog/statements
```

## Named Graphs

The DPROD catalog uses named graphs to organize data:

| Graph URI | Purpose |
|-----------|---------|
| `urn:ontology:dprod` | DPROD ontology |
| `urn:ontology:dcat` | DCAT v3 ontology |
| `urn:ontology:prov` | PROV-O ontology |
| `urn:data:products` | Data product definitions |
| `urn:vocab:domains` | Business domains |
| `urn:vocab:lifecycle` | Lifecycle statuses |
| `urn:vocab:agents` | Owners and agents |
| `urn:vocab:protocols` | Access protocols |
| `urn:vocab:security` | Security types |
| `http://rdf4j.org/schema/rdf4j#SHACLShapeGraph` | SHACL validation shapes |

## Operations

### Add Statements (POST)

Add RDF statements to a named graph. Does not replace existing data.

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  --data-binary @data/products/my-product.ttl
```

### Replace Graph (PUT)

Replace all statements in a named graph.

```bash
curl -X PUT "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  --data-binary @data/products/all-products.ttl
```

### Get Graph (GET)

Retrieve all statements from a named graph.

```bash
curl "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Accept: text/turtle"
```

### Delete Graph (DELETE)

Remove all statements from a named graph.

```bash
curl -X DELETE "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>"
```

## Content Types

### Request Content-Type

| Format | Content-Type |
|--------|--------------|
| Turtle | `text/turtle` |
| JSON-LD | `application/ld+json` |
| RDF/XML | `application/rdf+xml` |
| N-Triples | `application/n-triples` |
| N-Quads | `application/n-quads` |
| TriG | `application/trig` |

### Response Accept

Same formats as above. Use the `Accept` header to specify desired format.

## Examples

### Load a Data Product

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  -d '
@prefix dprod: <https://ekgf.github.io/dprod/> .
@prefix rdfs: <http://www.w3.org/2000/01/rdf-schema#> .
@prefix dct: <http://purl.org/dc/terms/> .

<https://data.example.com/products/new-product>
    a dprod:DataProduct ;
    rdfs:label "New Product" ;
    dct:description "A new data product" ;
    dprod:dataProductOwner <https://data.example.com/agents/team-a> ;
    dprod:lifecycleStatus <https://data.example.com/lifecycle/Design> .
'
```

### Load from File

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  --data-binary @data/products/customer-360.ttl
```

### Export Graph as JSON-LD

```bash
curl "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Accept: application/ld+json" \
  -o products.jsonld
```

### Delete Specific Statements

Use SPARQL UPDATE to delete specific statements rather than entire graphs:

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: application/sparql-update" \
  -d '
DELETE WHERE {
  GRAPH <urn:data:products> {
    <https://data.example.com/products/old-product> ?p ?o .
  }
}'
```

## URL Encoding

The `context` parameter must be URL-encoded:

| Graph URI | Encoded |
|-----------|---------|
| `<urn:data:products>` | `%3Curn:data:products%3E` |

Most HTTP clients handle this automatically when using query parameters.

## Default Graph

Omit the `context` parameter to operate on the default graph:

```bash
# Add to default graph
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements" \
  -H "Content-Type: text/turtle" \
  --data-binary @file.ttl
```

## Transactions

GraphDB supports transactions for atomic operations. Use the transactions endpoint for multi-statement operations:

```bash
# Start transaction
TX_URL=$(curl -X POST "http://localhost:7200/repositories/dprod-catalog/transactions" -i | grep Location | cut -d' ' -f2)

# Add statements within transaction
curl -X PUT "$TX_URL?action=ADD&context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  --data-binary @file.ttl

# Commit
curl -X PUT "$TX_URL?action=COMMIT"

# Or rollback
curl -X DELETE "$TX_URL"
```

## Error Handling

| Status | Meaning |
|--------|---------|
| 200/204 | Success |
| 400 | Invalid RDF syntax |
| 404 | Repository or graph not found |
| 409 | Transaction conflict |
| 500 | Server error |
