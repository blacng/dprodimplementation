import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { ArrowUpRight, ArrowDownRight, Maximize2 } from 'lucide-react';
import { lineageApi, productsApi } from '../api/client';
import type { LineageGraph } from '../api/types';

export default function LineagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState(
    searchParams.get('product') || ''
  );
  const [direction, setDirection] = useState<'upstream' | 'downstream' | 'full'>(
    'full'
  );
  const [depth, setDepth] = useState(2);

  // Fetch products for dropdown
  const { data: products } = useQuery({
    queryKey: ['products'],
    queryFn: () => productsApi.list(),
  });

  // Fetch lineage
  const { data: lineage, isLoading } = useQuery({
    queryKey: ['lineage', selectedProduct, direction, depth],
    queryFn: () => lineageApi.get(selectedProduct, { direction, depth }),
    enabled: !!selectedProduct,
  });

  const handleProductChange = (uri: string) => {
    setSelectedProduct(uri);
    setSearchParams(uri ? { product: uri } : {});
  };

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-4">
        <div className="flex flex-wrap gap-4">
          {/* Product selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Select Product
            </label>
            <select
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">Choose a product...</option>
              {products?.map((p) => (
                <option key={p.uri} value={p.uri}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>

          {/* Direction */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Direction
            </label>
            <div className="flex rounded-lg border border-gray-300 overflow-hidden">
              <button
                onClick={() => setDirection('upstream')}
                className={`px-3 py-2 flex items-center gap-1 ${
                  direction === 'upstream'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ArrowUpRight size={16} /> Upstream
              </button>
              <button
                onClick={() => setDirection('full')}
                className={`px-3 py-2 flex items-center gap-1 border-x border-gray-300 ${
                  direction === 'full'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Maximize2 size={16} /> Full
              </button>
              <button
                onClick={() => setDirection('downstream')}
                className={`px-3 py-2 flex items-center gap-1 ${
                  direction === 'downstream'
                    ? 'bg-primary-600 text-white'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                <ArrowDownRight size={16} /> Downstream
              </button>
            </div>
          </div>

          {/* Depth */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Depth
            </label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d} level{d > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 bg-white rounded-lg border border-gray-200 overflow-hidden">
        {!selectedProduct ? (
          <div className="h-full flex items-center justify-center text-gray-400">
            Select a product to view its lineage
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : lineage ? (
          <LineageGraph lineage={lineage} />
        ) : null}
      </div>
    </div>
  );
}

function LineageGraph({ lineage }: { lineage: LineageGraph }) {
  // Convert lineage to React Flow format
  const { nodes: initialNodes, edges: initialEdges } = useMemo(() => {
    const nodes: Node[] = lineage.nodes.map((node, index) => ({
      id: node.uri,
      position: calculatePosition(index, lineage.nodes.length, node.is_source),
      data: {
        label: node.label,
        status: node.status_uri?.split(':').pop(),
        isSource: node.is_source,
      },
      type: 'custom',
    }));

    const edges: Edge[] = lineage.edges.map((edge, index) => ({
      id: `e${index}`,
      source: edge.source,
      target: edge.target,
      label: edge.port_label,
      markerEnd: { type: MarkerType.ArrowClosed },
      animated: true,
    }));

    return { nodes, edges };
  }, [lineage]);

  const [nodes, , onNodesChange] = useNodesState(initialNodes);
  const [edges, , onEdgesChange] = useEdgesState(initialEdges);

  const nodeTypes = useMemo(() => ({ custom: CustomNode }), []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      fitView
      className="bg-gray-50"
    >
      <Controls />
      <Background color="#e2e8f0" gap={16} />
    </ReactFlow>
  );
}

function CustomNode({ data }: { data: { label: string; status?: string; isSource: boolean } }) {
  const getStatusColor = (status?: string) => {
    if (!status) return 'border-gray-300';
    if (status.includes('Consume')) return 'border-green-500';
    if (status.includes('Build')) return 'border-blue-500';
    if (status.includes('Design')) return 'border-yellow-500';
    if (status.includes('Retire')) return 'border-red-500';
    return 'border-gray-300';
  };

  return (
    <div
      className={`px-4 py-3 bg-white rounded-lg border-2 min-w-[150px] ${
        data.isSource ? 'ring-2 ring-primary-500' : ''
      } ${getStatusColor(data.status)}`}
    >
      <div className="font-medium text-gray-900 text-center">{data.label}</div>
      {data.status && (
        <div className="text-xs text-gray-500 text-center mt-1">
          {data.status}
        </div>
      )}
    </div>
  );
}

function calculatePosition(
  index: number,
  total: number,
  isSource: boolean
): { x: number; y: number } {
  // Center the source node, spread others around it
  if (isSource) {
    return { x: 400, y: 200 };
  }

  // Simple circular layout for other nodes
  const angle = (index / total) * 2 * Math.PI;
  const radius = 200;
  return {
    x: 400 + Math.cos(angle) * radius,
    y: 200 + Math.sin(angle) * radius,
  };
}
