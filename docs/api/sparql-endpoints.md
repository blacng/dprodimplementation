# SPARQL Endpoints

This document describes the SPARQL endpoints available for querying the DPROD catalog.

## Base URL

```
http://localhost:7200
```

## Endpoints

### Query Endpoint

Execute SPARQL SELECT, CONSTRUCT, ASK, and DESCRIBE queries.

| Method | URL | Content-Type |
|--------|-----|--------------|
| GET | `/repositories/{repo}?query={sparql}` | - |
| POST | `/repositories/{repo}` | `application/sparql-query` |

**Repository**: `dprod-catalog`

### Update Endpoint

Execute SPARQL UPDATE operations (INSERT, DELETE).

| Method | URL | Content-Type |
|--------|-----|--------------|
| POST | `/repositories/{repo}/statements` | `application/sparql-update` |

## Request Headers

### Accept Headers for Query Results

| Format | Accept Header |
|--------|---------------|
| JSON | `application/sparql-results+json` |
| XML | `application/sparql-results+xml` |
| CSV | `text/csv` |
| TSV | `text/tab-separated-values` |

### Accept Headers for CONSTRUCT/DESCRIBE

| Format | Accept Header |
|--------|---------------|
| Turtle | `text/turtle` |
| JSON-LD | `application/ld+json` |
| RDF/XML | `application/rdf+xml` |
| N-Triples | `application/n-triples` |

## Examples

### GET Request (URL-encoded query)

```bash
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=SELECT * WHERE { ?s a <https://ekgf.github.io/dprod/DataProduct> } LIMIT 10" \
  -H "Accept: application/sparql-results+json"
```

### POST Request (query in body)

```bash
curl -X POST "http://localhost:7200/repositories/dprod-catalog" \
  -H "Content-Type: application/sparql-query" \
  -H "Accept: application/sparql-results+json" \
  -d "SELECT * WHERE { ?s a <https://ekgf.github.io/dprod/DataProduct> } LIMIT 10"
```

### CONSTRUCT Query (returns RDF)

```bash
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=CONSTRUCT { ?s ?p ?o } WHERE { ?s a <https://ekgf.github.io/dprod/DataProduct> ; ?p ?o } LIMIT 100" \
  -H "Accept: text/turtle"
```

## Common Prefixes

Include these prefixes in your SPARQL queries:

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
PREFIX xsd: <http://www.w3.org/2001/XMLSchema#>
PREFIX prov: <http://www.w3.org/ns/prov#>
```

## Query Files

Pre-built queries are available in the `queries/` directory:

| File | Purpose |
|------|---------|
| `list-products.rq` | List all data products |
| `get-product.rq` | Get details for a specific product |
| `search.rq` | Full-text search |
| `find-by-domain.rq` | Filter by business domain |
| `find-by-status.rq` | Filter by lifecycle status |
| `find-by-owner.rq` | Filter by owner |
| `lineage-upstream.rq` | Trace data sources |
| `lineage-downstream.rq` | Trace consumers |
| `stats-by-domain.rq` | Count products per domain |
| `stats-by-status.rq` | Count products per status |

### Execute a Query File

```bash
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=$(cat queries/list-products.rq)" \
  -H "Accept: application/sparql-results+json"
```

Or use the Makefile:

```bash
make query QUERY=list-products
```

## Error Handling

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 400 | Malformed query |
| 404 | Repository not found |
| 500 | Server error |

Error responses include a message in the body:

```json
{
  "message": "Lexical error at line 1, column 15. Encountered: <EOF>"
}
```

## Rate Limits

No rate limits for local development. Production deployments should configure appropriate limits in GraphDB.
