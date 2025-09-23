// app/visualizer/NetworkGraph.tsx
'use client';

import React from 'react';
import ReactFlow, { Background, Controls, MiniMap, Node, Edge } from 'reactflow';
import 'reactflow/dist/style.css';

// The component now accepts nodes and edges as props
export default function NetworkGraph({ nodes, edges, onNodeClick }: { nodes: Node[], edges: Edge[], onNodeClick: (event: React.MouseEvent, node: Node) => void }) {
  return (
    <div style={{ height: '500px' }} className="bg-gray-900/50 rounded-lg border border-cyan-400/20">
      {/* ReactFlow now renders the nodes and edges that are passed in from the parent */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodeClick={onNodeClick}
        fitView
      >
        <Background />
        <Controls />
      </ReactFlow>
    </div>
  );
}