// app/visualizer/NodeInspector.tsx
'use client';

import type { Node } from 'reactflow';
import { FiCpu, FiServer, FiUserCheck, FiFileText } from 'react-icons/fi';

const iconMap: { [key: string]: JSX.Element } = {
  peer: <FiCpu className="mr-3 text-sky-400" />,
  orderer: <FiServer className="mr-3 text-purple-400" />,
  ca: <FiUserCheck className="mr-3 text-gray-400" />,
  record: <FiFileText className="mr-3 text-orange-400" />,
};

// Helper to determine node type for styling and icons
const getNodeType = (node: Node): string => {
    if (node.id.startsWith('peer')) return 'peer';
    if (node.id.startsWith('orderer')) return 'orderer';
    if (node.id.startsWith('ca')) return 'ca';
    return 'record';
};

export default function NodeInspector({ nodes, selectedNodeId, onNodeClick }: { nodes: Node[], selectedNodeId: string | null, onNodeClick: (id: string) => void }) {
  // Separate nodes into two categories: infrastructure and records
  const networkNodes = nodes.filter(node => ['peer', 'orderer', 'ca'].includes(getNodeType(node)));
  const recordNodes = nodes.filter(node => getNodeType(node) === 'record');

  return (
    <div className="h-[500px] p-4 bg-gray-900/50 rounded-lg border border-cyan-400/20 flex flex-col">
      <div className="flex-grow overflow-y-auto pr-2">
        {/* Network Nodes List */}
        <h3 className="text-lg font-bold text-white mb-2">Network Nodes</h3>
        <ul className="space-y-2 mb-6">
          {networkNodes.map((node) => (
            <li
              key={node.id}
              onClick={() => onNodeClick(node.id)}
              className={`flex items-center p-3 rounded-md cursor-pointer transition-all ${
                selectedNodeId === node.id
                  ? 'bg-cyan-500/20 border border-cyan-400'
                  : 'bg-gray-800/50 hover:bg-gray-700/50'
              }`}
            >
              {iconMap[getNodeType(node)]}
              <div>
                <p className="font-semibold text-white">{node.data.label}</p>
                <p className="text-xs text-gray-400 font-mono">{node.id}</p>
              </div>
            </li>
          ))}
        </ul>

        {/* Ledger Records List */}
        <h3 className="text-lg font-bold text-white mb-2">Ledger Records</h3>
        <ul className="space-y-2">
          {recordNodes.map((node) => (
            <li
              key={node.id}
              onClick={() => onNodeClick(node.id)}
              className={`flex items-center p-3 rounded-md cursor-pointer transition-all ${
                selectedNodeId === node.id
                  ? 'bg-orange-500/20 border border-orange-400'
                  : 'bg-gray-800/50 hover:bg-gray-700/50'
              }`}
            >
              {iconMap.record}
              <div>
                <p className="font-semibold text-white">{node.data.label}</p>
              </div>
            </li>
          ))}
           {recordNodes.length === 0 && <p className="text-sm text-gray-500">No records found on the ledger.</p>}
        </ul>
      </div>
    </div>
  );
}