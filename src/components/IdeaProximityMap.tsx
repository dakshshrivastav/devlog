import { useEffect, useMemo, useState } from 'react';
import type { IdeaGraph } from '../../shared/schema';

interface PointNode {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface Layout {
  width: number;
  height: number;
  nodes: PointNode[];
}

export function IdeaProximityMap({ graph }: { graph: IdeaGraph }) {
  const [layout, setLayout] = useState<Layout | null>(null);
  const [error, setError] = useState<string | null>(null);
  const nodes = useMemo(() => graph.nodes, [graph.nodes]);

  useEffect(() => {
    let active = true;
    async function arrange() {
      if (!nodes.length) { setLayout(null); return; }
      try {
        const dagre = await import('@dagrejs/dagre');
        const graphLayout = new dagre.default.graphlib.Graph({ compound: false, multigraph: true });
        graphLayout.setGraph({ rankdir: 'LR', nodesep: 38, ranksep: 90, marginx: 32, marginy: 38 });
        graphLayout.setDefaultEdgeLabel(() => ({}));
        const byId = new Set(nodes.map((node) => node.id));
        for (const node of nodes) graphLayout.setNode(node.id, { width: 216, height: node.detail ? 88 : 72 });
        for (const [index, edge] of graph.edges.entries()) {
          if (byId.has(edge.from) && byId.has(edge.to)) graphLayout.setEdge(edge.from, edge.to, { label: edge.label ?? edge.relation, width: 28, height: 16 }, `e-${index}`);
        }
        dagre.default.layout(graphLayout);
        const dimensions = graphLayout.graph();
        const laidOut = nodes.map((node) => {
          const result = graphLayout.node(node.id) as { x: number; y: number; width: number; height: number };
          return { id: node.id, x: result.x, y: result.y, width: result.width, height: result.height };
        });
        if (active) {
          setLayout({ width: Math.max(dimensions.width ?? 900, 760), height: Math.max(dimensions.height ?? 400, 260), nodes: laidOut });
          setError(null);
        }
      } catch (cause) {
        if (active) setError(cause instanceof Error ? cause.message : 'Could not arrange the idea graph.');
      }
    }
    void arrange();
    return () => { active = false; };
  }, [nodes, graph.edges]);

  const placed = useMemo(() => new Map(layout?.nodes.map((node) => [node.id, node]) ?? []), [layout]);
  const nearPairs = useMemo(() => {
    if (!layout) return [];
    const pairs: { left: string; right: string; distance: number; sameIdea: boolean }[] = [];
    for (let i = 0; i < graph.nodes.length; i++) {
      for (let j = i + 1; j < graph.nodes.length; j++) {
        const leftIdea = graph.nodes[i];
        const rightIdea = graph.nodes[j];
        if (leftIdea.clusterId === rightIdea.clusterId) continue;
        const left = placed.get(leftIdea.id);
        const right = placed.get(rightIdea.id);
        if (!left || !right) continue;
        const distance = Math.round(Math.hypot(left.x - right.x, left.y - right.y));
        if (distance < 330) pairs.push({ left: leftIdea.id, right: rightIdea.id, distance, sameIdea: false });
      }
    }
    return pairs.sort((a, b) => a.distance - b.distance).slice(0, 5);
  }, [graph.nodes, layout, placed]);

  if (error) return <div className="rounded-lg border border-alert/20 bg-alert-deep/10 p-3 text-xs text-alert">Idea layout unavailable: {error}</div>;
  if (!layout) return <div className="rounded-lg border border-line bg-surface-0 p-4 text-xs text-muted">The idea map appears when sourced reasoning nodes are available.</div>;

  const nodeById = new Map(graph.nodes.map((node) => [node.id, node]));
  const clusterById = new Map(graph.clusters.map((cluster) => [cluster.id, cluster]));
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface-0">
      <div className="relative" style={{ width: layout.width, height: layout.height }}>
        <svg className="pointer-events-none absolute inset-0 h-full w-full overflow-visible" viewBox={`0 0 ${layout.width} ${layout.height}`} aria-hidden="true">
          <defs><marker id="idea-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#8f9194" /></marker></defs>
          {graph.edges.map((edge) => {
            const from = placed.get(edge.from);
            const to = placed.get(edge.to);
            if (!from || !to) return null;
            const sx = from.x + from.width / 2 - 6;
            const sy = from.y;
            const ex = to.x - to.width / 2 + 6;
            const ey = to.y;
            const bend = Math.max(28, Math.abs(ex - sx) * 0.42);
            return <g key={edge.id}><path d={`M ${sx} ${sy} C ${sx + bend} ${sy}, ${ex - bend} ${ey}, ${ex} ${ey}`} fill="none" stroke={edge.inferred ? '#44474a' : '#8f9194'} strokeWidth="1.4" strokeDasharray={edge.inferred ? '4 4' : undefined} markerEnd="url(#idea-arrow)" />{edge.label && <text x={(sx + ex) / 2} y={(sy + ey) / 2 - 7} fill="#8f9194" fontSize="9" textAnchor="middle" fontFamily="ui-monospace, monospace">{edge.label.slice(0, 28)}</text>}</g>;
          })}
        </svg>
        {layout.nodes.map((point) => {
          const node = nodeById.get(point.id);
          if (!node) return null;
          const cluster = clusterById.get(node.clusterId);
          return <div key={point.id} className={`absolute overflow-hidden rounded-lg border bg-surface-2 p-3 shadow-lg ${node.hazard ? 'border-alert/50' : 'border-line-strong/80'}`} style={{ left: point.x - point.width / 2, top: point.y - point.height / 2, width: point.width, height: point.height }}>
            <div className="mb-1 flex items-center justify-between gap-2"><span className="truncate font-mono text-[9px] uppercase tracking-wider text-muted">{cluster?.title ?? node.clusterId}</span><span className={`h-1.5 w-1.5 shrink-0 rounded-full ${node.hazard ? 'bg-alert' : 'bg-white'}`} /></div>
            <div className="line-clamp-2 font-headline text-xs leading-snug text-white">{node.label}</div>
            <div className="mt-1 truncate text-[9px] text-muted">{node.kind} · {node.sources.length} source{node.sources.length === 1 ? '' : 's'}</div>
          </div>;
        })}
      </div>
      <div className="flex flex-col gap-2 border-t border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><span className="text-[10px] text-muted">Cross-cluster proximity candidates · geometric distance is a hint, never evidence</span><div className="flex flex-wrap gap-1.5">{nearPairs.length ? nearPairs.map((pair) => <span key={`${pair.left}-${pair.right}`} className="rounded bg-surface-2 px-2 py-1 font-mono text-[9px] text-body">{nodeById.get(pair.left)?.label.slice(0, 20)} ↔ {nodeById.get(pair.right)?.label.slice(0, 20)} · {pair.distance}px</span>) : <span className="text-[10px] text-muted">No cross-cluster pairs near in this layout.</span>}</div></div>
    </div>
  );
}
