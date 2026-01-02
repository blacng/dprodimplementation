"""Unit tests for the DPROD client."""

from datetime import date
from unittest.mock import MagicMock, patch

import pytest

from src.dprod import DPRODClient
from src.dprod.client import NotFoundError, QueryError


# -----------------------------------------------------------------------------
# Fixtures
# -----------------------------------------------------------------------------


@pytest.fixture
def mock_session():
    """Create a mock requests session."""
    with patch("src.dprod.client.requests.Session") as mock:
        yield mock.return_value


@pytest.fixture
def client(mock_session):
    """Create a client instance with mocked session."""
    return DPRODClient(base_url="http://localhost:7200", repository="dprod-catalog")


def make_sparql_response(bindings: list[dict]) -> dict:
    """Create a SPARQL JSON response."""
    return {
        "head": {"vars": list(bindings[0].keys()) if bindings else []},
        "results": {"bindings": bindings},
    }


def make_binding(**kwargs) -> dict:
    """Create a SPARQL binding from keyword arguments."""
    return {k: {"type": "literal" if not v.startswith("http") else "uri", "value": v} for k, v in kwargs.items() if v}


# -----------------------------------------------------------------------------
# Core Method Tests
# -----------------------------------------------------------------------------


class TestListProducts:
    """Tests for list_products method."""

    def test_returns_empty_list_when_no_products(self, client, mock_session):
        """Should return empty list when no products exist."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([]),
        )

        result = client.list_products()

        assert result == []

    def test_parses_product_summaries(self, client, mock_session):
        """Should parse product bindings into DataProductSummary objects."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    product="https://example.com/products/test",
                    label="Test Product",
                    description="A test product",
                    owner="https://example.com/agents/team-a",
                    ownerLabel="Team A",
                    domain="https://example.com/domains/analytics",
                    domainLabel="Analytics",
                    status="https://example.com/lifecycle/Consume",
                    created="2025-01-01",
                    modified="2025-01-02",
                ),
            ]),
        )

        result = client.list_products()

        assert len(result) == 1
        product = result[0]
        assert product.uri == "https://example.com/products/test"
        assert product.label == "Test Product"
        assert product.description == "A test product"
        assert product.owner_uri == "https://example.com/agents/team-a"
        assert product.owner_label == "Team A"
        assert product.domain_uri == "https://example.com/domains/analytics"
        assert product.domain_label == "Analytics"
        assert product.status_uri == "https://example.com/lifecycle/Consume"
        assert product.created == date(2025, 1, 1)
        assert product.modified == date(2025, 1, 2)

    def test_handles_missing_optional_fields(self, client, mock_session):
        """Should handle products with missing optional fields."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    product="https://example.com/products/minimal",
                    label="Minimal Product",
                    owner="https://example.com/agents/team-a",
                    status="https://example.com/lifecycle/Design",
                ),
            ]),
        )

        result = client.list_products()

        assert len(result) == 1
        product = result[0]
        assert product.uri == "https://example.com/products/minimal"
        assert product.label == "Minimal Product"
        assert product.description is None
        assert product.domain_uri is None
        assert product.created is None


class TestGetProduct:
    """Tests for get_product method."""

    def test_returns_product_details(self, client, mock_session):
        """Should return full product details."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    label="Customer 360",
                    description="Unified customer view",
                    owner="https://example.com/agents/team-a",
                    domain="https://example.com/domains/customer",
                    status="https://example.com/lifecycle/Consume",
                    created="2025-01-01",
                ),
            ]),
        )

        result = client.get_product("https://example.com/products/customer-360")

        assert result.uri == "https://example.com/products/customer-360"
        assert result.label == "Customer 360"
        assert result.description == "Unified customer view"

    def test_raises_not_found_for_missing_product(self, client, mock_session):
        """Should raise NotFoundError when product doesn't exist."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([]),
        )

        with pytest.raises(NotFoundError) as exc_info:
            client.get_product("https://example.com/products/nonexistent")

        assert "not found" in str(exc_info.value).lower()


class TestSearch:
    """Tests for search method."""

    def test_returns_matching_products(self, client, mock_session):
        """Should return products matching the search term."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    product="https://example.com/products/customer-360",
                    label="Customer 360",
                    description="Customer data",
                    status="https://example.com/lifecycle/Consume",
                    matchedField="label",
                ),
            ]),
        )

        result = client.search("customer")

        assert len(result) == 1
        assert result[0].label == "Customer 360"
        assert result[0].matched_field == "label"

    def test_returns_empty_for_no_matches(self, client, mock_session):
        """Should return empty list when nothing matches."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([]),
        )

        result = client.search("nonexistent")

        assert result == []


# -----------------------------------------------------------------------------
# Filter Method Tests
# -----------------------------------------------------------------------------


class TestFindByDomain:
    """Tests for find_by_domain method."""

    def test_returns_products_in_domain(self, client, mock_session):
        """Should return products in the specified domain."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    product="https://example.com/products/sales",
                    label="Sales Analytics",
                    owner="https://example.com/agents/team-b",
                    status="https://example.com/lifecycle/Consume",
                ),
            ]),
        )

        result = client.find_by_domain("https://example.com/domains/sales")

        assert len(result) == 1
        assert result[0].label == "Sales Analytics"
        assert result[0].domain_uri == "https://example.com/domains/sales"


class TestFindByStatus:
    """Tests for find_by_status method."""

    def test_returns_products_with_status(self, client, mock_session):
        """Should return products with the specified status."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    product="https://example.com/products/new",
                    label="New Product",
                    owner="https://example.com/agents/team-a",
                ),
            ]),
        )

        result = client.find_by_status("https://example.com/lifecycle/Design")

        assert len(result) == 1
        assert result[0].status_uri == "https://example.com/lifecycle/Design"


class TestFindByOwner:
    """Tests for find_by_owner method."""

    def test_returns_products_for_owner(self, client, mock_session):
        """Should return products owned by the specified owner."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    product="https://example.com/products/my-product",
                    label="My Product",
                    status="https://example.com/lifecycle/Consume",
                ),
            ]),
        )

        result = client.find_by_owner("https://example.com/agents/team-a")

        assert len(result) == 1
        assert result[0].owner_uri == "https://example.com/agents/team-a"


# -----------------------------------------------------------------------------
# Lineage Method Tests
# -----------------------------------------------------------------------------


class TestGetUpstream:
    """Tests for get_upstream method."""

    def test_returns_upstream_products(self, client, mock_session):
        """Should return upstream dependencies."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    upstream="https://example.com/products/source",
                    upstreamLabel="Source Product",
                    upstreamStatus="https://example.com/lifecycle/Consume",
                    viaPort="https://example.com/ports/data-port",
                    portLabel="Data Port",
                ),
            ]),
        )

        result = client.get_upstream("https://example.com/products/downstream")

        assert len(result) == 1
        assert result[0].product_uri == "https://example.com/products/source"
        assert result[0].product_label == "Source Product"
        assert result[0].port_label == "Data Port"


class TestGetDownstream:
    """Tests for get_downstream method."""

    def test_returns_downstream_consumers(self, client, mock_session):
        """Should return downstream consumers."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    downstream="https://example.com/products/consumer",
                    downstreamLabel="Consumer Product",
                    downstreamStatus="https://example.com/lifecycle/Consume",
                    viaPort="https://example.com/ports/output",
                ),
            ]),
        )

        result = client.get_downstream("https://example.com/products/source")

        assert len(result) == 1
        assert result[0].product_uri == "https://example.com/products/consumer"
        assert result[0].product_label == "Consumer Product"


# -----------------------------------------------------------------------------
# Statistics Method Tests
# -----------------------------------------------------------------------------


class TestStatsByDomain:
    """Tests for stats_by_domain method."""

    def test_returns_domain_counts(self, client, mock_session):
        """Should return product counts per domain."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    domain="https://example.com/domains/sales",
                    domainLabel="Sales",
                    productCount="5",
                ),
                make_binding(
                    domain="https://example.com/domains/marketing",
                    domainLabel="Marketing",
                    productCount="3",
                ),
            ]),
        )

        result = client.stats_by_domain()

        assert len(result) == 2
        assert result[0].domain_label == "Sales"
        assert result[0].product_count == 5
        assert result[1].domain_label == "Marketing"
        assert result[1].product_count == 3


class TestStatsByStatus:
    """Tests for stats_by_status method."""

    def test_returns_status_counts(self, client, mock_session):
        """Should return product counts per status."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: make_sparql_response([
                make_binding(
                    status="https://example.com/lifecycle/Consume",
                    statusLabel="Consume",
                    productCount="10",
                ),
            ]),
        )

        result = client.stats_by_status()

        assert len(result) == 1
        assert result[0].status_label == "Consume"
        assert result[0].product_count == 10


class TestCountProducts:
    """Tests for count_products method."""

    def test_returns_total_count(self, client, mock_session):
        """Should return total product count."""
        mock_session.get.return_value = MagicMock(
            status_code=200,
            json=lambda: {"results": {"bindings": [{"total": {"value": "42"}}]}},
        )

        result = client.count_products()

        assert result == 42


# -----------------------------------------------------------------------------
# Data Management Tests
# -----------------------------------------------------------------------------


class TestCreateProduct:
    """Tests for create_product method."""

    def test_sends_insert_query(self, client, mock_session):
        """Should send a SPARQL INSERT query."""
        mock_session.post.return_value = MagicMock(status_code=204)

        client.create_product(
            uri="https://example.com/products/new",
            label="New Product",
            owner_uri="https://example.com/agents/team-a",
            status_uri="https://example.com/lifecycle/Design",
            description="A new product",
            domain_uri="https://example.com/domains/test",
        )

        mock_session.post.assert_called_once()
        call_args = mock_session.post.call_args
        assert "INSERT DATA" in call_args.kwargs["data"]
        assert "New Product" in call_args.kwargs["data"]


class TestUpdateProductStatus:
    """Tests for update_product_status method."""

    def test_sends_update_query(self, client, mock_session):
        """Should send a SPARQL DELETE/INSERT query."""
        mock_session.post.return_value = MagicMock(status_code=204)

        client.update_product_status(
            uri="https://example.com/products/test",
            new_status_uri="https://example.com/lifecycle/Deploy",
        )

        mock_session.post.assert_called_once()
        call_args = mock_session.post.call_args
        assert "DELETE" in call_args.kwargs["data"]
        assert "INSERT" in call_args.kwargs["data"]
        assert "Deploy" in call_args.kwargs["data"]


class TestDeleteProduct:
    """Tests for delete_product method."""

    def test_sends_delete_query(self, client, mock_session):
        """Should send a SPARQL DELETE query."""
        mock_session.post.return_value = MagicMock(status_code=204)

        client.delete_product("https://example.com/products/old")

        mock_session.post.assert_called_once()
        call_args = mock_session.post.call_args
        assert "DELETE WHERE" in call_args.kwargs["data"]


# -----------------------------------------------------------------------------
# Error Handling Tests
# -----------------------------------------------------------------------------


class TestErrorHandling:
    """Tests for error handling."""

    def test_raises_query_error_on_400(self, client, mock_session):
        """Should raise QueryError for malformed queries."""
        mock_session.get.return_value = MagicMock(
            status_code=400,
            text="Lexical error at line 1",
        )

        with pytest.raises(QueryError) as exc_info:
            client.list_products()

        assert "invalid query" in str(exc_info.value).lower()

    def test_raises_not_found_error_on_404(self, client, mock_session):
        """Should raise NotFoundError when repository not found."""
        mock_session.get.return_value = MagicMock(
            status_code=404,
            text="Repository not found",
        )

        with pytest.raises(NotFoundError):
            client.list_products()


class TestHealthCheck:
    """Tests for health_check method."""

    def test_returns_true_when_healthy(self, client, mock_session):
        """Should return True when GraphDB is accessible."""
        mock_session.get.return_value = MagicMock(status_code=200)

        assert client.health_check() is True

    def test_returns_false_on_error(self, client, mock_session):
        """Should return False when GraphDB is not accessible."""
        mock_session.get.return_value = MagicMock(status_code=500)

        assert client.health_check() is False


# -----------------------------------------------------------------------------
# Client Configuration Tests
# -----------------------------------------------------------------------------


class TestClientConfiguration:
    """Tests for client configuration."""

    def test_default_configuration(self):
        """Should use default values."""
        client = DPRODClient()

        assert client.base_url == "http://localhost:7200"
        assert client.repository == "dprod-catalog"
        assert client.query_url == "http://localhost:7200/repositories/dprod-catalog"

    def test_custom_configuration(self):
        """Should accept custom values."""
        client = DPRODClient(
            base_url="http://graphdb.example.com:7200",
            repository="my-repo",
        )

        assert client.base_url == "http://graphdb.example.com:7200"
        assert client.repository == "my-repo"
        assert client.query_url == "http://graphdb.example.com:7200/repositories/my-repo"

    def test_strips_trailing_slash_from_base_url(self):
        """Should strip trailing slash from base URL."""
        client = DPRODClient(base_url="http://localhost:7200/")

        assert client.base_url == "http://localhost:7200"
