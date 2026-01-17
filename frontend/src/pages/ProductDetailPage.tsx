import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
// Direct imports to avoid barrel file bundle bloat
import ArrowLeft from 'lucide-react/dist/esm/icons/arrow-left';
import Check from 'lucide-react/dist/esm/icons/check';
import Copy from 'lucide-react/dist/esm/icons/copy';
import ExternalLink from 'lucide-react/dist/esm/icons/external-link';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import { useState } from 'react';
import { productsApi } from '../api/client';
import type { DataServiceDetail, DatasetDetail, DistributionDetail } from '../api/types';

export default function ProductDetailPage() {
  const { productUri } = useParams<{ productUri: string }>();
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);

  const decodedUri = productUri ? decodeURIComponent(productUri) : '';

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['product-detail', decodedUri],
    queryFn: () => productsApi.getDetail(decodedUri),
    enabled: !!decodedUri,
  });

  const handleCopyUri = () => {
    if (product?.uri) {
      navigator.clipboard.writeText(product.uri);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-8 h-8 border-2 border-slate-700 border-t-cyan-400 rounded-full animate-spin mb-3" />
          <p className="text-slate-500 text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
            <span className="text-red-400 text-xl">!</span>
          </div>
          <h2 className="text-lg font-medium text-white mb-2">Product Not Found</h2>
          <p className="text-slate-500 text-sm mb-6 font-mono break-all">
            {decodedUri || 'Unknown URI'}
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-300 text-sm hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const statusName = product.status_label || product.status_uri?.split('/').pop() || 'Unknown';

  return (
    <div className="min-h-screen bg-slate-950" style={{ fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif" }}>
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm mb-6">
          <Link to="/catalog" className="text-slate-500 hover:text-cyan-400 transition-colors">
            Catalog
          </Link>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400">{product.label}</span>
        </nav>

        {/* Header */}
        <header className="flex justify-between items-start gap-8 mb-8 pb-8 border-b border-slate-800/50">
          <div className="flex-1">
            {/* Status Badge */}
            <div className="mb-3">
              <StatusBadge status={statusName} />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-semibold text-white tracking-tight mb-2">
              {product.label}
            </h1>

            {/* Description */}
            {product.description && (
              <p className="text-slate-400 text-[15px] leading-relaxed max-w-xl mb-5">
                {product.description}
              </p>
            )}

            {/* Meta Grid */}
            <div className="flex gap-8">
              {product.owner_label && (
                <MetaItem label="Owner" value={product.owner_label} />
              )}
              {product.domain_label && (
                <MetaItem label="Domain" value={product.domain_label} />
              )}
              {product.created && (
                <MetaItem label="Created" value={formatDate(product.created)} />
              )}
              {product.modified && (
                <MetaItem label="Modified" value={formatDate(product.modified)} />
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-2">
            <button
              onClick={() => navigate(`/lineage?product=${encodeURIComponent(product.uri)}`)}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/30 rounded-md text-cyan-400 text-sm font-medium hover:bg-cyan-500/15 hover:border-cyan-500/40 transition-all"
            >
              <GitBranch size={16} />
              View Lineage
            </button>
            <button
              onClick={handleCopyUri}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-md text-slate-400 text-sm font-medium hover:bg-slate-700 hover:text-slate-300 transition-all"
            >
              {copied ? (
                <>
                  <Check size={16} className="text-emerald-400" />
                  Copied
                </>
              ) : (
                <>
                  <Copy size={16} />
                  Copy URI
                </>
              )}
            </button>
          </div>
        </header>

        {/* Ports Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Output Ports */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Output Ports
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                {product.output_ports.length}
              </span>
            </div>

            <div className="space-y-3">
              {product.output_ports.length > 0 ? (
                product.output_ports.map((port, idx) => (
                  <PortCard key={port.uri || idx} port={port} />
                ))
              ) : (
                <EmptyState title="No output ports" description="This product has no outputs defined" />
              )}
            </div>
          </section>

          {/* Input Ports */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Input Ports
              </h2>
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-500">
                {product.input_ports.length}
              </span>
            </div>

            <div className="space-y-3">
              {product.input_ports.length > 0 ? (
                product.input_ports.map((port, idx) => (
                  <PortCard key={port.uri || idx} port={port} />
                ))
              ) : (
                <EmptyState title="No dependencies" description="This is a source data product" />
              )}
            </div>
          </section>
        </div>

        {/* Back Link */}
        <div className="mt-12 pt-6 border-t border-slate-800/50">
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            Back to Catalog
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const getStatusStyle = () => {
    switch (status.toLowerCase()) {
      case 'consume':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'build':
        return 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
      case 'design':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/20';
      case 'retire':
        return 'bg-red-500/10 text-red-400 border-red-500/20';
      default:
        return 'bg-slate-500/10 text-slate-400 border-slate-500/20';
    }
  };

  const getDotColor = () => {
    switch (status.toLowerCase()) {
      case 'consume':
        return 'bg-emerald-400';
      case 'build':
        return 'bg-cyan-400';
      case 'design':
        return 'bg-amber-400';
      case 'retire':
        return 'bg-red-400';
      default:
        return 'bg-slate-400';
    }
  };

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium uppercase tracking-wide border ${getStatusStyle()}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      {status}
    </span>
  );
}

function MetaItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] font-medium uppercase tracking-wider text-slate-600">
        {label}
      </span>
      <span className="text-sm text-slate-400">
        {value}
      </span>
    </div>
  );
}

function PortCard({ port }: { port: DataServiceDetail }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800/50 rounded-lg p-4">
      {/* Header */}
      <div className="flex items-center gap-3 mb-2">
        <span className="text-[15px] font-medium text-white">
          {port.label || 'Unnamed Port'}
        </span>
        {port.protocol_label && (
          <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-slate-800 text-slate-500 font-mono">
            {port.protocol_label}
          </span>
        )}
      </div>

      {/* Description */}
      {port.description && (
        <p className="text-sm text-slate-500 mb-3">
          {port.description}
        </p>
      )}

      {/* Endpoint */}
      {port.endpoint_url && (
        <div className="flex items-center gap-2 p-2.5 bg-slate-950 border border-slate-800/50 rounded mb-3">
          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600 flex-shrink-0">
            Endpoint
          </span>
          <code className="text-xs text-cyan-400 font-mono break-all flex-1">
            {port.endpoint_url}
          </code>
          <a
            href={port.endpoint_url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-600 hover:text-cyan-400 transition-colors flex-shrink-0"
          >
            <ExternalLink size={12} />
          </a>
        </div>
      )}

      {/* Dataset */}
      {port.serves_dataset && (
        <DatasetSection dataset={port.serves_dataset} />
      )}
    </div>
  );
}

function DatasetSection({ dataset }: { dataset: DatasetDetail }) {
  return (
    <div className="border-t border-slate-800/50 pt-3">
      <span className="text-[10px] font-medium uppercase tracking-wider text-slate-600 block mb-1.5">
        Dataset
      </span>
      <div className="text-sm font-medium text-slate-300 mb-1">
        {dataset.label || 'Unnamed Dataset'}
      </div>
      {dataset.description && (
        <p className="text-xs text-slate-500 mb-2">
          {dataset.description}
        </p>
      )}
      {dataset.distributions.length > 0 && (
        <div className="flex gap-1.5 flex-wrap">
          {dataset.distributions.map((dist, idx) => (
            <DistributionBadge key={dist.uri || idx} distribution={dist} />
          ))}
        </div>
      )}
    </div>
  );
}

function DistributionBadge({ distribution }: { distribution: DistributionDetail }) {
  const format = distribution.media_type || distribution.label || 'Unknown';
  const shortFormat = format.includes('/') ? format.split('/').pop() : format;

  return (
    <span className="inline-flex items-center px-2 py-0.5 bg-slate-950 border border-slate-800/50 rounded text-[11px] font-mono text-slate-400">
      {shortFormat?.toUpperCase()}
    </span>
  );
}

function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="p-6 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-lg">
      <div className="text-sm font-medium text-slate-500 mb-1">{title}</div>
      <p className="text-xs text-slate-600">{description}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
}
