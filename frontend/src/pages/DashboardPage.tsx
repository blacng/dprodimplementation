import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
// Direct imports to avoid barrel file bundle bloat (~1MB savings)
import Database from 'lucide-react/dist/esm/icons/database';
import GitBranch from 'lucide-react/dist/esm/icons/git-branch';
import AlertTriangle from 'lucide-react/dist/esm/icons/alert-triangle';
import ArrowRight from 'lucide-react/dist/esm/icons/arrow-right';
import Activity from 'lucide-react/dist/esm/icons/activity';
import Plus from 'lucide-react/dist/esm/icons/plus';
import Search from 'lucide-react/dist/esm/icons/search';
import Zap from 'lucide-react/dist/esm/icons/zap';
import Hexagon from 'lucide-react/dist/esm/icons/hexagon';
import Radio from 'lucide-react/dist/esm/icons/radio';
import { productsApi, qualityApi, healthApi } from '../api/client';

export default function DashboardPage() {
  const { data: products, isLoading: productsLoading } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  const { data: quality } = useQuery({
    queryKey: ['quality'],
    queryFn: qualityApi.getReport,
  });

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: healthApi.check,
  });

  // Memoize derived state to prevent recalculation on every render
  const domains = useMemo(() =>
    products?.reduce((acc, p) => {
      if (p.domain_label && !acc.includes(p.domain_label)) {
        acc.push(p.domain_label);
      }
      return acc;
    }, [] as string[]),
    [products]
  );

  const statusCounts = useMemo(() =>
    products?.reduce(
      (acc, p) => {
        const status = p.status_uri?.split(':').pop() || 'Unknown';
        acc[status] = (acc[status] || 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    ),
    [products]
  );

  // Health score weighted by severity: high=10, medium=5, low=1
  const healthScore = useMemo(() =>
    quality && products
      ? Math.max(0, Math.min(100, Math.round(
          100 - (quality.high_severity_count * 10 + quality.medium_severity_count * 5 + quality.low_severity_count * 1)
        )))
      : 0,
    [quality, products]
  );

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

      <div className="relative z-10 max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header
          className="flex items-end justify-between border-b border-slate-800 pb-6"
          style={{ animation: 'fadeSlideDown 0.6s ease-out' }}
        >
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Hexagon className="text-cyan-400" size={28} strokeWidth={1.5} />
              <span className="text-xs font-mono uppercase tracking-[0.3em] text-slate-500">
                DPROD // Data Mesh
              </span>
            </div>
            <h1 className="text-4xl font-light text-white tracking-tight">
              Command Center
            </h1>
          </div>
          <div className="text-right">
            <p className="text-xs font-mono text-slate-600 uppercase tracking-wider">
              Last sync
            </p>
            <p className="text-sm font-mono text-slate-400">
              {new Date().toLocaleTimeString()}
            </p>
          </div>
        </header>

        {/* Mission Status - Hero Section */}
        <div
          className="relative rounded-2xl overflow-hidden"
          style={{ animation: 'fadeSlideUp 0.6s ease-out 0.1s both' }}
        >
          {/* Animated border glow */}
          <div
            className={`absolute inset-0 rounded-2xl ${
              health?.graphdb_connected
                ? 'bg-gradient-to-r from-cyan-500/20 via-emerald-500/20 to-cyan-500/20'
                : 'bg-gradient-to-r from-red-500/20 via-amber-500/20 to-red-500/20'
            }`}
            style={{
              animation: 'shimmer 3s ease-in-out infinite',
            }}
          />

          <div className="relative bg-slate-900/90 backdrop-blur-xl m-[1px] rounded-2xl p-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {/* Pulsing status indicator */}
                <div className="relative">
                  <div
                    className={`w-20 h-20 rounded-full flex items-center justify-center ${
                      health?.graphdb_connected
                        ? 'bg-cyan-500/10 border border-cyan-500/30'
                        : 'bg-red-500/10 border border-red-500/30'
                    }`}
                  >
                    {health?.graphdb_connected ? (
                      <Radio className="text-cyan-400" size={32} />
                    ) : (
                      <AlertTriangle className="text-red-400" size={32} />
                    )}
                  </div>
                  <div
                    className={`absolute inset-0 rounded-full ${
                      health?.graphdb_connected ? 'bg-cyan-400/20' : 'bg-red-400/20'
                    }`}
                    style={{
                      animation: 'pulse-ring 2s ease-out infinite',
                    }}
                  />
                </div>

                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span
                      className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono uppercase tracking-wider ${
                        health?.graphdb_connected
                          ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                          : 'bg-red-500/10 text-red-400 border border-red-500/30'
                      }`}
                    >
                      <span
                        className={`w-2 h-2 rounded-full ${
                          health?.graphdb_connected ? 'bg-cyan-400' : 'bg-red-400'
                        }`}
                        style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
                      />
                      {health?.graphdb_connected ? 'ONLINE' : 'OFFLINE'}
                    </span>
                  </div>
                  <h2 className="text-2xl font-light text-white">
                    {health?.graphdb_connected ? 'All Systems Operational' : 'Connection Lost'}
                  </h2>
                  <p className="text-slate-500 font-mono text-sm mt-1">
                    {health?.graphdb_connected
                      ? `Repository: ${health.repository} • ${health.product_count || 0} products indexed`
                      : 'Unable to reach GraphDB instance'}
                  </p>
                </div>
              </div>

              {/* Health Score Ring */}
              <div className="text-center">
                <div className="relative w-32 h-32">
                  <svg className="w-full h-full transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="currentColor"
                      strokeWidth="8"
                      fill="none"
                      className="text-slate-800"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r="56"
                      stroke="url(#healthGradient)"
                      strokeWidth="8"
                      fill="none"
                      strokeLinecap="round"
                      strokeDasharray={`${healthScore * 3.52} 352`}
                      style={{
                        transition: 'stroke-dasharray 1s ease-out',
                      }}
                    />
                    <defs>
                      <linearGradient id="healthGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#06b6d4" />
                        <stop offset="100%" stopColor="#10b981" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-light text-white font-mono">
                      {healthScore}
                    </span>
                    <span className="text-xs text-slate-500 uppercase tracking-wider">
                      Health
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-4 gap-4">
          {[
            {
              title: 'Products',
              value: products?.length || 0,
              icon: Database,
              link: '/catalog',
              color: 'cyan',
              delay: '0.2s'
            },
            {
              title: 'Domains',
              value: domains?.length || 0,
              icon: GitBranch,
              link: '/catalog',
              color: 'violet',
              delay: '0.3s'
            },
            {
              title: 'Issues',
              value: quality?.total_issues || 0,
              icon: AlertTriangle,
              link: '/quality',
              color: quality?.high_severity_count ? 'amber' : 'emerald',
              delay: '0.4s'
            },
            {
              title: 'Live',
              value: statusCounts?.Consume || 0,
              icon: Activity,
              link: '/catalog',
              color: 'emerald',
              delay: '0.5s'
            },
          ].map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>

        {/* Two Column Layout */}
        <div className="grid grid-cols-5 gap-6">
          {/* Products List - Takes 3 columns */}
          <div
            className="col-span-3 bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl overflow-hidden"
            style={{ animation: 'fadeSlideUp 0.6s ease-out 0.6s both' }}
          >
            <div className="flex items-center justify-between p-5 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <Database className="text-slate-600" size={18} />
                <h3 className="font-mono text-sm uppercase tracking-wider text-slate-400">
                  Data Products
                </h3>
              </div>
              <Link
                to="/catalog"
                className="flex items-center gap-2 text-xs font-mono text-cyan-400 hover:text-cyan-300 transition-colors group"
              >
                View all
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            <div className="divide-y divide-slate-800/50">
              {productsLoading ? (
                <div className="p-8 text-center">
                  <div className="inline-block w-6 h-6 border-2 border-cyan-400/30 border-t-cyan-400 rounded-full animate-spin" />
                </div>
              ) : products?.slice(0, 5).map((product, idx) => (
                <Link
                  key={product.uri}
                  to={`/catalog/${encodeURIComponent(product.uri)}`}
                  className="block p-4 hover:bg-slate-800/30 transition-colors group"
                  style={{ animation: `fadeSlideRight 0.4s ease-out ${0.7 + idx * 0.1}s both` }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${getStatusBg(product.status_uri)}`}>
                        <Hexagon size={18} className={getStatusIcon(product.status_uri)} strokeWidth={1.5} />
                      </div>
                      <div>
                        <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                          {product.label}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {product.domain_label || 'Uncategorized'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`px-2 py-1 text-xs font-mono rounded ${getStatusPill(product.status_uri)}`}>
                        {product.status_uri?.split(':').pop() || 'Unknown'}
                      </span>
                      <ArrowRight size={16} className="text-slate-600 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </Link>
              ))}

              {(!products || products.length === 0) && !productsLoading && (
                <div className="p-8 text-center text-slate-600">
                  No products found
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Takes 2 columns */}
          <div className="col-span-2 space-y-6">
            {/* Quality Breakdown */}
            <div
              className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-5"
              style={{ animation: 'fadeSlideUp 0.6s ease-out 0.7s both' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <Zap className="text-slate-600" size={18} />
                <h3 className="font-mono text-sm uppercase tracking-wider text-slate-400">
                  Quality Signals
                </h3>
              </div>

              {quality ? (
                <div className="space-y-4">
                  <QualityBar
                    label="Critical"
                    count={quality.high_severity_count}
                    total={quality.total_issues}
                    color="red"
                  />
                  <QualityBar
                    label="Warning"
                    count={quality.medium_severity_count}
                    total={quality.total_issues}
                    color="amber"
                  />
                  <QualityBar
                    label="Info"
                    count={quality.low_severity_count}
                    total={quality.total_issues}
                    color="cyan"
                  />
                </div>
              ) : (
                <div className="h-24 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-slate-700 border-t-slate-400 rounded-full animate-spin" />
                </div>
              )}

              <Link
                to="/quality"
                className="mt-5 flex items-center justify-center gap-2 w-full py-3 rounded-lg border border-slate-700 text-sm font-mono text-slate-400 hover:text-white hover:border-slate-600 hover:bg-slate-800/50 transition-all group"
              >
                Open Quality Dashboard
                <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>

            {/* Quick Actions */}
            <div
              className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-5"
              style={{ animation: 'fadeSlideUp 0.6s ease-out 0.8s both' }}
            >
              <div className="flex items-center gap-3 mb-5">
                <Zap className="text-slate-600" size={18} />
                <h3 className="font-mono text-sm uppercase tracking-wider text-slate-400">
                  Quick Actions
                </h3>
              </div>

              <div className="space-y-3">
                <Link
                  to="/register"
                  className="flex items-center gap-4 p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-emerald-500/10 border border-cyan-500/20 hover:border-cyan-500/40 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                    <Plus className="text-cyan-400" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                      Register Product
                    </p>
                    <p className="text-xs text-slate-500">Add new data product</p>
                  </div>
                </Link>

                <Link
                  to="/lineage"
                  className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <GitBranch className="text-slate-400" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                      Explore Lineage
                    </p>
                    <p className="text-xs text-slate-500">Trace data flows</p>
                  </div>
                </Link>

                <Link
                  to="/catalog"
                  className="flex items-center gap-4 p-4 rounded-lg bg-slate-800/30 border border-slate-700/50 hover:border-slate-600 transition-all group"
                >
                  <div className="w-10 h-10 rounded-lg bg-slate-800 flex items-center justify-center">
                    <Search className="text-slate-400" size={20} />
                  </div>
                  <div>
                    <p className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                      Search Catalog
                    </p>
                    <p className="text-xs text-slate-500">Find data products</p>
                  </div>
                </Link>
              </div>
            </div>
          </div>
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
        @keyframes fadeSlideRight {
          from { opacity: 0; transform: translateX(-20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes pulse-ring {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; }
          50% { opacity: 1; }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}

function MetricCard({
  title,
  value,
  icon: Icon,
  link,
  color,
  delay
}: {
  title: string;
  value: number;
  icon: typeof Database;
  link: string;
  color: string;
  delay: string;
}) {
  const colorMap: Record<string, { bg: string; text: string; border: string; glow: string }> = {
    cyan: {
      bg: 'bg-cyan-500/10',
      text: 'text-cyan-400',
      border: 'border-cyan-500/20 hover:border-cyan-500/40',
      glow: 'group-hover:shadow-cyan-500/20'
    },
    violet: {
      bg: 'bg-violet-500/10',
      text: 'text-violet-400',
      border: 'border-violet-500/20 hover:border-violet-500/40',
      glow: 'group-hover:shadow-violet-500/20'
    },
    amber: {
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20 hover:border-amber-500/40',
      glow: 'group-hover:shadow-amber-500/20'
    },
    emerald: {
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20 hover:border-emerald-500/40',
      glow: 'group-hover:shadow-emerald-500/20'
    },
  };

  const colors = colorMap[color] || colorMap.cyan;

  return (
    <Link
      to={link}
      className={`group relative bg-slate-900/50 backdrop-blur rounded-xl border p-5 transition-all hover:shadow-lg ${colors.border} ${colors.glow}`}
      style={{ animation: `fadeSlideUp 0.6s ease-out ${delay} both` }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-mono uppercase tracking-wider text-slate-500 mb-2">
            {title}
          </p>
          <p className={`text-4xl font-light ${colors.text} font-mono`}>
            {value}
          </p>
        </div>
        <div className={`p-3 rounded-lg ${colors.bg}`}>
          <Icon className={colors.text} size={20} />
        </div>
      </div>

      {/* Hover indicator */}
      <div className={`absolute bottom-0 left-0 right-0 h-0.5 ${colors.bg} transform scale-x-0 group-hover:scale-x-100 transition-transform origin-left`} />
    </Link>
  );
}

function QualityBar({
  label,
  count,
  total,
  color
}: {
  label: string;
  count: number;
  total: number;
  color: 'red' | 'amber' | 'cyan';
}) {
  const percentage = total > 0 ? (count / total) * 100 : 0;

  const colorMap = {
    red: { bar: 'bg-red-500', text: 'text-red-400', bg: 'bg-red-500/10' },
    amber: { bar: 'bg-amber-500', text: 'text-amber-400', bg: 'bg-amber-500/10' },
    cyan: { bar: 'bg-cyan-500', text: 'text-cyan-400', bg: 'bg-cyan-500/10' },
  };

  const colors = colorMap[color];

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-slate-400">{label}</span>
        <span className={`text-sm font-mono ${colors.text}`}>{count}</span>
      </div>
      <div className={`h-2 rounded-full ${colors.bg} overflow-hidden`}>
        <div
          className={`h-full ${colors.bar} rounded-full transition-all duration-1000`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function getStatusBg(status?: string) {
  if (!status) return 'bg-slate-800';
  if (status.includes('Consume')) return 'bg-emerald-500/10';
  if (status.includes('Build')) return 'bg-cyan-500/10';
  if (status.includes('Design')) return 'bg-amber-500/10';
  if (status.includes('Retire')) return 'bg-red-500/10';
  return 'bg-slate-800';
}

function getStatusIcon(status?: string) {
  if (!status) return 'text-slate-600';
  if (status.includes('Consume')) return 'text-emerald-400';
  if (status.includes('Build')) return 'text-cyan-400';
  if (status.includes('Design')) return 'text-amber-400';
  if (status.includes('Retire')) return 'text-red-400';
  return 'text-slate-600';
}

function getStatusPill(status?: string) {
  if (!status) return 'bg-slate-800 text-slate-400';
  if (status.includes('Consume')) return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
  if (status.includes('Build')) return 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20';
  if (status.includes('Design')) return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
  if (status.includes('Retire')) return 'bg-red-500/10 text-red-400 border border-red-500/20';
  return 'bg-slate-800 text-slate-400';
}
