# Ontologies

Local copies of ontologies used by the DPROD catalog. These provide version control and offline development capability.

## Sources

| File | Source | Description |
|------|--------|-------------|
| `prov-o.ttl` | https://www.w3.org/ns/prov-o.ttl | W3C PROV-O provenance ontology |
| `dcat.ttl` | https://www.w3.org/ns/dcat.ttl | W3C DCAT v3 data catalog vocabulary |
| `dprod.ttl` | https://ekgf.github.io/dprod/dprod.ttl | EKGF Data Product ontology |
| `dprod-shapes.ttl` | https://ekgf.github.io/dprod/dprod-shapes.ttl | DPROD SHACL validation shapes |

## Updating

To refresh ontologies from upstream sources:

```bash
curl -L https://www.w3.org/ns/prov-o.ttl -o ontologies/prov-o.ttl
curl -L https://www.w3.org/ns/dcat.ttl -o ontologies/dcat.ttl
curl -L https://ekgf.github.io/dprod/dprod.ttl -o ontologies/dprod.ttl
curl -L https://ekgf.github.io/dprod/dprod-shapes.ttl -o ontologies/dprod-shapes.ttl
```

## Load Order

Ontologies must be loaded in dependency order:
1. `prov-o.ttl` (no dependencies)
2. `dcat.ttl` (depends on PROV-O)
3. `dprod.ttl` (depends on DCAT)
4. `dprod-shapes.ttl` (SHACL shapes for DPROD)
