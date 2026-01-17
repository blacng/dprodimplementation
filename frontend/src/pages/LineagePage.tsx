import { useState, useMemo, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import {
  ReactFlow,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  BaseEdge,
  getSmoothStepPath,
  EdgeLabelRenderer,
  Handle,
  type Node,
  type Edge,
  type EdgeProps,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import dagre from '@dagrejs/dagre';
// Direct imports to avoid barrel file bundle bloat
import ArrowUpRight from 'lucide-react/dist/esm/icons/arrow-up-right';
import ArrowDownRight from 'lucide-react/dist/esm/icons/arrow-down-right';
import Maximize2 from 'lucide-react/dist/esm/icons/maximize-2';
import { lineageApi, productsApi } from '../api/client';
import type { LineageGraph, LineageNode, LineageEdge } from '../api/types';

// Layout constants
const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const RANK_SEP = 180;
const NODE_SEP = 60;

// Depth-based color scheme
const DEPTH_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  '-5': { bg: 'bg-red-500/20', border: 'border-red-500/60', text: 'text-red-400' },
  '-4': { bg: 'bg-orange-500/20', border: 'border-orange-500/60', text: 'text-orange-400' },
  '-3': { bg: 'bg-orange-500/20', border: 'border-orange-500/50', text: 'text-orange-400' },
  '-2': { bg: 'bg-amber-500/20', border: 'border-amber-500/50', text: 'text-amber-400' },
  '-1': { bg: 'bg-yellow-500/20', border: 'border-yellow-500/50', text: 'text-yellow-400' },
  '0': { bg: 'bg-cyan-500/20', border: 'border-cyan-500', text: 'text-cyan-400' },
  '1': { bg: 'bg-emerald-500/20', border: 'border-emerald-500/50', text: 'text-emerald-400' },
  '2': { bg: 'bg-teal-500/20', border: 'border-teal-500/50', text: 'text-teal-400' },
  '3': { bg: 'bg-sky-500/20', border: 'border-sky-500/50', text: 'text-sky-400' },
  '4': { bg: 'bg-blue-500/20', border: 'border-blue-500/50', text: 'text-blue-400' },
  '5': { bg: 'bg-indigo-500/20', border: 'border-indigo-500/60', text: 'text-indigo-400' },
};

// Domain color palette for grouping
const DOMAIN_COLORS = [
  'rgba(6, 182, 212, 0.08)', // cyan
  'rgba(16, 185, 129, 0.08)', // emerald
  'rgba(245, 158, 11, 0.08)', // amber
  'rgba(139, 92, 246, 0.08)', // violet
  'rgba(236, 72, 153, 0.08)', // pink
];

function getDepthColors(depth: number) {
  const clampedDepth = Math.max(-5, Math.min(5, depth)).toString();
  return DEPTH_COLORS[clampedDepth] || DEPTH_COLORS['0'];
}

interface DomainGroup {
  domain: string;
  label: string;
  bounds: { minX: number; maxX: number; minY: number; maxY: number };
  color: string;
}

// Custom node data type for lineage nodes
// Index signature required by ReactFlow's Node<T> constraint
interface LineageNodeData extends Record<string, unknown> {
  label: string;
  status?: string;
  domain?: string;
  domainUri?: string;
  isSource: boolean;
  depth: number;
}

// Type alias for our custom node
type LineageFlowNode = Node<LineageNodeData>;

// DAG layout using dagre
function getDAGLayout(
  lineageNodes: LineageNode[],
  lineageEdges: LineageEdge[]
): { nodes: LineageFlowNode[]; edges: Edge[]; domainGroups: DomainGroup[] } {
  const g = new dagre.graphlib.Graph().setDefaultEdgeLabel(() => ({}));

  g.setGraph({
    rankdir: 'LR',
    ranksep: RANK_SEP,
    nodesep: NODE_SEP,
    marginx: 50,
    marginy: 50,
  });

  // Add nodes to dagre
  lineageNodes.forEach((node) => {
    g.setNode(node.uri, {
      width: NODE_WIDTH,
      height: NODE_HEIGHT,
    });
  });

  // Add edges to dagre
  lineageEdges.forEach((edge) => {
    g.setEdge(edge.source, edge.target);
  });

  // Run layout
  dagre.layout(g);

  // Convert to React Flow format
  const nodes: LineageFlowNode[] = lineageNodes.map((node) => {
    const nodeWithPosition = g.node(node.uri);
    return {
      id: node.uri,
      position: {
        x: nodeWithPosition.x - NODE_WIDTH / 2,
        y: nodeWithPosition.y - NODE_HEIGHT / 2,
      },
      data: {
        label: node.label,
        status: node.status_uri?.split(':').pop() || node.status_uri?.split('/').pop(),
        domain: node.domain_label,
        domainUri: node.domain_uri,
        isSource: node.is_source,
        depth: node.depth,
      },
      type: 'lineageNode',
      targetPosition: Position.Left,
      sourcePosition: Position.Right,
    };
  });

  const edges: Edge[] = lineageEdges.map((edge, index) => ({
    id: `e${index}`,
    source: edge.source,
    target: edge.target,
    label: edge.port_label,
    type: 'animatedEdge',
    markerEnd: { type: MarkerType.ArrowClosed, color: '#64748b' },
  }));

  // Calculate domain groups
  const domainMap = new Map<string, { label: string; nodes: LineageFlowNode[] }>();
  nodes.forEach((node) => {
    const domainUri = node.data.domainUri || 'uncategorized';
    const domainLabel = node.data.domain || 'Uncategorized';
    if (!domainMap.has(domainUri)) {
      domainMap.set(domainUri, { label: domainLabel, nodes: [] });
    }
    domainMap.get(domainUri)!.nodes.push(node);
  });

  const domainGroups: DomainGroup[] = [];
  let colorIndex = 0;
  domainMap.forEach((data, domain) => {
    if (data.nodes.length > 1) {
      const xs = data.nodes.map((n) => n.position.x);
      const ys = data.nodes.map((n) => n.position.y);

      domainGroups.push({
        domain,
        label: data.label,
        bounds: {
          minX: Math.min(...xs) - 20,
          maxX: Math.max(...xs) + NODE_WIDTH + 20,
          minY: Math.min(...ys) - 30,
          maxY: Math.max(...ys) + NODE_HEIGHT + 20,
        },
        color: DOMAIN_COLORS[colorIndex % DOMAIN_COLORS.length],
      });
      colorIndex++;
    }
  });

  return { nodes, edges, domainGroups };
}

// Custom animated edge with particle flow
function AnimatedDataFlowEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  label,
}: EdgeProps) {
  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 16,
  });

  return (
    <>
      {/* Base edge path */}
      <BaseEdge id={id} path={edgePath} style={{ stroke: '#475569', strokeWidth: 2 }} />

      {/* Animated particles */}
      <circle r="4" fill="#06b6d4" className="lineage-particle">
        <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} />
      </circle>
      <circle r="4" fill="#06b6d4" className="lineage-particle">
        <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} begin="0.83s" />
      </circle>
      <circle r="4" fill="#06b6d4" className="lineage-particle">
        <animateMotion dur="2.5s" repeatCount="indefinite" path={edgePath} begin="1.66s" />
      </circle>

      {/* Arrow marker */}
      <circle r="3" fill="#64748b">
        <animateMotion dur="0.001s" repeatCount="1" path={edgePath} begin="0s" fill="freeze" />
      </circle>

      {/* Edge label */}
      {label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: 'none',
            }}
            className="px-2 py-1 text-xs font-mono bg-slate-800 text-slate-300 rounded border border-slate-700"
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

// Custom node with depth-based coloring
function LineageNodeComponent({ data }: { data: LineageNodeData }) {
  const colors = getDepthColors(data.depth);

  // Extract just the status name from URI (e.g., "Consume" from ".../lifecycle-status/Consume")
  const statusName = data.status
    ? data.status.split('/').pop()?.split(':').pop() || data.status
    : null;

  return (
    <div
      className={`
        px-4 py-3 rounded-lg border-2 min-w-[160px] backdrop-blur transition-all
        ${colors.bg} ${colors.border}
        ${data.isSource ? 'ring-2 ring-cyan-400 ring-offset-2 ring-offset-slate-950 scale-105' : ''}
        hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20
      `}
    >
      <Handle type="target" position={Position.Left} className="!bg-slate-500 !w-2 !h-2" />

      <div className="font-semibold text-white text-center text-sm">{data.label}</div>

      {data.domain && (
        <div className="text-xs text-slate-300 text-center mt-1 truncate">
          {data.domain}
        </div>
      )}

      {statusName && (
        <div className="text-xs text-center mt-1">
          <span
            className={`px-2 py-0.5 rounded-full font-medium ${
              statusName.includes('Consume')
                ? 'bg-emerald-500/30 text-emerald-300'
                : statusName.includes('Build')
                  ? 'bg-blue-500/30 text-blue-300'
                  : statusName.includes('Design')
                    ? 'bg-yellow-500/30 text-yellow-300'
                    : 'bg-slate-500/30 text-slate-300'
            }`}
          >
            {statusName}
          </span>
        </div>
      )}

      <Handle type="source" position={Position.Right} className="!bg-slate-500 !w-2 !h-2" />
    </div>
  );
}

// Domain group background component
function DomainBackgrounds({ groups }: { groups: DomainGroup[] }) {
  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        overflow: 'visible',
      }}
    >
      {groups.map((group) => (
        <g key={group.domain}>
          <rect
            x={group.bounds.minX}
            y={group.bounds.minY}
            width={group.bounds.maxX - group.bounds.minX}
            height={group.bounds.maxY - group.bounds.minY}
            fill={group.color}
            stroke={group.color.replace('0.08', '0.3')}
            strokeWidth={1}
            strokeDasharray="4 4"
            rx={12}
          />
          <text
            x={group.bounds.minX + 8}
            y={group.bounds.minY - 8}
            fill="#64748b"
            fontSize={11}
            fontFamily="monospace"
          >
            {group.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

function LineageGraphView({ lineage }: { lineage: LineageGraph }) {
  const { nodes: layoutedNodes, edges: layoutedEdges, domainGroups } = useMemo(
    () => getDAGLayout(lineage.nodes, lineage.edges),
    [lineage]
  );

  const [nodes, , onNodesChange] = useNodesState(layoutedNodes);
  const [edges, , onEdgesChange] = useEdgesState(layoutedEdges);

  const nodeTypes = useMemo(() => ({ lineageNode: LineageNodeComponent }), []);
  const edgeTypes = useMemo(() => ({ animatedEdge: AnimatedDataFlowEdge }), []);

  const onInit = useCallback((reactFlowInstance: any) => {
    reactFlowInstance.fitView({ padding: 0.2 });
  }, []);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      onNodesChange={onNodesChange}
      onEdgesChange={onEdgesChange}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      onInit={onInit}
      fitView
      fitViewOptions={{ padding: 0.2 }}
      className="bg-slate-950"
      proOptions={{ hideAttribution: true }}
    >
      <Controls className="!bg-slate-800 !border-slate-700 [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700" />
      <Background color="#1e293b" gap={24} />

      {/* Domain grouping backgrounds */}
      <DomainBackgrounds groups={domainGroups} />

      {/* SVG filter for particle glow */}
      <svg style={{ position: 'absolute', width: 0, height: 0 }}>
        <defs>
          <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
      </svg>
    </ReactFlow>
  );
}

export default function LineagePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [selectedProduct, setSelectedProduct] = useState(searchParams.get('product') || '');
  const [direction, setDirection] = useState<'upstream' | 'downstream' | 'full'>('full');
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
      {/* Controls - Dark themed */}
      <div className="bg-slate-900/50 backdrop-blur rounded-lg border border-slate-800 p-4 mb-4">
        <div className="flex flex-wrap gap-4">
          {/* Product selector */}
          <div className="flex-1 min-w-[200px]">
            <label className="block text-sm font-medium text-slate-400 mb-1">Select Product</label>
            <select
              value={selectedProduct}
              onChange={(e) => handleProductChange(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
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
            <label className="block text-sm font-medium text-slate-400 mb-1">Direction</label>
            <div className="flex rounded-lg border border-slate-700 overflow-hidden">
              <button
                onClick={() => setDirection('upstream')}
                className={`px-3 py-2 flex items-center gap-1 transition-colors ${
                  direction === 'upstream'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <ArrowUpRight size={16} /> Upstream
              </button>
              <button
                onClick={() => setDirection('full')}
                className={`px-3 py-2 flex items-center gap-1 border-x border-slate-700 transition-colors ${
                  direction === 'full'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <Maximize2 size={16} /> Full
              </button>
              <button
                onClick={() => setDirection('downstream')}
                className={`px-3 py-2 flex items-center gap-1 transition-colors ${
                  direction === 'downstream'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                }`}
              >
                <ArrowDownRight size={16} /> Downstream
              </button>
            </div>
          </div>

          {/* Depth */}
          <div>
            <label className="block text-sm font-medium text-slate-400 mb-1">Depth</label>
            <select
              value={depth}
              onChange={(e) => setDepth(Number(e.target.value))}
              className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
            >
              {[1, 2, 3, 4, 5].map((d) => (
                <option key={d} value={d}>
                  {d} level{d > 1 ? 's' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Legend */}
        <div className="mt-3 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-4 text-xs text-slate-500">
          <span className="font-medium">Depth:</span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-amber-500/30 border border-amber-500/50"></span>
            Upstream
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-cyan-500/30 border border-cyan-500"></span>
            Source
          </span>
          <span className="flex items-center gap-1">
            <span className="w-3 h-3 rounded bg-emerald-500/30 border border-emerald-500/50"></span>
            Downstream
          </span>
          <span className="ml-4 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
            Data flow
          </span>
        </div>
      </div>

      {/* Graph */}
      <div className="flex-1 bg-slate-950 rounded-lg border border-slate-800 overflow-hidden">
        {!selectedProduct ? (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Maximize2 size={48} className="mx-auto mb-4 opacity-50" />
              <p>Select a product to view its lineage</p>
            </div>
          </div>
        ) : isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-400"></div>
          </div>
        ) : lineage && lineage.nodes.length > 0 ? (
          <LineageGraphView lineage={lineage} />
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            <div className="text-center">
              <p>No lineage data found for this product</p>
              <p className="text-sm mt-1 text-slate-600">
                This product has no upstream or downstream dependencies
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
