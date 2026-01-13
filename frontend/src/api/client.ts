import type {
  DataProduct,
  DataProductCreate,
  DataProductDetail,
  DataProductSummary,
  Domain,
  HealthStatus,
  LineageGraph,
  QualityCheck,
  QualityReport,
} from './types';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

class APIError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'APIError';
  }
}

async function fetchJSON<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });

  if (!response.ok) {
    const error = await response.text();
    throw new APIError(response.status, error);
  }

  return response.json();
}

// Products API
export const productsApi = {
  list: (filters?: {
    domain?: string;
    status?: string;
    owner?: string;
  }): Promise<DataProductSummary[]> => {
    const params = new URLSearchParams();
    if (filters?.domain) params.set('domain', filters.domain);
    if (filters?.status) params.set('status', filters.status);
    if (filters?.owner) params.set('owner', filters.owner);
    const query = params.toString();
    return fetchJSON(`/api/v1/products${query ? `?${query}` : ''}`);
  },

  get: (uri: string): Promise<DataProduct> => {
    return fetchJSON(`/api/v1/products/${encodeURIComponent(uri)}`);
  },

  getDetail: (uri: string): Promise<DataProductDetail> => {
    return fetchJSON(`/api/v1/products/detail/${encodeURIComponent(uri)}`);
  },

  search: (query: string): Promise<DataProductSummary[]> => {
    return fetchJSON(`/api/v1/products/search?q=${encodeURIComponent(query)}`);
  },

  create: (product: DataProductCreate): Promise<DataProduct> => {
    return fetchJSON('/api/v1/products', {
      method: 'POST',
      body: JSON.stringify(product),
    });
  },

  domains: (): Promise<Domain[]> => {
    return fetchJSON('/api/v1/products/domains/');
  },
};

// Lineage API
export const lineageApi = {
  get: (
    uri: string,
    options?: { direction?: 'upstream' | 'downstream' | 'full'; depth?: number }
  ): Promise<LineageGraph> => {
    const params = new URLSearchParams();
    if (options?.direction) params.set('direction', options.direction);
    if (options?.depth) params.set('depth', options.depth.toString());
    const query = params.toString();
    return fetchJSON(
      `/api/v1/lineage/${encodeURIComponent(uri)}${query ? `?${query}` : ''}`
    );
  },
};

// Quality API
export const qualityApi = {
  getReport: (): Promise<QualityReport> => {
    return fetchJSON('/api/v1/quality');
  },

  getCheck: (checkType: string): Promise<QualityCheck> => {
    return fetchJSON(`/api/v1/quality/${checkType}`);
  },
};

// Health API
export const healthApi = {
  check: (): Promise<HealthStatus> => {
    return fetchJSON('/api/v1/health');
  },
};

// WebSocket Chat
export function createChatConnection(
  onMessage: (message: { type: string; content: string }) => void,
  onError: (error: Event) => void,
  onClose: () => void,
  onOpen?: () => void
): {
  send: (content: string) => void;
  close: () => void;
} {
  const wsUrl = API_BASE.replace('http', 'ws');
  const ws = new WebSocket(`${wsUrl}/ws/chat`);

  ws.onopen = () => {
    onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const message = JSON.parse(event.data);
      onMessage(message);
    } catch {
      console.error('Failed to parse message:', event.data);
    }
  };

  ws.onerror = onError;
  ws.onclose = onClose;

  return {
    send: (content: string) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'message', content }));
      }
    },
    close: () => {
      ws.close();
    },
  };
}

export { APIError };
