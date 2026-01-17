# Data Product Governance Framework

This document defines the governance model for the DPROD catalog.

## Ownership Model

### Roles

| Role | Responsibilities |
|------|------------------|
| **Data Product Owner** | Accountable for a data product's quality, availability, and lifecycle |
| **Domain Owner** | Oversees all products in a business domain |
| **Catalog Admin** | Manages the catalog infrastructure and ontologies |
| **Data Steward** | Ensures data quality and compliance |
| **Consumer** | Uses data products for analytics or applications |

### Data Product Owner Responsibilities

1. **Quality** - Ensure data meets quality standards
2. **Documentation** - Maintain accurate product metadata
3. **Availability** - Meet SLOs for the product
4. **Security** - Ensure appropriate access controls
5. **Lifecycle** - Manage transitions between lifecycle stages
6. **Support** - Respond to consumer questions

### Ownership Assignment

Every data product MUST have:
- One owning team (`dprod:dataProductOwner`)
- One primary contact (documented externally)

Orphaned products (missing owner) are flagged by:
```bash
make query QUERY=missing-owners
```

## Lifecycle Governance

### Stage Gates

| Transition | Requirements |
|------------|--------------|
| Ideation → Design | Business case approved |
| Design → Build | Architecture review passed |
| Build → Deploy | Tests passing, security review |
| Deploy → Consume | Documentation complete, SLO defined |
| Consume → Retire | Migration plan, 30-day notice |

### Approval Authority

| Transition | Approver |
|------------|----------|
| Ideation → Design | Product Owner |
| Design → Build | Domain Owner |
| Build → Deploy | Tech Lead |
| Deploy → Consume | Domain Owner |
| Any → Retire | Domain Owner + Catalog Admin |

## Quality Standards

### Required Metadata

Every data product MUST have:
- [ ] Label (`rdfs:label`)
- [ ] Description (`dct:description`)
- [ ] Owner (`dprod:dataProductOwner`)
- [ ] Domain (`dprod:domain`)
- [ ] Lifecycle Status (`dprod:lifecycleStatus`)

Products in Consume status MUST also have:
- [ ] Purpose (`dprod:purpose`)
- [ ] At least one output port (`dprod:outputPort`)
- [ ] SLO documentation

### SHACL Validation

All products must pass SHACL validation:
```bash
make test-shacl
```

Validation runs automatically on:
- Pull request creation
- Push to main branch

### Data Quality Checks

Run periodically:
```bash
# Products missing descriptions
make query QUERY=missing-descriptions

# Products without output ports
make query QUERY=products-without-ports

# Stale products (not modified in 180 days)
make query QUERY=stale-products
```

## Change Management

### Adding a Data Product

1. Create TTL file in `data/products/`
2. Validate locally: `make test-shacl`
3. Submit pull request
4. Review by Domain Owner or delegate
5. Merge and deploy

### Modifying a Data Product

1. Edit TTL file
2. Update `dct:modified` date
3. Submit pull request
4. Review by Product Owner
5. Merge and deploy

### Retiring a Data Product

1. Change status to `Retire`
2. Notify consumers (30-day notice)
3. Submit pull request with migration notes
4. Domain Owner approval required
5. After transition period, archive TTL file

## Review Cadence

| Review | Frequency | Scope |
|--------|-----------|-------|
| Data Quality Audit | Monthly | Missing metadata, stale products |
| Ownership Review | Quarterly | Orphaned products, ownership changes |
| Domain Review | Quarterly | Products per domain, lineage |
| Catalog Health | Monthly | SLO compliance, incident review |

## Compliance

### Data Classification

Products MUST declare data sensitivity in documentation:
- Public
- Internal
- Confidential
- Restricted

### Retention

- Active products: Indefinite
- Retired products: Archive for 1 year, then delete
- Audit logs: Retain for 3 years

### Access Control

- Read access: All authenticated users
- Write access: Product owners and domain owners
- Admin access: Catalog administrators

## Exceptions

Exceptions to this governance framework require:
1. Written justification
2. Approval from Catalog Admin
3. Time-bound exception period
4. Review at expiration

## Metrics

Track governance health:

| Metric | Target |
|--------|--------|
| Products with complete metadata | > 95% |
| Products with defined SLOs | > 90% |
| Orphaned products | 0 |
| Stale products (180+ days) | < 10% |
| SHACL validation pass rate | 100% |
