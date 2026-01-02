import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Search, Filter, Grid, List, ArrowRight } from 'lucide-react';
import { productsApi } from '../api/client';
import type { DataProductSummary } from '../api/types';

export default function CatalogPage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedDomain, setSelectedDomain] = useState<string>('');

  // Fetch products
  const { data: products, isLoading } = useQuery({
    queryKey: ['products', selectedDomain],
    queryFn: () =>
      productsApi.list(selectedDomain ? { domain: selectedDomain } : undefined),
  });

  // Fetch domains for filter
  const { data: domains } = useQuery({
    queryKey: ['domains'],
    queryFn: productsApi.domains,
  });

  // Filter by search term
  const filteredProducts = products?.filter(
    (p) =>
      p.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Data Products</h1>

        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${
              viewMode === 'grid'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <Grid size={20} />
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${
              viewMode === 'list'
                ? 'bg-primary-100 text-primary-700'
                : 'bg-gray-100 text-gray-600'
            }`}
          >
            <List size={20} />
          </button>
        </div>
      </div>

      {/* Search and filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder="Search products..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="text-gray-400" size={20} />
          <select
            value={selectedDomain}
            onChange={(e) => setSelectedDomain(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Domains</option>
            {domains?.map((domain) => (
              <option key={domain.uri} value={domain.uri}>
                {domain.label} ({domain.product_count})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      )}

      {/* Products grid/list */}
      {!isLoading && filteredProducts && (
        <>
          <p className="text-sm text-gray-500">
            Showing {filteredProducts.length} products
          </p>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => (
                <ProductCard key={product.uri} product={product} />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {filteredProducts.map((product) => (
                <ProductRow key={product.uri} product={product} />
              ))}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {!isLoading && filteredProducts?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p>No products found matching your criteria.</p>
        </div>
      )}
    </div>
  );
}

function ProductCard({ product }: { product: DataProductSummary }) {
  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    if (status.includes('Consume')) return 'bg-green-100 text-green-700';
    if (status.includes('Build')) return 'bg-blue-100 text-blue-700';
    if (status.includes('Design')) return 'bg-yellow-100 text-yellow-700';
    if (status.includes('Retire')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const statusLabel = product.status_uri?.split(':').pop() || 'Unknown';

  return (
    <Link
      to={`/catalog/${encodeURIComponent(product.uri)}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md hover:border-primary-200 transition-all group"
    >
      <div className="flex items-start justify-between mb-2">
        <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
          {product.label}
        </h3>
        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
            product.status_uri
          )}`}
        >
          {statusLabel}
        </span>
      </div>

      <p className="text-sm text-gray-600 mb-4 line-clamp-2">
        {product.description || 'No description available'}
      </p>

      <div className="space-y-1 text-sm text-gray-500">
        {product.domain_label && (
          <p>
            <span className="font-medium">Domain:</span> {product.domain_label}
          </p>
        )}
        {product.owner_label && (
          <p>
            <span className="font-medium">Owner:</span> {product.owner_label}
          </p>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end">
        <span className="text-primary-600 group-hover:text-primary-700 text-sm font-medium flex items-center gap-1">
          View Details <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
        </span>
      </div>
    </Link>
  );
}

function ProductRow({ product }: { product: DataProductSummary }) {
  const getStatusColor = (status?: string) => {
    if (!status) return 'bg-gray-100 text-gray-600';
    if (status.includes('Consume')) return 'bg-green-100 text-green-700';
    if (status.includes('Build')) return 'bg-blue-100 text-blue-700';
    if (status.includes('Design')) return 'bg-yellow-100 text-yellow-700';
    if (status.includes('Retire')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  const statusLabel = product.status_uri?.split(':').pop() || 'Unknown';

  return (
    <Link
      to={`/catalog/${encodeURIComponent(product.uri)}`}
      className="block bg-white rounded-lg border border-gray-200 p-4 hover:shadow-sm hover:border-primary-200 transition-all group"
    >
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
            {product.label}
          </h3>
          <p className="text-sm text-gray-600 line-clamp-1">
            {product.description || 'No description'}
          </p>
        </div>

        <div className="text-sm text-gray-500 hidden md:block">
          {product.domain_label || '-'}
        </div>

        <div className="text-sm text-gray-500 hidden lg:block">
          {product.owner_label || '-'}
        </div>

        <span
          className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
            product.status_uri
          )}`}
        >
          {statusLabel}
        </span>

        <ArrowRight
          size={18}
          className="text-gray-400 group-hover:text-primary-600 group-hover:translate-x-1 transition-all"
        />
      </div>
    </Link>
  );
}
