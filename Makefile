# DPROD GraphDB Makefile
# Usage: make [target]

.PHONY: help up down logs create-repo load-ontologies load-shapes load-vocab load-products setup setup-full health clean shell wait query queries-list test test-valid test-invalid test-validate-file

# Load environment variables
-include .env
export

# Default values
GRAPHDB_URL ?= http://localhost:7200
REPOSITORY_ID ?= dprod-catalog
SHACL_GRAPH = http://rdf4j.org/schema/rdf4j\#SHACLShapeGraph

# Ontology URLs
PROV_URL = https://www.w3.org/ns/prov-o.ttl
DCAT_URL = https://www.w3.org/ns/dcat.ttl
DPROD_URL = https://ekgf.github.io/dprod/dprod.ttl
DPROD_SHAPES_URL = https://ekgf.github.io/dprod/dprod-shapes.ttl

# Colors for output
GREEN = \033[0;32m
YELLOW = \033[0;33m
RED = \033[0;31m
NC = \033[0m

help: ## Show this help message
	@echo "DPROD GraphDB Management"
	@echo ""
	@echo "Usage: make [target]"
	@echo ""
	@echo "Targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-18s %s\n", $$1, $$2}'

up: ## Start GraphDB container
	@echo "$(GREEN)Starting GraphDB...$(NC)"
	@if [ ! -f .env ]; then cp .env.example .env; echo "Created .env from .env.example"; fi
	docker compose up -d
	@echo "$(GREEN)GraphDB starting at $(GRAPHDB_URL)$(NC)"

down: ## Stop GraphDB container
	@echo "$(YELLOW)Stopping GraphDB...$(NC)"
	docker compose down

logs: ## View container logs
	docker compose logs -f graphdb

shell: ## Open shell in GraphDB container
	docker compose exec graphdb /bin/bash

wait: ## Wait for GraphDB to be ready
	@echo "$(YELLOW)Waiting for GraphDB to be ready...$(NC)"
	@until curl -sf $(GRAPHDB_URL)/rest/repositories > /dev/null 2>&1; do \
		echo "  Waiting for GraphDB..."; \
		sleep 3; \
	done
	@echo "$(GREEN)GraphDB is ready!$(NC)"

create-repo: ## Create the dprod-catalog repository
	@echo "$(GREEN)Creating repository $(REPOSITORY_ID)...$(NC)"
	@if curl -sf $(GRAPHDB_URL)/rest/repositories/$(REPOSITORY_ID) > /dev/null 2>&1; then \
		echo "$(YELLOW)Repository $(REPOSITORY_ID) already exists$(NC)"; \
	else \
		curl -X POST $(GRAPHDB_URL)/rest/repositories \
			-H 'Content-Type: multipart/form-data' \
			-F "config=@config/dprod-repo-config.ttl" && \
		echo "$(GREEN)Repository $(REPOSITORY_ID) created$(NC)"; \
	fi

load-ontologies: ## Download and load PROV-O, DCAT, and DPROD ontologies
	@echo "$(GREEN)Loading ontologies...$(NC)"
	@mkdir -p .cache

	@echo "  Loading PROV-O ontology..."
	@curl -sfL $(PROV_URL) -o .cache/prov-o.ttl
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:ontology:prov%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @.cache/prov-o.ttl
	@echo "    $(GREEN)PROV-O loaded to urn:ontology:prov$(NC)"

	@echo "  Loading DCAT ontology..."
	@curl -sfL $(DCAT_URL) -o .cache/dcat.ttl
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:ontology:dcat%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @.cache/dcat.ttl
	@echo "    $(GREEN)DCAT loaded to urn:ontology:dcat$(NC)"

	@echo "  Loading DPROD ontology..."
	@curl -sfL $(DPROD_URL) -o .cache/dprod.ttl
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:ontology:dprod%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @.cache/dprod.ttl
	@echo "    $(GREEN)DPROD loaded to urn:ontology:dprod$(NC)"

load-shapes: ## Load DPROD SHACL validation shapes
	@echo "$(GREEN)Loading SHACL shapes...$(NC)"
	@mkdir -p .cache

	@echo "  Loading DPROD shapes..."
	@curl -sfL $(DPROD_SHAPES_URL) -o .cache/dprod-shapes.ttl
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Chttp://rdf4j.org/schema/rdf4j%23SHACLShapeGraph%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @.cache/dprod-shapes.ttl
	@echo "    $(GREEN)DPROD shapes loaded$(NC)"

	@echo "  Loading custom validation shapes..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Chttp://rdf4j.org/schema/rdf4j%23SHACLShapeGraph%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @config/custom-shapes.ttl
	@echo "    $(GREEN)Custom shapes loaded$(NC)"

	@echo "$(GREEN)All SHACL shapes loaded$(NC)"

setup: up wait create-repo load-ontologies load-shapes health ## Full setup: start, create repo, load ontologies and shapes
	@echo ""
	@echo "$(GREEN)============================================$(NC)"
	@echo "$(GREEN)DPROD GraphDB setup complete!$(NC)"
	@echo "$(GREEN)============================================$(NC)"
	@echo ""
	@echo "GraphDB Workbench: $(GRAPHDB_URL)"
	@echo "Repository: $(REPOSITORY_ID)"
	@echo ""

health: ## Verify deployment status
	@echo "$(GREEN)Running health checks...$(NC)"
	@echo ""

	@echo -n "  GraphDB responding: "
	@if curl -sf $(GRAPHDB_URL)/rest/repositories > /dev/null 2>&1; then \
		echo "$(GREEN)OK$(NC)"; \
	else \
		echo "$(RED)FAILED$(NC)"; exit 1; \
	fi

	@echo -n "  Repository exists:  "
	@if curl -sf $(GRAPHDB_URL)/rest/repositories/$(REPOSITORY_ID) > /dev/null 2>&1; then \
		echo "$(GREEN)OK$(NC)"; \
	else \
		echo "$(RED)FAILED$(NC)"; exit 1; \
	fi

	@echo -n "  DPROD ontology:     "
	@DPROD_COUNT=$$(curl -sf "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)" \
		--data-urlencode "query=SELECT (COUNT(*) as ?c) WHERE { GRAPH <urn:ontology:dprod> { ?s ?p ?o } }" \
		-H "Accept: application/sparql-results+json" | grep -oE '"value" *: *"[0-9]+"' | grep -oE '[0-9]+'); \
	if [ "$$DPROD_COUNT" -gt 0 ] 2>/dev/null; then \
		echo "$(GREEN)OK ($$DPROD_COUNT triples)$(NC)"; \
	else \
		echo "$(RED)FAILED$(NC)"; exit 1; \
	fi

	@echo -n "  SHACL shapes:       "
	@SHACL_COUNT=$$(curl -sf "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)" \
		--data-urlencode "query=SELECT (COUNT(*) as ?c) WHERE { GRAPH <http://rdf4j.org/schema/rdf4j#SHACLShapeGraph> { ?s ?p ?o } }" \
		-H "Accept: application/sparql-results+json" | grep -oE '"value" *: *"[0-9]+"' | grep -oE '[0-9]+'); \
	if [ "$$SHACL_COUNT" -gt 0 ] 2>/dev/null; then \
		echo "$(GREEN)OK ($$SHACL_COUNT triples)$(NC)"; \
	else \
		echo "$(RED)FAILED$(NC)"; exit 1; \
	fi

	@echo ""
	@echo "$(GREEN)All health checks passed!$(NC)"

clean: down ## Remove volumes and cached files
	@echo "$(RED)Cleaning up...$(NC)"
	docker compose down -v
	rm -rf .cache
	@echo "$(GREEN)Cleanup complete$(NC)"

load-vocab: ## Load supporting vocabularies (domains, agents, protocols, lifecycle)
	@echo "$(GREEN)Loading vocabularies...$(NC)"

	@echo "  Loading domains..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:vocab:domains%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/vocab/domains.ttl
	@echo "    $(GREEN)Domains loaded$(NC)"

	@echo "  Loading lifecycle statuses..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:vocab:lifecycle%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/vocab/lifecycle-status.ttl
	@echo "    $(GREEN)Lifecycle statuses loaded$(NC)"

	@echo "  Loading agents..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:vocab:agents%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/vocab/agents.ttl
	@echo "    $(GREEN)Agents loaded$(NC)"

	@echo "  Loading protocols..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:vocab:protocols%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/vocab/protocols.ttl
	@echo "    $(GREEN)Protocols loaded$(NC)"

	@echo "$(GREEN)All vocabularies loaded$(NC)"

load-products: ## Load sample data products
	@echo "$(GREEN)Loading data products...$(NC)"

	@echo "  Loading Customer 360..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:data:products%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/products/customer-360.ttl
	@echo "    $(GREEN)Customer 360 loaded$(NC)"

	@echo "  Loading Sales Analytics..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:data:products%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/products/sales-analytics.ttl
	@echo "    $(GREEN)Sales Analytics loaded$(NC)"

	@echo "  Loading HR Workforce..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:data:products%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/products/hr-workforce.ttl
	@echo "    $(GREEN)HR Workforce loaded$(NC)"

	@echo "  Loading Finance Reporting..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:data:products%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/products/finance-reporting.ttl
	@echo "    $(GREEN)Finance Reporting loaded$(NC)"

	@echo "  Loading Marketing Campaigns..."
	@curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3Curn:data:products%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @data/products/marketing-campaigns.ttl
	@echo "    $(GREEN)Marketing Campaigns loaded$(NC)"

	@echo "$(GREEN)All data products loaded$(NC)"

setup-full: setup load-vocab load-products ## Full setup including sample data
	@echo ""
	@echo "$(GREEN)============================================$(NC)"
	@echo "$(GREEN)DPROD full setup complete with sample data!$(NC)"
	@echo "$(GREEN)============================================$(NC)"

list-products: ## List all data products in the catalog
	@echo "$(GREEN)Data Products in Catalog:$(NC)"
	@curl -sf "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)" \
		--data-urlencode "query=PREFIX dprod: <https://ekgf.github.io/dprod/> PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#> PREFIX dct: <http://purl.org/dc/terms/> SELECT ?product ?label ?status WHERE { ?product a dprod:DataProduct ; rdfs:label ?label ; dprod:lifecycleStatus ?status . } ORDER BY ?label" \
		-H "Accept: text/csv"

# Query execution
# Usage: make query FILE=queries/list-products.rq [FORMAT=csv|json|xml]
query: ## Run a SPARQL query from file (FILE=path FORMAT=csv|json|xml)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: FILE parameter required$(NC)"; \
		echo "Usage: make query FILE=queries/list-products.rq [FORMAT=csv]"; \
		echo ""; \
		echo "Available queries:"; \
		ls -1 queries/*.rq 2>/dev/null | sed 's/^/  /'; \
		exit 1; \
	fi
	@if [ ! -f "$(FILE)" ]; then \
		echo "$(RED)Error: File $(FILE) not found$(NC)"; \
		exit 1; \
	fi
	@FORMAT=$${FORMAT:-csv}; \
	case $$FORMAT in \
		csv)  ACCEPT="text/csv" ;; \
		json) ACCEPT="application/sparql-results+json" ;; \
		xml)  ACCEPT="application/sparql-results+xml" ;; \
		*)    echo "$(RED)Unknown format: $$FORMAT$(NC)"; exit 1 ;; \
	esac; \
	echo "$(GREEN)Running query: $(FILE) (format: $$FORMAT)$(NC)"; \
	echo ""; \
	curl -sf "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)" \
		--data-urlencode "query@$(FILE)" \
		-H "Accept: $$ACCEPT"

queries-list: ## List available SPARQL queries
	@echo "$(GREEN)Available SPARQL Queries:$(NC)"
	@echo ""
	@echo "Core Queries:"
	@ls -1 queries/*.rq 2>/dev/null | grep -E '(list|get|find|search)' | sed 's/^/  /'
	@echo ""
	@echo "Lineage Queries:"
	@ls -1 queries/*.rq 2>/dev/null | grep 'lineage' | sed 's/^/  /'
	@echo ""
	@echo "Analytics Queries:"
	@ls -1 queries/*.rq 2>/dev/null | grep -E '(stats|recent)' | sed 's/^/  /'
	@echo ""
	@echo "Admin Queries:"
	@ls -1 queries/*.rq 2>/dev/null | grep -E '(orphan|missing|stale|without)' | sed 's/^/  /'
	@echo ""
	@echo "Usage: make query FILE=queries/<name>.rq [FORMAT=csv|json|xml]"

# Validation Tests using SPARQL-based validation
TEST_GRAPH = urn:test:validation

test: test-valid test-invalid ## Run all validation tests
	@echo ""
	@echo "$(GREEN)============================================$(NC)"
	@echo "$(GREEN)All validation tests completed!$(NC)"
	@echo "$(GREEN)============================================$(NC)"

test-valid: ## Test that valid examples pass validation
	@echo "$(GREEN)Testing valid data products...$(NC)"
	@echo ""
	@PASSED=0; FAILED=0; \
	for file in tests/valid/*.ttl; do \
		name=$$(basename "$$file" .ttl); \
		echo -n "  $$name: "; \
		curl -sf -X DELETE "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" > /dev/null 2>&1 || true; \
		if curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" \
			-H "Content-Type: text/turtle" \
			--data-binary @"$$file" > /dev/null 2>&1; then \
			VIOLATIONS=$$(curl -sf "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)" \
				--data-urlencode "query@queries/validate-count.rq" \
				-H "Accept: application/sparql-results+json" 2>/dev/null | grep -oE '"value" *: *"[0-9]+"' | grep -oE '[0-9]+' || echo "0"); \
			if [ "$$VIOLATIONS" = "0" ] || [ -z "$$VIOLATIONS" ]; then \
				echo "$(GREEN)PASS$(NC) (valid, no violations)"; \
				PASSED=$$((PASSED + 1)); \
			else \
				echo "$(RED)FAIL$(NC) (expected valid, got $$VIOLATIONS violations)"; \
				FAILED=$$((FAILED + 1)); \
			fi; \
		else \
			echo "$(RED)FAIL$(NC) (syntax error)"; \
			FAILED=$$((FAILED + 1)); \
		fi; \
	done; \
	curl -sf -X DELETE "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" > /dev/null 2>&1 || true; \
	echo ""; \
	echo "Valid tests: $$PASSED passed, $$FAILED failed"; \
	if [ $$FAILED -gt 0 ]; then exit 1; fi

test-invalid: ## Test that invalid examples fail validation
	@echo "$(GREEN)Testing invalid data products...$(NC)"
	@echo ""
	@PASSED=0; FAILED=0; \
	for file in tests/invalid/*.ttl; do \
		name=$$(basename "$$file" .ttl); \
		echo -n "  $$name: "; \
		curl -sf -X DELETE "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" > /dev/null 2>&1 || true; \
		if curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" \
			-H "Content-Type: text/turtle" \
			--data-binary @"$$file" > /dev/null 2>&1; then \
			VIOLATIONS=$$(curl -sf "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)" \
				--data-urlencode "query@queries/validate-count.rq" \
				-H "Accept: application/sparql-results+json" 2>/dev/null | grep -oE '"value" *: *"[0-9]+"' | grep -oE '[0-9]+' || echo "0"); \
			if [ "$$VIOLATIONS" != "0" ] && [ -n "$$VIOLATIONS" ]; then \
				echo "$(GREEN)PASS$(NC) (correctly detected $$VIOLATIONS violations)"; \
				PASSED=$$((PASSED + 1)); \
			else \
				echo "$(RED)FAIL$(NC) (expected violations, got none)"; \
				FAILED=$$((FAILED + 1)); \
			fi; \
		else \
			echo "$(GREEN)PASS$(NC) (rejected at parse time)"; \
			PASSED=$$((PASSED + 1)); \
		fi; \
	done; \
	curl -sf -X DELETE "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" > /dev/null 2>&1 || true; \
	echo ""; \
	echo "Invalid tests: $$PASSED passed, $$FAILED failed"; \
	if [ $$FAILED -gt 0 ]; then exit 1; fi

test-validate-file: ## Validate a single TTL file (FILE=path/to/file.ttl)
	@if [ -z "$(FILE)" ]; then \
		echo "$(RED)Error: FILE parameter required$(NC)"; \
		echo "Usage: make test-validate-file FILE=path/to/file.ttl"; \
		exit 1; \
	fi
	@echo "$(GREEN)Validating: $(FILE)$(NC)"
	@curl -sf -X DELETE "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" > /dev/null 2>&1 || true
	@if curl -sf -X POST "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" \
		-H "Content-Type: text/turtle" \
		--data-binary @"$(FILE)" > /dev/null 2>&1; then \
		echo "$(GREEN)File loaded. Checking constraints...$(NC)"; \
		echo ""; \
		curl -sf "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)" \
			--data-urlencode "query@queries/validate-product.rq" \
			-H "Accept: text/csv" | grep -v "^product,violation,message$$" || echo "No violations found"; \
	else \
		echo "$(RED)Failed to load file (syntax error)$(NC)"; \
	fi
	@curl -sf -X DELETE "$(GRAPHDB_URL)/repositories/$(REPOSITORY_ID)/statements?context=%3C$(TEST_GRAPH)%3E" > /dev/null 2>&1 || true
