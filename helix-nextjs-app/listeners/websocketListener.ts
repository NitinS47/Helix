// listeners/websocketListener.ts
import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketServer } from 'ws';
import type { Node, Edge } from 'reactflow';

const WEBSOCKET_PORT = 8080;
const wss = new WebSocketServer({ port: WEBSOCKET_PORT });
console.log(`✅ WebSocket server started on ws://localhost:${WEBSOCKET_PORT}`);

let gateway: Gateway;
let networkNodes: Node[] = [];
let networkEdges: Edge[] = [];

async function broadcastFullGraphState() {
    if (!gateway) return;
    try {
        // --- FIX IS HERE ---
        // 1. First, AWAIT the network object.
        const network = await gateway.getNetwork('mychannel');
        // 2. THEN, use the network object to get the contract.
        const contract = network.getContract('helixcc');
        // --- END FIX ---

        const resultBytes = await contract.evaluateTransaction('GetAllRecords');
        const records = JSON.parse(Buffer.from(resultBytes).toString('utf8'));

        const recordNodes: Node[] = records.map((record: any, index: number) => ({
            id: record.recordID, data: { label: `Record: ${record.recordID}` }, position: { x: 150 + (index * 120), y: 550 }, style: { background: '#f97316', color: 'white', border: '1px solid white', borderRadius: '100%' }, type: 'output'
        }));
        
        const recordEdges: Edge[] = records.flatMap((record: any) =>
            networkNodes.filter(n => n.id.startsWith('peer')).map(peerNode => ({
                id: `edge-${record.recordID}-${peerNode.id}`, source: record.recordID, target: peerNode.id, type: 'smoothstep', style: { stroke: '#f97316' }
            }))
        );
        const fullNodes = [...networkNodes, ...recordNodes];
        const fullEdges = [...networkEdges, ...recordEdges];
        const message = JSON.stringify({ type: 'GRAPH_UPDATE', payload: { nodes: fullNodes, edges: fullEdges } });
        wss.clients.forEach(client => { if (client.readyState === client.OPEN) { client.send(message); } });
    } catch (error) { console.error('🔴 Error broadcasting full graph state:', error); }
}

async function discoverNetwork() {
    // ... (This function remains unchanged and is correct)
    if (!gateway) return;
    try {
        console.log('🔍 Performing network discovery...');
        const network = await gateway.getNetwork('mychannel');
        const channel = network.getChannel();
        const discoveryService = channel.newDiscoveryService('discovery');
        const endorsingPeers = channel.getEndorsers();
        const discoveryRequest = { target: endorsingPeers[0], config: true, };
        const discoveryResult = await discoveryService.send(discoveryRequest);
        
        const nodes: Node[] = [];
        const edges: Edge[] = [];
        
        if (discoveryResult?.peers_by_org?.['Org1MSP']?.peers) {
            const peers = discoveryResult.peers_by_org['Org1MSP'].peers;
            peers.forEach((_peer: any, i: number) => { 
                nodes.push({ id: `peer${i}.org1`, data: { label: `Peer ${i} (Org1)` }, position: { x: 100 + i * 400, y: 200 }, style: { background: '#0ea5e9', color: 'white', border: 'none' } }); 
            });
        }
        
        if (discoveryResult?.orderers?.['OrdererMSP']?.endpoints) {
            const orderers = discoveryResult.orderers['OrdererMSP'].endpoints;
            orderers.forEach((_orderer: any, i: number) => { 
                const ordererId = `orderer${i}`; 
                nodes.push({ id: ordererId, data: { label: `Orderer ${i}` }, position: { x: 300, y: 400 }, style: { background: '#a855f7', color: 'white', border: 'none' } }); 
                nodes.filter(n => n.id.startsWith('peer')).forEach((peerNode) => { 
                    edges.push({ id: `edge-${peerNode.id}-${ordererId}`, source: peerNode.id, target: ordererId, type: 'step' }); 
                });
            });
        }
        
        networkNodes = nodes;
        networkEdges = edges;
        
        console.log(`Discovery complete. Found ${nodes.length} base nodes.`);
        await broadcastFullGraphState();
    } catch (error) {
        console.error('🔴 Error during network discovery:', error);
    }
}

async function main() {
    // ... (This function remains unchanged and is correct)
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
        await network.addBlockListener(async () => {
            console.log(`🚀 New Block Detected! Triggering graph update.`);
            await broadcastFullGraphState();
        });
        console.log('✅ Fabric listener registered.');
        
        await discoverNetwork();
        setInterval(discoverNetwork, 60000);
    } catch (error) {
        console.error(`🔴 Fatal error in main function: ${error}`);
        process.exit(1);
    }
}

wss.on('connection', () => {
    // ... (This function remains unchanged and is correct)
    console.log('🔗 New client connected. Sending current graph state.');
    broadcastFullGraphState();
});

main();