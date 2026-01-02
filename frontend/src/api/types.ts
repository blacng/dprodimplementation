// API Types matching the backend Pydantic schemas

export interface DataProductSummary {
  uri: string;
  label: string;
  description?: string;
  owner_uri?: string;
  owner_label?: string;
  domain_uri?: string;
  domain_label?: string;
  status_uri?: string;
  created?: string;
  modified?: string;
}

export interface DataProduct extends DataProductSummary {
  status_label?: string;
  output_ports: string[];
  input_ports: string[];
}

export interface DataProductCreate {
  uri?: string;
  label: string;
  description: string;
  owner_uri: string;
  domain_uri: string;
  status_uri?: string;
  input_ports?: PortConfig[];
  output_ports: PortConfig[];
}

export interface PortConfig {
  uri?: string;
  label: string;
  description?: string;
  dataset_uri?: string;
}

export interface Domain {
  uri: string;
  label: string;
  product_count: number;
}

export interface LineageNode {
  uri: string;
  label: string;
  status_uri?: string;
  domain_uri?: string;
  is_source: boolean;
}

export interface LineageEdge {
  source: string;
  target: string;
  port_uri?: string;
  port_label?: string;
}

export interface LineageGraph {
  source_uri: string;
  direction: 'upstream' | 'downstream' | 'full';
  nodes: LineageNode[];
  edges: LineageEdge[];
}

export interface QualityIssue {
  product_uri: string;
  product_label: string;
  issue_type: string;
  severity: 'high' | 'medium' | 'low';
  description: string;
  suggestion?: string;
}

export interface QualityCheck {
  check_type: string;
  issue_count: number;
  issues: QualityIssue[];
}

export interface QualityReport {
  total_products: number;
  total_issues: number;
  high_severity_count: number;
  medium_severity_count: number;
  low_severity_count: number;
  checks: QualityCheck[];
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  graphdb_connected: boolean;
  repository?: string;
  product_count?: number;
  error?: string;
}

// Chat message types
export interface ChatMessage {
  id: string;
  type: 'user' | 'assistant' | 'system' | 'error' | 'thinking';
  content: string;
  timestamp: Date;
}
