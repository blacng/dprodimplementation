# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This project implements the **DPROD (Data Product Ontology)** specification for Ontotext GraphDB. DPROD extends W3C DCAT (Data Catalog Vocabulary) to describe Data Products in decentralized data architectures.

Key specifications are in `.claude/docs/`:
- `spec.md` - Complete technical specification for GraphDB configuration, SHACL validation, SPARQL queries, and API patterns
- `plan.md` - Implementation phases and project structure

## Development Commands

```bash
# Python environment (uses uv)
uv sync                    # Install dependencies
uv run python main.py      # Run main script
uv run pytest              # Run tests
uv run ruff check .        # Lint
uv run ruff format .       # Format

# GraphDB management (Docker)
make setup           # Full setup: start GraphDB, create repo, load ontologies
make up              # Start GraphDB container
make down            # Stop GraphDB container
make health          # Verify deployment status
make logs            # View container logs
make clean           # Remove volumes and cached files
```

## Architecture

### Target Directory Structure (from plan.md)

```
config/           # GraphDB repository configuration (dprod-repo-config.ttl)
ontologies/       # DPROD, DCAT, PROV-O ontology files (.ttl)
data/
  products/       # Data product definitions (.ttl)
  vocab/          # Supporting vocabularies (domains, lifecycle, agents)
queries/          # Reusable SPARQL queries (.rq)
scripts/          # Deployment and validation scripts
tests/
  valid/          # Valid test data for SHACL validation
  invalid/        # Invalid test data (expected to fail)
```

### Key Concepts

- **Named Graphs**: Data organized into separate graphs (`urn:ontology:*`, `urn:data:*`, `urn:vocab:*`)
- **SHACL Validation**: Must be enabled at repository creation time; shapes go in `http://rdf4j.org/schema/rdf4j#SHACLShapeGraph`
- **Ontology Dependencies**: DPROD → DCAT v3 → PROV-O (load in reverse order)

### Important Prefixes

```sparql
PREFIX dprod: <https://ekgf.github.io/dprod/>
PREFIX dcat: <http://www.w3.org/ns/dcat#>
PREFIX dct: <http://purl.org/dc/terms/>
PREFIX prov: <http://www.w3.org/ns/prov#>
PREFIX sh: <http://www.w3.org/ns/shacl#>
```

## GraphDB Interaction

Default endpoint: `http://localhost:7200`
Repository: `dprod-catalog`

```bash
# Query
curl -G "http://localhost:7200/repositories/dprod-catalog" \
  --data-urlencode "query=SELECT * WHERE { ?s a dprod:DataProduct } LIMIT 10" \
  -H "Accept: application/sparql-results+json"

# Load data to named graph
curl -X POST "http://localhost:7200/repositories/dprod-catalog/statements?context=<urn:data:products>" \
  -H "Content-Type: text/turtle" \
  --data-binary @file.ttl
```
