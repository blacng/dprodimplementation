import { useQuery } from '@tanstack/react-query';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Copy,
  Database,
  ExternalLink,
  FileJson,
  GitBranch,
  Globe,
  Hexagon,
  Layers,
  Server,
  User,
  Calendar,
  Check,
} from 'lucide-react';
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
      <div className="min-h-screen bg-slate-950 -m-6 p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block w-10 h-10 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin mb-4" />
          <p className="text-slate-400 font-mono text-sm">Loading product details...</p>
        </div>
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="min-h-screen bg-slate-950 -m-6 p-6 flex items-center justify-center">
        <div className="text-center">
          <Database className="mx-auto text-red-400 mb-4" size={48} />
          <h2 className="text-xl text-white mb-2">Product Not Found</h2>
          <p className="text-slate-400 font-mono text-sm mb-6">
            {decodedUri || 'Unknown URI'}
          </p>
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={16} />
            Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const statusName = product.status_uri?.split(':').pop() || 'Unknown';

  return (
    <div className="min-h-screen bg-slate-950 -m-6 p-6 relative overflow-hidden">
      {/* Background grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Radial glow */}
      <div
        className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[600px] opacity-20"
        style={{
          background: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.4) 0%, transparent 70%)',
        }}
      />

      <div className="relative z-10 max-w-5xl mx-auto space-y-6">
        {/* Breadcrumb */}
        <nav
          className="flex items-center gap-2 text-sm"
          style={{ animation: 'fadeSlideDown 0.4s ease-out' }}
        >
          <Link to="/catalog" className="text-slate-500 hover:text-cyan-400 transition-colors">
            Catalog
          </Link>
          <ChevronRight className="text-slate-600" size={16} />
          <span className="text-white font-medium truncate max-w-md">{product.label}</span>
        </nav>

        {/* Header Card */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ animation: 'fadeSlideUp 0.5s ease-out 0.1s both' }}
        >
          <div className={`absolute inset-0 rounded-2xl ${getStatusGradient(statusName)}`} />

          <div className="relative bg-slate-900/90 backdrop-blur-xl m-[1px] rounded-2xl p-8">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                {/* Status Badge */}
                <div className="flex items-center gap-3 mb-4">
                  <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-wider ${getStatusPill(statusName)}`}>
                    <span className={`w-2 h-2 rounded-full ${getStatusDot(statusName)}`} style={{ animation: 'pulse 1.5s ease-in-out infinite' }} />
                    {statusName}
                  </span>
                </div>

                {/* Title */}
                <h1 className="text-3xl font-light text-white tracking-tight mb-4">
                  {product.label}
                </h1>

                {/* Meta Row */}
                <div className="flex flex-wrap items-center gap-6 text-sm">
                  {product.owner_label && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <User size={16} className="text-slate-500" />
                      <span>{product.owner_label}</span>
                    </div>
                  )}
                  {product.domain_label && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Layers size={16} className="text-slate-500" />
                      <span>{product.domain_label}</span>
                    </div>
                  )}
                  {product.created && (
                    <div className="flex items-center gap-2 text-slate-400">
                      <Calendar size={16} className="text-slate-500" />
                      <span>Created {product.created}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => navigate(`/lineage?product=${encodeURIComponent(product.uri)}`)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/30 rounded-lg text-cyan-400 hover:border-cyan-500/50 transition-all group"
                >
                  <GitBranch size={18} />
                  <span className="font-medium">View Lineage</span>
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                </button>

                <button
                  onClick={handleCopyUri}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                >
                  {copied ? (
                    <>
                      <Check size={18} className="text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy size={18} />
                      <span>Copy URI</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Description */}
        {product.description && (
          <div
            className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6"
            style={{ animation: 'fadeSlideUp 0.5s ease-out 0.2s both' }}
          >
            <h2 className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-3">
              Description
            </h2>
            <p className="text-slate-300 leading-relaxed">{product.description}</p>
          </div>
        )}

        {/* Output Ports */}
        <div
          className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl overflow-hidden"
          style={{ animation: 'fadeSlideUp 0.5s ease-out 0.3s both' }}
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Server className="text-emerald-400" size={18} />
              <h2 className="font-mono text-sm uppercase tracking-wider text-slate-400">
                Output Ports
              </h2>
            </div>
            <span className="px-2.5 py-1 bg-emerald-500/10 text-emerald-400 text-xs font-mono rounded-full border border-emerald-500/20">
              {product.output_ports.length}
            </span>
          </div>

          <div className="divide-y divide-slate-800/50">
            {product.output_ports.length > 0 ? (
              product.output_ports.map((port, idx) => (
                <PortCard key={port.uri || idx} port={port} type="output" index={idx} />
              ))
            ) : (
              <div className="p-8 text-center text-slate-600">
                <Server className="mx-auto mb-3 opacity-50" size={32} />
                <p>No output ports defined</p>
              </div>
            )}
          </div>
        </div>

        {/* Input Ports */}
        <div
          className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl overflow-hidden"
          style={{ animation: 'fadeSlideUp 0.5s ease-out 0.4s both' }}
        >
          <div className="flex items-center justify-between p-5 border-b border-slate-800">
            <div className="flex items-center gap-3">
              <Database className="text-violet-400" size={18} />
              <h2 className="font-mono text-sm uppercase tracking-wider text-slate-400">
                Input Ports
              </h2>
            </div>
            <span className="px-2.5 py-1 bg-violet-500/10 text-violet-400 text-xs font-mono rounded-full border border-violet-500/20">
              {product.input_ports.length}
            </span>
          </div>

          <div className="divide-y divide-slate-800/50">
            {product.input_ports.length > 0 ? (
              product.input_ports.map((port, idx) => (
                <PortCard key={port.uri || idx} port={port} type="input" index={idx} />
              ))
            ) : (
              <div className="p-8 text-center text-slate-600">
                <Database className="mx-auto mb-3 opacity-50" size={32} />
                <p>No input ports - this is a source data product</p>
              </div>
            )}
          </div>
        </div>

        {/* Back to Catalog */}
        <div
          className="pt-4"
          style={{ animation: 'fadeSlideUp 0.5s ease-out 0.5s both' }}
        >
          <Link
            to="/catalog"
            className="inline-flex items-center gap-2 text-slate-500 hover:text-cyan-400 transition-colors group"
          >
            <ArrowLeft size={16} className="group-hover:-translate-x-1 transition-transform" />
            <span className="font-mono text-sm">Back to Catalog</span>
          </Link>
        </div>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes fadeSlideDown {
          from { opacity: 0; transform: translateY(-20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function PortCard({
  port,
  type,
  index,
}: {
  port: DataServiceDetail;
  type: 'input' | 'output';
  index: number;
}) {
  const color = type === 'output' ? 'emerald' : 'violet';

  return (
    <div
      className="p-5 hover:bg-slate-800/30 transition-colors"
      style={{ animation: `fadeSlideUp 0.4s ease-out ${0.4 + index * 0.1}s both` }}
    >
      {/* Port Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-${color}-500/10 border border-${color}-500/20`}>
            <Hexagon size={18} className={`text-${color}-400`} strokeWidth={1.5} />
          </div>
          <div>
            <h3 className="font-medium text-white">{port.label || 'Unnamed Port'}</h3>
            {port.protocol_label && (
              <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-mono rounded bg-${color}-500/10 text-${color}-400 border border-${color}-500/20`}>
                {port.protocol_label}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Port Description */}
      {port.description && (
        <p className="text-sm text-slate-400 mb-4">{port.description}</p>
      )}

      {/* Endpoint URL */}
      {port.endpoint_url && (
        <div className="flex items-center gap-2 mb-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
          <Globe size={16} className="text-slate-500 flex-shrink-0" />
          <code className="text-sm text-cyan-400 font-mono break-all">{port.endpoint_url}</code>
          <a
            href={port.endpoint_url}
            target="_blank"
            rel="noopener noreferrer"
            className="ml-auto text-slate-500 hover:text-cyan-400 transition-colors flex-shrink-0"
          >
            <ExternalLink size={16} />
          </a>
        </div>
      )}

      {/* Dataset */}
      {port.serves_dataset && (
        <DatasetCard dataset={port.serves_dataset} />
      )}
    </div>
  );
}

function DatasetCard({ dataset }: { dataset: DatasetDetail }) {
  return (
    <div className="mt-4 p-4 bg-slate-800/40 rounded-lg border border-slate-700/30">
      <div className="flex items-center gap-2 mb-3">
        <Database size={16} className="text-cyan-400" />
        <h4 className="text-sm font-medium text-white">Dataset: {dataset.label || 'Unnamed'}</h4>
      </div>

      {dataset.description && (
        <p className="text-sm text-slate-400 mb-3">{dataset.description}</p>
      )}

      {dataset.conforms_to && (
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          <span className="uppercase tracking-wider">Conforms to:</span>
          <code className="text-cyan-400 font-mono">{dataset.conforms_to}</code>
        </div>
      )}

      {/* Distributions */}
      {dataset.distributions.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          <span className="text-xs text-slate-500 uppercase tracking-wider mr-1">Formats:</span>
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
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-700/50 text-slate-300 text-xs font-mono rounded border border-slate-600/50">
      <FileJson size={12} className="text-amber-400" />
      {shortFormat?.toUpperCase()}
    </span>
  );
}

function getStatusGradient(status: string) {
  switch (status.toLowerCase()) {
    case 'consume':
      return 'bg-gradient-to-r from-emerald-500/20 via-cyan-500/20 to-emerald-500/20';
    case 'build':
      return 'bg-gradient-to-r from-cyan-500/20 via-blue-500/20 to-cyan-500/20';
    case 'design':
      return 'bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20';
    case 'retire':
      return 'bg-gradient-to-r from-red-500/20 via-rose-500/20 to-red-500/20';
    default:
      return 'bg-gradient-to-r from-slate-500/20 via-slate-400/20 to-slate-500/20';
  }
}

function getStatusPill(status: string) {
  switch (status.toLowerCase()) {
    case 'consume':
      return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30';
    case 'build':
      return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30';
    case 'design':
      return 'bg-amber-500/10 text-amber-400 border border-amber-500/30';
    case 'retire':
      return 'bg-red-500/10 text-red-400 border border-red-500/30';
    default:
      return 'bg-slate-500/10 text-slate-400 border border-slate-500/30';
  }
}

function getStatusDot(status: string) {
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
}
