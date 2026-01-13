import { useQuery } from '@tanstack/react-query';
import {
  AlertTriangle,
  AlertCircle,
  Info,
  Users,
  FileText,
  Clock,
  Database,
  Layers,
} from 'lucide-react';
import { qualityApi } from '../api/client';
import type { QualityIssue, QualityCheck } from '../api/types';

const CHECK_ICONS: Record<string, typeof AlertTriangle> = {
  missing_owners: Users,
  missing_descriptions: FileText,
  stale_products: Clock,
  orphaned_datasets: Database,
  incomplete_ports: Layers,
};

const CHECK_LABELS: Record<string, string> = {
  missing_owners: 'Missing Owners',
  missing_descriptions: 'Missing Descriptions',
  stale_products: 'Stale Products',
  orphaned_datasets: 'Orphaned Datasets',
  incomplete_ports: 'Incomplete Ports',
};

export default function QualityPage() {
  const { data: report, isLoading, error } = useQuery({
    queryKey: ['quality'],
    queryFn: qualityApi.getReport,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
        Failed to load quality report. Make sure GraphDB is running.
      </div>
    );
  }

  if (!report) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Quality Dashboard</h1>
        <p className="text-slate-500 mt-1">
          Monitor catalog health and resolve issues
        </p>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <SummaryCard
          title="Total Products"
          value={report.total_products}
          icon={Database}
          color="blue"
        />
        <SummaryCard
          title="Total Issues"
          value={report.total_issues}
          icon={AlertTriangle}
          color={report.total_issues > 0 ? 'yellow' : 'green'}
        />
        <SummaryCard
          title="High Severity"
          value={report.high_severity_count}
          icon={AlertCircle}
          color={report.high_severity_count > 0 ? 'red' : 'green'}
        />
        <SummaryCard
          title="Medium/Low"
          value={report.medium_severity_count + report.low_severity_count}
          icon={Info}
          color="gray"
        />
      </div>

      {/* Health score */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Catalog Health Score
        </h2>
        <HealthScore
          total={report.total_products}
          issues={report.total_issues}
          highSeverity={report.high_severity_count}
        />
      </div>

      {/* Issues by check type */}
      <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">
          Issues by Category
        </h2>
        <div className="space-y-4">
          {report.checks.map((check) => (
            <CheckSection key={check.check_type} check={check} />
          ))}
        </div>
      </div>

      {/* All high severity issues */}
      {report.high_severity_count > 0 && (
        <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-6">
          <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <AlertCircle className="text-red-400" size={20} />
            High Priority Issues
          </h2>
          <div className="space-y-2">
            {report.checks
              .flatMap((c) => c.issues)
              .filter((i) => i.severity === 'high')
              .map((issue, idx) => (
                <IssueRow key={idx} issue={issue} />
              ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: number;
  icon: typeof AlertTriangle;
  color: 'blue' | 'green' | 'yellow' | 'red' | 'gray';
}) {
  const colorClasses = {
    blue: 'bg-cyan-500/10 text-cyan-400',
    green: 'bg-emerald-500/10 text-emerald-400',
    yellow: 'bg-amber-500/10 text-amber-400',
    red: 'bg-red-500/10 text-red-400',
    gray: 'bg-slate-800 text-slate-400',
  };

  return (
    <div className="bg-slate-900/50 rounded-lg border border-slate-800 p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <p className="text-2xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon size={24} />
        </div>
      </div>
    </div>
  );
}

function HealthScore({
  total,
  issues,
  highSeverity,
}: {
  total: number;
  issues: number;
  highSeverity: number;
}) {
  // Calculate score: 100 - (issues/total * 50) - (highSeverity * 10)
  const score = Math.max(
    0,
    Math.min(
      100,
      100 -
        (total > 0 ? (issues / total) * 50 : 0) -
        highSeverity * 10
    )
  );

  const getScoreColor = () => {
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-amber-400';
    if (score >= 40) return 'text-orange-400';
    return 'text-red-400';
  };

  const getScoreLabel = () => {
    if (score >= 80) return 'Excellent';
    if (score >= 60) return 'Good';
    if (score >= 40) return 'Needs Attention';
    return 'Critical';
  };

  return (
    <div className="flex items-center gap-8">
      <div className="text-center">
        <div className={`text-5xl font-bold ${getScoreColor()}`}>
          {Math.round(score)}
        </div>
        <div className="text-sm text-slate-500 mt-1">{getScoreLabel()}</div>
      </div>

      <div className="flex-1">
        <div className="h-4 bg-slate-800 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              score >= 80
                ? 'bg-emerald-500'
                : score >= 60
                ? 'bg-amber-500'
                : score >= 40
                ? 'bg-orange-500'
                : 'bg-red-500'
            }`}
            style={{ width: `${score}%` }}
          />
        </div>
        <p className="text-sm text-slate-500 mt-2">
          {issues === 0
            ? 'No issues found. Your catalog is in great shape!'
            : `${issues} issues need to be resolved to improve the score.`}
        </p>
      </div>
    </div>
  );
}

function CheckSection({ check }: { check: QualityCheck }) {
  const Icon = CHECK_ICONS[check.check_type] || AlertTriangle;
  const label = CHECK_LABELS[check.check_type] || check.check_type;

  return (
    <div className="border border-slate-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <Icon className="text-slate-500" size={20} />
          <h3 className="font-medium text-white">{label}</h3>
        </div>
        <span
          className={`px-2 py-1 text-sm font-medium rounded-full ${
            check.issue_count === 0
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }`}
        >
          {check.issue_count} issues
        </span>
      </div>

      {check.issue_count > 0 && (
        <div className="mt-3 space-y-2">
          {check.issues.slice(0, 3).map((issue, idx) => (
            <IssueRow key={idx} issue={issue} compact />
          ))}
          {check.issues.length > 3 && (
            <p className="text-sm text-slate-500 pl-2">
              +{check.issues.length - 3} more
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function IssueRow({
  issue,
  compact = false,
}: {
  issue: QualityIssue;
  compact?: boolean;
}) {
  const getSeverityIcon = () => {
    switch (issue.severity) {
      case 'high':
        return <AlertCircle className="text-red-400" size={16} />;
      case 'medium':
        return <AlertTriangle className="text-amber-400" size={16} />;
      default:
        return <Info className="text-cyan-400" size={16} />;
    }
  };

  return (
    <div
      className={`flex items-start gap-3 ${
        compact ? 'py-1' : 'bg-slate-800/50 rounded-lg p-3'
      }`}
    >
      {getSeverityIcon()}
      <div className="flex-1 min-w-0">
        <p className="font-medium text-white truncate">
          {issue.product_label}
        </p>
        <p className="text-sm text-slate-500">{issue.description}</p>
        {issue.suggestion && !compact && (
          <p className="text-sm text-cyan-400 mt-1">
            Suggestion: {issue.suggestion}
          </p>
        )}
      </div>
    </div>
  );
}
