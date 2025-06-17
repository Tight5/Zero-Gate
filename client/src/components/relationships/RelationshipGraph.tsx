import { useEffect, useRef } from "react";
import { Card } from "@/components/ui/card";

interface Node {
  id: string;
  label: string;
  group: number;
  size: number;
}

interface Link {
  source: string;
  target: string;
  strength: number;
}

interface RelationshipGraphProps {
  relationships: any[];
  highlightPath?: string[] | null;
}

export default function RelationshipGraph({ relationships, highlightPath }: RelationshipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!relationships || relationships.length === 0) return;

    // Extract unique nodes from relationships
    const nodeMap = new Map<string, Node>();
    const links: Link[] = [];

    relationships.forEach((rel, index) => {
      // Add source node
      if (!nodeMap.has(rel.sourceId)) {
        nodeMap.set(rel.sourceId, {
          id: rel.sourceId,
          label: rel.sourceId.split('@')[0] || rel.sourceId,
          group: Math.floor(Math.random() * 5) + 1,
          size: 10
        });
      }

      // Add target node
      if (!nodeMap.has(rel.targetId)) {
        nodeMap.set(rel.targetId, {
          id: rel.targetId,
          label: rel.targetId.split('@')[0] || rel.targetId,
          group: Math.floor(Math.random() * 5) + 1,
          size: 10
        });
      }

      // Add link
      links.push({
        source: rel.sourceId,
        target: rel.targetId,
        strength: rel.strength || 1
      });
    });

    const nodes = Array.from(nodeMap.values());
    
    // Simple force-directed layout simulation
    const width = 600;
    const height = 400;
    const centerX = width / 2;
    const centerY = height / 2;

    // Position nodes in a circle initially
    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const radius = Math.min(width, height) * 0.3;
      (node as any).x = centerX + Math.cos(angle) * radius;
      (node as any).y = centerY + Math.sin(angle) * radius;
    });

    // Simple physics simulation
    for (let i = 0; i < 100; i++) {
      // Repulsion between nodes
      for (let j = 0; j < nodes.length; j++) {
        for (let k = j + 1; k < nodes.length; k++) {
          const node1 = nodes[j] as any;
          const node2 = nodes[k] as any;
          const dx = node2.x - node1.x;
          const dy = node2.y - node1.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = 50 / (distance * distance);
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          node1.x -= fx;
          node1.y -= fy;
          node2.x += fx;
          node2.y += fy;
        }
      }

      // Attraction along links
      links.forEach(link => {
        const source = nodes.find(n => n.id === link.source) as any;
        const target = nodes.find(n => n.id === link.target) as any;
        if (source && target) {
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = distance * 0.01;
          const fx = (dx / distance) * force;
          const fy = (dy / distance) * force;
          
          source.x += fx;
          source.y += fy;
          target.x -= fx;
          target.y -= fy;
        }
      });

      // Keep nodes within bounds
      nodes.forEach(node => {
        const n = node as any;
        n.x = Math.max(30, Math.min(width - 30, n.x));
        n.y = Math.max(30, Math.min(height - 30, n.y));
      });
    }

    // Render the graph
    const svg = svgRef.current;
    if (!svg) return;

    svg.innerHTML = '';
    svg.setAttribute('width', width.toString());
    svg.setAttribute('height', height.toString());
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);

    // Create groups for links and nodes
    const linksGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const nodesGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    svg.appendChild(linksGroup);
    svg.appendChild(nodesGroup);

    // Draw links
    links.forEach(link => {
      const source = nodes.find(n => n.id === link.source) as any;
      const target = nodes.find(n => n.id === link.target) as any;
      if (source && target) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', source.x.toString());
        line.setAttribute('y1', source.y.toString());
        line.setAttribute('x2', target.x.toString());
        line.setAttribute('y2', target.y.toString());
        
        const isHighlighted = highlightPath && 
          highlightPath.includes(link.source) && 
          highlightPath.includes(link.target) &&
          Math.abs(highlightPath.indexOf(link.source) - highlightPath.indexOf(link.target)) === 1;
          
        line.setAttribute('stroke', isHighlighted ? '#3b82f6' : '#e5e7eb');
        line.setAttribute('stroke-width', isHighlighted ? '3' : (link.strength * 1.5).toString());
        line.setAttribute('opacity', isHighlighted ? '1' : '0.6');
        linksGroup.appendChild(line);
      }
    });

    // Draw nodes
    nodes.forEach(node => {
      const n = node as any;
      const isHighlighted = highlightPath && highlightPath.includes(node.id);
      
      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', n.x.toString());
      circle.setAttribute('cy', n.y.toString());
      circle.setAttribute('r', (node.size + (isHighlighted ? 5 : 0)).toString());
      circle.setAttribute('fill', isHighlighted ? '#3b82f6' : getNodeColor(node.group));
      circle.setAttribute('stroke', '#ffffff');
      circle.setAttribute('stroke-width', '2');
      circle.setAttribute('opacity', isHighlighted ? '1' : '0.8');
      nodesGroup.appendChild(circle);

      // Node label
      const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      text.setAttribute('x', n.x.toString());
      text.setAttribute('y', (n.y + 4).toString());
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('font-size', '12');
      text.setAttribute('font-weight', isHighlighted ? 'bold' : 'normal');
      text.setAttribute('fill', isHighlighted ? '#1f2937' : '#4b5563');
      text.textContent = node.label.length > 10 ? node.label.substring(0, 10) + '...' : node.label;
      nodesGroup.appendChild(text);
    });

  }, [relationships, highlightPath]);

  const getNodeColor = (group: number) => {
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#eab308', // yellow
      '#22c55e', // green
      '#06b6d4', // cyan
      '#3b82f6', // blue
      '#8b5cf6', // violet
      '#ec4899', // pink
    ];
    return colors[group % colors.length];
  };

  if (!relationships || relationships.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </div>
          <p className="text-gray-500">No relationship data to visualize</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <svg
        ref={svgRef}
        className="w-full h-full border border-gray-200 rounded-lg bg-white"
        style={{ minHeight: '400px' }}
      />
      
      {highlightPath && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-blue-900 mb-2">Highlighted Path</h4>
          <div className="flex flex-wrap gap-2">
            {highlightPath.map((node, index) => (
              <div key={index} className="flex items-center">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {node.split('@')[0] || node}
                </span>
                {index < highlightPath.length - 1 && (
                  <svg className="w-4 h-4 text-blue-600 mx-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
