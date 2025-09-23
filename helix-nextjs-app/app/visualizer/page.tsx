// app/visualizer/page.tsx
'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, useAnimation } from 'framer-motion';
import { FiCpu, FiUsers, FiServer, FiSend, FiCheckCircle } from 'react-icons/fi';
import NetworkGraph from './NetworkGraph';
import NodeInspector from './NodeInspector';
import type { Node, Edge } from 'reactflow';
import { MarkerType, Position } from 'reactflow';

type HealthRecord = {
    recordID: string;
};

// const initialNodes: Node[] = [
//   { id: 'peer1', position: { x: 100, y: 200 }, data: { label: 'Peer 0 (Org1)' }, style: { background: '#0ea5e9', color: 'white', border: 'none' }, 
//     sourcePosition: Position.Bottom, targetPosition: Position.Top }, // NEW
//   { id: 'peer2', position: { x: 500, y: 200 }, data: { label: 'Peer 0 (Org2)' }, style: { background: '#10b981', color: 'white', border: 'none' }, 
//     sourcePosition: Position.Bottom, targetPosition: Position.Top }, // NEW
//   { id: 'orderer', position: { x: 300, y: 400 }, data: { label: 'Orderer' }, style: { background: '#a855f7', color: 'white', border: 'none' },
//     sourcePosition: Position.Bottom, targetPosition: Position.Top }, // NEW
//   { id: 'ca1', position: { x: 100, y: 0 }, data: { label: 'Org1 CA' }, type: 'input', style: { background: '#64748b', color: 'white', border: 'none' },
//     targetPosition: Position.Bottom }, // NEW
//   { id: 'ca2', position: { x: 500, y: 0 }, data: { label: 'Org2 CA' }, type: 'input', style: { background: '#64748b', color: 'white', border: 'none' },
//     targetPosition: Position.Bottom }, // NEW
// ];

// const initialEdges: Edge[] = [
//     { id: 'ca1-peer1', source: 'ca1', target: 'peer1', animated: true },
//     { id: 'ca2-peer2', source: 'ca2', target: 'peer2', animated: true },
//     { id: 'peer1-orderer', source: 'peer1', target: 'orderer', type: 'step' },
//     { id: 'peer2-orderer', source: 'peer2', target: 'orderer', type: 'step' },
// ];

export default function VisualizerPage() {
    const [lastEvent, setLastEvent] = useState<any>(null);
    const [isAnimating, setIsAnimating] = useState(false);
    const [socketStatus, setSocketStatus] = useState('Connecting...');

    // const [nodes, setNodes] = useState<Node[]>(initialNodes);
    // const [edges, setEdges] = useState<Edge[]>(initialEdges);
    const [baseNodes, setBaseNodes] = useState<Node[]>([]);
    const [baseEdges, setBaseEdges] = useState<Edge[]>([]);
    const [nodes, setNodes] = useState<Node[]>([]);
    const [edges, setEdges] = useState<Edge[]>([]);

    const packetControls = useAnimation();
    const nodeControls = useAnimation();

    const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
    
    const startAnimationSequence = async () => {
        setIsAnimating(true);
        packetControls.set({ opacity: 0, x: 0, y: -230 }); // Start at Client

        // Sequence: Client -> Peer (Endorse) -> Orderer -> Peer (Commit)
        await packetControls.start({ opacity: 1, transition: { duration: 0.3 } });
        await nodeControls.start({ boxShadow: '0 0 25px 10px #0ea5e9' }); // Client glows
        
        await packetControls.start({ 
            y: [-230, 0, 0], // Move down to Peer 1
            x: [0, 80, 0],   // Move out and back to simulate spiral
            transition: { duration: 2, ease: 'easeInOut', times: [0, 0.5, 1] } 
        });
        await nodeControls.start({ boxShadow: '0 0 25px 10px #0ea5e9', transition: { delay: 0, duration: 0.5, repeat: 2, repeatType: 'reverse' } }); // Peer glows
        
        await packetControls.start({ 
            y: [0, 230],     // Move down to Orderer
            x: [0, 0],       // Center path
            transition: { duration: 1.5, ease: 'easeInOut' } 
        });
        await nodeControls.start({ boxShadow: '0 0 25px 10px #a855f7', transition: { delay: 0, duration: 0.5, repeat: 2, repeatType: 'reverse' } }); // Orderer glows
        
        // Change packet color for commit and travel back up
        packetControls.set({ color: '#22c55e' });
        
        await packetControls.start({ 
            y: [230, 0, 0],  // Move up to Peer 2
            x: [0, -80, 0],  // Move out and back on the other side
            transition: { duration: 2, ease: 'easeInOut', times: [0, 0.5, 1] } 
        });
        await nodeControls.start({ 
            boxShadow: '0 0 25px 10px #22c55e', // Peers glow green
            backgroundColor: '#16a34a',
            transition: { delay: 0, duration: 0.5, repeat: 2, repeatType: 'reverse' } 
        });

        await packetControls.start({ opacity: 0, transition: { duration: 0.5 } });
        // Reset node styles
        nodeControls.start({ boxShadow: '0 0 15px 5px rgba(100, 180, 255, 0.5)', backgroundColor: '' });
        setIsAnimating(false);
    };

    const animateTransactionOnGraph = (txId: string): Promise<void> => {
        return new Promise(resolve => {
            const newNodeId = `tx-${txId}`;
            const newNode: Node = {
                id: newNodeId,
                position: { x: 300, y: 100 },
                data: { label: `TX: ${txId.substring(0, 8)}...` },
                style: { background: '#06b6d4', color: 'white', border: '1px solid white' },
            };
            const newEdges: Edge[] = [
                { id: `${newNodeId}-peer1`, source: newNodeId, target: 'peer1', animated: true },
                { id: `${newNodeId}-peer2`, source: newNodeId, target: 'peer2', animated: true },
            ];
            
            setNodes((currentNodes) => [...currentNodes, newNode]);
            setEdges((currentEdges) => [...currentEdges, ...newEdges]);

            setTimeout(() => {
                setNodes((currentNodes) => currentNodes.filter(n => n.id !== newNodeId));
                setEdges((currentEdges) => currentEdges.filter(e => e.source !== newNodeId));
                resolve(); // Resolve the promise after the node is removed
            }, 4000); // Keep it on screen for 4 seconds
        });
    };

    const upsertById = useCallback(<T extends { id: string }>(prev: T[], next: T[]) => {
        const map = new Map(prev.map((e) => [e.id, e]));
        next.forEach((e) => map.set(e.id, e));
        return Array.from(map.values());
    }, []);


    const updateGraphWithRecords = async (networkNodes: Node[], networkEdges: Edge[]) => {
        try {
            const response = await fetch('/api/records');
            const records: HealthRecord[] = await response.json();
            if (!response.ok) throw new Error('Failed to fetch records.');

            
            const recordNodes: Node[] = records.map((record, index) => ({
                id: record.recordID,
                data: { label: `Record: ${record.recordID}` },
                position: { x: 150 + (index * 120), y: 550 },
                style: { background: '#f97316', color: 'white', border: '1px solid white', borderRadius: '100%' },
                type: 'output'
            }));

            const recordEdges: Edge[] = records.flatMap(record =>
                networkNodes.filter(n => n.id.startsWith('peer')).map(peerNode => ({
                    id: `edge-${record.recordID}-${peerNode.id}`,
                    source: record.recordID,
                    target: peerNode.id,
                    type: 'smoothstep',
                    animated: false,
                    style: { stroke: '#f97316' }
                }))
            );

            setNodes([...networkNodes, ...recordNodes]);
            setEdges([...networkEdges, ...recordEdges]);
        } catch (error) {
            console.error((error as Error).message);
        }
    };

    useEffect(() => {
        const socket = new WebSocket('ws://localhost:8082');
        socket.onopen = () => setSocketStatus('Connected');
        socket.onclose = () => setSocketStatus('Disconnected');
        socket.onerror = () => setSocketStatus('Error');

        socket.onmessage = async (event) => {
            const data = JSON.parse(event.data);
            if (data.type === 'NETWORK_MAP_UPDATE') {
                const newBaseNodes = data.payload.nodes;
                const newBaseEdges = data.payload.edges;
                setBaseNodes(newBaseNodes);
                setBaseEdges(newBaseEdges);
                // Update the full graph with the new base map and existing records
                await updateGraphWithRecords(newBaseNodes, newBaseEdges);
            }
            
            if (data.type === 'NEW_TRANSACTION') {
                setIsAnimating(true);
                setLastEvent(data);
                await startAnimationSequence();
                await animateTransactionOnGraph(data.txId);
                // After animation, refresh the records on the graph
                await updateGraphWithRecords(baseNodes, baseEdges);
                setIsAnimating(false);
            }
        };

        return () => socket.close();
    }, [baseNodes, baseEdges]);

    const handleTestTransaction = async () => {
        if (isAnimating) return;
        setLastEvent(null);
        await fetch('/api/records', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                recordID: 'REC_' + Math.floor(Math.random() * 1000),
                patientID: 'GraphTestPatient',
                recordType: 'GraphTest',
                recordDataHash: 'graph_test_hash_' + Date.now(),
            }),
        });
    };

    const handleNodeClick = (event: React.MouseEvent, node: Node) => {
        setSelectedNodeId(node.id);
    };

    const handleInspectorNodeClick = (id: string) => {
        setSelectedNodeId(id);
    };

    return (
        <main className="min-h-screen w-full p-8 flex flex-col items-center justify-center text-white overflow-hidden">
            <h1 className="text-5xl font-bold mb-4">Live Transaction Flow</h1>
            <p className="text-gray-400 mb-2">A new transaction travels the DNA-like path of the distributed ledger.</p>
            <p className="text-sm mb-8">WebSocket Status: <span className={`font-bold ${socketStatus === 'Connected' ? 'text-green-400' : 'text-red-400'}`}>{socketStatus}</span></p>

            {/* The Helix Visualizer Diagram */}
            <div className="helix-visualizer">
                {/* The rotating DNA helix in the background */}
                <div className="helix">
                    <div className="strand"></div>
                    <div className="strand"></div>
                    {/* Generate the base pairs */}
                    {Array.from({ length: 40 }).map((_, i) => (
                        <div
                            key={i}
                            className="base-pair"
                            style={{ transform: `rotateY(${i * 30}deg) translateY(${ (i * 12) - 240 }px) translateZ(0)` }}
                        ></div>
                    ))}
                </div>

                {/* Network Nodes positioned absolutely */}
                <motion.div animate={nodeControls} className="node-orb" style={{ top: 0, width: 80, height: 80 }}>
                    <FiUsers size={32} />
                    <span className="text-sm mt-1">Client</span>
                </motion.div>
                <motion.div animate={nodeControls} className="node-orb" style={{ left: 0, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70 }}>
                    <FiCpu size={28} />
                    <span className="text-xs mt-1">Peer 1</span>
                </motion.div>
                <motion.div animate={nodeControls} className="node-orb" style={{ right: 0, top: '50%', transform: 'translateY(-50%)', width: 70, height: 70 }}>
                    <FiCpu size={28} />
                     <span className="text-xs mt-1">Peer 2</span>
                </motion.div>
                <motion.div animate={nodeControls} className="node-orb" style={{ bottom: 0, width: 80, height: 80 }}>
                    <FiServer size={32} />
                    <span className="text-sm mt-1">Orderer</span>
                </motion.div>
                
                {/* The Animated Transaction "Packet" */}
                <motion.div animate={packetControls} className="absolute z-20">
                    <div className="w-6 h-6 rounded-full bg-cyan-400 shadow-[0_0_20px_5px_#06b6d4]"></div>
                </motion.div>
            </div>

            <motion.button 
                onClick={handleTestTransaction} 
                disabled={isAnimating || socketStatus !== 'Connected'}
                whileHover={{ scale: 1.05 }}
                className="mt-8 bg-cyan-500 text-black font-bold py-3 px-8 rounded-lg text-lg disabled:bg-gray-600 disabled:cursor-not-allowed"
            >
                {isAnimating ? 'Animating...' : 'Initiate Test Transaction'}
            </motion.button>

            {lastEvent && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-8 p-4 glass-card rounded-lg w-full max-w-3xl text-left">
                     <h3 className="font-bold text-lg text-green-400 flex items-center"><FiCheckCircle className="mr-2" />Last Event Received</h3>
                     <pre className="text-xs text-gray-300 whitespace-pre-wrap mt-2">{JSON.stringify(lastEvent, null, 2)}</pre>
                 </motion.div>
            )}

            <div className="w-full max-w-6xl mt-16">
              <motion.h2 className="text-3xl font-bold mb-4 text-center">Network Topology & Ledger</motion.h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2">
                  <NetworkGraph 
                    nodes={nodes} 
                    edges={edges} 
                    onNodeClick={handleNodeClick} 
                  />
                </div>
                <div className="md:col-span-1">
                  {/* Pass the full, dynamic nodes list to the inspector */}
                  <NodeInspector 
                    nodes={nodes} 
                    selectedNodeId={selectedNodeId}
                    onNodeClick={handleInspectorNodeClick}
                  />
                </div>
              </div>
            </div>
        </main>
    );
}