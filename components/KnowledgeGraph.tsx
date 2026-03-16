import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { KnowledgeGraphData, KGNode, KGLink } from '../types';

interface KnowledgeGraphProps {
  data: KnowledgeGraphData;
  width?: number;
  height?: number;
}

const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({ data, width = 600, height = 400 }) => {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || !data || !data.nodes || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove();

    const simulation = d3.forceSimulation<KGNode>(data.nodes)
      .force("link", d3.forceLink<KGNode, KGLink>(data.links).id(d => d.id).distance(100))
      .force("charge", d3.forceManyBody().strength(-300))
      .force("center", d3.forceCenter(width / 2, height / 2));

    const link = svg.append("g")
      .attr("stroke", "#999")
      .attr("stroke-opacity", 0.6)
      .selectAll("line")
      .data(data.links)
      .join("line")
      .attr("stroke-width", 2);

    const linkText = svg.append("g")
      .selectAll("text")
      .data(data.links)
      .join("text")
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .attr("text-anchor", "middle")
      .text(d => d.label);

    const node = svg.append("g")
      .selectAll("g")
      .data(data.nodes)
      .join("g")
      .call(d3.drag<SVGGElement, KGNode>()
        .on("start", dragstarted)
        .on("drag", dragged)
        .on("end", dragended) as any);

    node.append("circle")
      .attr("r", d => d.type === 'Root' ? 12 : 8)
      .attr("fill", d => {
        switch (d.type) {
          case 'Root': return "#1a1a1a";
          case 'Ingredient': return "#10b981";
          case 'Effect': return "#3b82f6";
          case 'BodyCondition': return "#ef4444";
          case 'LocationFactor': return "#f59e0b";
          default: return "#9ca3af";
        }
      });

    node.append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .attr("font-size", d => d.type === 'Root' ? "14px" : "12px")
      .attr("font-weight", d => d.type === 'Root' ? "bold" : "normal")
      .text(d => d.label);

    simulation.on("tick", () => {
      link
        .attr("x1", (d: any) => d.source.x)
        .attr("y1", (d: any) => d.source.y)
        .attr("x2", (d: any) => d.target.x)
        .attr("y2", (d: any) => d.target.y);

      linkText
        .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
        .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

      node
        .attr("transform", (d: any) => `translate(${d.x},${d.y})`);
    });

    function dragstarted(event: any) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    }

    function dragged(event: any) {
      event.subject.fx = event.x;
      event.subject.fy = event.y;
    }

    function dragended(event: any) {
      if (!event.active) simulation.alphaTarget(0);
      event.subject.fx = null;
      event.subject.fy = null;
    }

    return () => {
      simulation.stop();
    };
  }, [data, width, height]);

  return (
    <div className="bg-gray-50 rounded-2xl border border-gray-100 overflow-hidden">
      <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-white">
        <h4 className="text-sm font-bold text-gray-700">食谱知识图谱</h4>
        <div className="flex gap-3">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-emerald-500" />
            <span className="text-[10px] text-gray-500">食材</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500" />
            <span className="text-[10px] text-gray-500">功效</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-500" />
            <span className="text-[10px] text-gray-500">环境</span>
          </div>
        </div>
      </div>
      <svg 
        ref={svgRef} 
        width="100%" 
        height={height} 
        viewBox={`0 0 ${width} ${height}`}
        className="cursor-move"
      />
    </div>
  );
};

export default KnowledgeGraph;
