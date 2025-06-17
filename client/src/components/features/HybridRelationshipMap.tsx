
import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface Node {
  id: string;
  name: string;
  type: 'entrepreneur' | 'organization' | 'sponsor';
  x?: number;
  y?: number;
}

interface Link {
  source: string;
  target: string;
  strength: number;
}

interface HybridRelationshipMapProps {
  nodes: Node[];
  links: Link[];
}

export function HybridRelationshipMap({ nodes, links }: HybridRelationshipMapProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);

  useEffect(() => {
    if (!svgRef.current || !nodes.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const width = 800;
    const height = 600;

    const simulation = d3.forceSimulation(nodes)
      .force("link", d3.forceLink(links).id((d: any) => d.id).strength(0.1))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .selectAll("line")
      .data(links)
      .join("line")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .attr("stroke-width", (d) => Math.sqrt(d.strength * 10));

    const node = svg.append("g")
      .selectAll("circle")
      .data(nodes)
      .join("circle")
      .attr("r", 8)
      .attr("fill", (d) => {
        switch (d.type) {
          case 'entrepreneur': return '#10b981';
          case 'organization': return '#3b82f6';
          case 'sponsor': return '#f59e0b';
          default: return '#6b7280';
        }
      })
      .style("cursor", "pointer")
      .on("click", (event, d) => setSelectedNode(d));

    const label = svg.append("g")
      .selectAll("text")
      .data(nodes)
      .join("text")
      .text((d) => d.name)
      .attr("font-size", 12)
      .attr("dx", 12)
      .attr("dy", 4);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      node
        .attr("cx", (d: any) => d.x)
        .attr("cy", (d: any) => d.y);

      label
        .attr("x", (d: any) => d.x)
        .attr("y", (d: any) => d.y);
    });

  }, [nodes, links]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Hybrid Relationship Network</CardTitle>
        </CardHeader>
        <CardContent>
          <svg
            ref={svgRef}
            width="100%"
            height="600"
            viewBox="0 0 800 600"
            className="border rounded"
          />
        </CardContent>
      </Card>

      {selectedNode && (
        <Card>
          <CardHeader>
            <CardTitle>Node Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p><strong>Name:</strong> {selectedNode.name}</p>
              <p><strong>Type:</strong> {selectedNode.type}</p>
              <p><strong>ID:</strong> {selectedNode.id}</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
