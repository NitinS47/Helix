// listeners/websocketListener.ts
import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketServer } from 'ws';

type Node = {
  id: string;
  data: { label: string };
  position: { x: number; y: number };
  style?: React.CSSProperties;
  type?: string;
};
type Edge = {
  id: string;
  source: string;
  target: string;
  type?: string;
  animated?: boolean;
  style?: React.CSSProperties;
};
// END OF CHANGES

const WEBSOCKET_PORT = 8082;

// --- WebSocket Server Setup ---
const wss = new WebSocketServer({ port: WEBSOCKET_PORT });
console.log(`✅ WebSocket server started on ws://localhost:${WEBSOCKET_PORT}`);

// --- Global State Management ---
let gateway: Gateway;
let networkNodes: Node[] = [];
let networkEdges: Edge[] = [];

/**
 * The single source of truth function. It gets the current network map,
 * fetches all records from the ledger, combines them, and broadcasts
 * the complete graph state to all connected clients.
 */
async function broadcastFullGraphState() {
    if (!gateway) {
        console.log('Gateway not connected. Skipping broadcast.');
        return;
    }
    console.log('🔄 Recalculating and broadcasting full graph state...');

    try {
        // --- CORRECTED LOGIC: Await getNetwork() before calling getContract() ---
        const network = await gateway.getNetwork('mychannel');
        const contract = network.getContract('helixcc');
        
        // 1. Get all records from the ledger.
        const resultBytes = await contract.evaluateTransaction('GetAllRecords');
        const records = JSON.parse(Buffer.from(resultBytes).toString('utf8'));

        // 2. Convert records to graph nodes.
        const recordNodes: Node[] = records.map((record: any, index: number) => ({
            id: record.RecordID,
            data: { label: `Record: ${record.RecordID}` },
            position: { x: 150 + (index * 120), y: 550 },
            style: { background: '#f97316', color: 'white', border: '1px solid white', borderRadius: '100%' },
            type: 'output'
        }));
        
        // 3. Create edges connecting records to the peers.
        const recordEdges: Edge[] = records.flatMap((record: any) =>
            networkNodes.filter(n => n.id.startsWith('peer')).map(peerNode => ({
                id: `edge-${record.RecordID}-${peerNode.id}`,
                source: record.RecordID,
                target: peerNode.id,
                type: 'smoothstep',
                style: { stroke: '#f97316' }
            }))
        );

        // 4. Combine infrastructure and record data.
        const fullNodes = [...networkNodes, ...recordNodes];
        const fullEdges = [...networkEdges, ...recordEdges];

        const message = JSON.stringify({
            type: 'GRAPH_UPDATE',
            payload: { nodes: fullNodes, edges: fullEdges }
        });

        // 5. Broadcast to all clients.
        wss.clients.forEach(client => {
            if (client.readyState === client.OPEN) {
                client.send(message);
            }
        });
        console.log(`Broadcast complete. Sent graph with ${fullNodes.length} nodes.`);

    } catch (error) {
        console.error('🔴 Error broadcasting full graph state:', error);
    }
}

/**
 * Connects to the Fabric network and discovers its topology (peers, orderers).
 */
async function discoverNetwork() {
    if (!gateway) return;
    try {
        console.log('🔍 Performing network discovery...');
        const network = await gateway.getNetwork('mychannel');
        const channel = network.getChannel();
        const discoveryService = channel.newDiscoveryService('discovery');

        const endorsingPeers = channel.getEndorsers();
        const discoveryRequest = {
            target: endorsingPeers[0], // Target the first available endorsing peer
            config: true,
        };

        const discoveryResult = await discoveryService.send(discoveryRequest);
        
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        
        const peers = discoveryResult.peers_by_org['Org1MSP']?.peers || [];
        peers.forEach((peer: any, i: number) => {
            nodes.push({ id: `peer${i}.org1`, data: { label: `Peer ${i} (Org1)` }, position: { x: 100 + i * 400, y: 200 }, style: { background: '#0ea5e9', color: 'white', border: 'none' } });
        });
        
        const orderers = discoveryResult.orderers?.['OrdererMSP']?.endpoints || [];
        orderers.forEach((orderer: any, i: number) => {
            const ordererId = `orderer${i}`;
            nodes.push({ id: ordererId, data: { label: `Orderer ${i}` }, position: { x: 300, y: 400 }, style: { background: '#a855f7', color: 'white', border: 'none' } });
            nodes.filter(n => n.id.startsWith('peer')).forEach((peerNode) => {
                edges.push({ id: `edge-${peerNode.id}-${ordererId}`, source: peerNode.id, target: ordererId, type: 'step' });
            });
        });
        
        // Update the global state
        networkNodes = nodes;
        networkEdges = edges;
        
        console.log(`Discovery complete. Found ${networkNodes.length} base nodes.`);
        await broadcastFullGraphState();
    } catch (error) {
        console.error('🔴 Error during network discovery:', error);
    }
}

/**
 * Main function to set up the gateway connection and listeners.
 */
async function main() {
    try {
        const wallet = await Wallets.newInMemoryWallet();
        const cert = fs.readFileSync(path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-cert.pem'), 'utf8');
        const key = fs.readFileSync(path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-key.pem'), 'utf8');
        const identity = { credentials: { certificate: cert, privateKey: key }, mspId: 'Org1MSP', type: 'X.509' };
        await wallet.put('Org1Admin', identity);
        
        const ccp = JSON.parse(fs.readFileSync(path.resolve(__dirname, '..', 'fabric_config', 'connection-org1.json'), 'utf8'));
        gateway = new Gateway();
        await gateway.connect(ccp, { wallet, identity: 'Org1Admin', discovery: { enabled: true, asLocalhost: true } });
        
        const network = await gateway.getNetwork('mychannel');

        // The block listener now simply triggers a full graph state refresh.
        await network.addBlockListener(async (event) => {
            console.log(`🚀 New Block Detected! Block Number: ${event.blockNumber}. Triggering graph update.`);
            await broadcastFullGraphState();
        });
        console.log('✅ Fabric listener registered.');
        
        // Run discovery on startup and then periodically.
        await discoverNetwork();
        setInterval(discoverNetwork, 60000); // Refresh network map every minute
    } catch (error) {
        console.error(`🔴 Fatal error in main function: ${error}`);
        process.exit(1);
    }
}

// When a new browser connects, immediately send it the current graph state.
wss.on('connection', () => {
    console.log('🔗 New client connected. Sending current graph state.');
    broadcastFullGraphState();
});

main();