import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  Database,
  GitBranch,
  AlertTriangle,
  CheckCircle,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { productsApi, qualityApi, healthApi } from '../api/client';

export default function DashboardPage() {
  const { data: products } = useQuery({
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

  const domains = products?.reduce((acc, p) => {
    if (p.domain_label && !acc.includes(p.domain_label)) {
      acc.push(p.domain_label);
    }
    return acc;
  }, [] as string[]);

  const statusCounts = products?.reduce(
    (acc, p) => {
      const status = p.status_uri?.split(':').pop() || 'Unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">
          Welcome to the DPROD Data Product Catalog
        </p>
      </div>

      {/* Health status */}
      <div
        className={`rounded-lg p-4 flex items-center gap-3 ${
          health?.graphdb_connected
            ? 'bg-green-50 border border-green-200'
            : 'bg-red-50 border border-red-200'
        }`}
      >
        {health?.graphdb_connected ? (
          <>
            <CheckCircle className="text-green-600" size={24} />
            <div>
              <p className="font-medium text-green-800">System Healthy</p>
              <p className="text-sm text-green-600">
                Connected to GraphDB ({health.repository})
              </p>
            </div>
          </>
        ) : (
          <>
            <AlertTriangle className="text-red-600" size={24} />
            <div>
              <p className="font-medium text-red-800">Connection Issue</p>
              <p className="text-sm text-red-600">
                Unable to connect to GraphDB
              </p>
            </div>
          </>
        )}
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Products"
          value={products?.length || 0}
          icon={Database}
          link="/catalog"
          color="blue"
        />
        <StatCard
          title="Domains"
          value={domains?.length || 0}
          icon={GitBranch}
          link="/catalog"
          color="purple"
        />
        <StatCard
          title="Quality Issues"
          value={quality?.total_issues || 0}
          icon={AlertTriangle}
          link="/quality"
          color={quality?.high_severity_count ? 'red' : 'green'}
        />
        <StatCard
          title="In Production"
          value={statusCounts?.Consume || 0}
          icon={Activity}
          link="/catalog?status=Consume"
          color="green"
        />
      </div>

      {/* Two column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent products */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Recent Products
            </h2>
            <Link
              to="/catalog"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View all <ArrowRight size={16} />
            </Link>
          </div>

          <div className="space-y-3">
            {products?.slice(0, 5).map((product) => (
              <div
                key={product.uri}
                className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
              >
                <div>
                  <p className="font-medium text-gray-900">{product.label}</p>
                  <p className="text-sm text-gray-500">
                    {product.domain_label || 'No domain'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(
                    product.status_uri
                  )}`}
                >
                  {product.status_uri?.split(':').pop() || 'Unknown'}
                </span>
              </div>
            ))}

            {(!products || products.length === 0) && (
              <p className="text-gray-500 text-center py-4">
                No products found
              </p>
            )}
          </div>
        </div>

        {/* Quality overview */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">
              Quality Overview
            </h2>
            <Link
              to="/quality"
              className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
            >
              View details <ArrowRight size={16} />
            </Link>
          </div>

          {quality ? (
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-gray-600">Catalog Health</span>
                    <span className="text-sm font-medium">
                      {Math.round(
                        ((products?.length || 0) - (quality.total_issues || 0)) /
                          Math.max(products?.length || 1, 1) *
                          100
                      )}
                      %
                    </span>
                  </div>
                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-green-500"
                      style={{
                        width: `${Math.round(
                          ((products?.length || 0) - (quality.total_issues || 0)) /
                            Math.max(products?.length || 1, 1) *
                            100
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                <div className="text-center">
                  <p className="text-2xl font-bold text-red-600">
                    {quality.high_severity_count}
                  </p>
                  <p className="text-xs text-gray-500">High</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">
                    {quality.medium_severity_count}
                  </p>
                  <p className="text-xs text-gray-500">Medium</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-blue-600">
                    {quality.low_severity_count}
                  </p>
                  <p className="text-xs text-gray-500">Low</p>
                </div>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">
              Loading quality data...
            </p>
          )}
        </div>
      </div>

      {/* Quick actions */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-3">
          <Link
            to="/register"
            className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            Register New Product
          </Link>
          <Link
            to="/quality"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Run Quality Check
          </Link>
          <Link
            to="/lineage"
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
          >
            Explore Lineage
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  link,
  color,
}: {
  title: string;
  value: number;
  icon: typeof Database;
  link: string;
  color: 'blue' | 'purple' | 'red' | 'green';
}) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    red: 'bg-red-50 text-red-600',
    green: 'bg-green-50 text-green-600',
  };

  return (
    <Link
      to={link}
      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-md transition-shadow"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </Link>
  );
}

function getStatusColor(status?: string) {
  if (!status) return 'bg-gray-100 text-gray-600';
  if (status.includes('Consume')) return 'bg-green-100 text-green-700';
  if (status.includes('Build')) return 'bg-blue-100 text-blue-700';
  if (status.includes('Design')) return 'bg-yellow-100 text-yellow-700';
  if (status.includes('Retire')) return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
}
