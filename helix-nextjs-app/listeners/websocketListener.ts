// listeners/websocketListener.ts
import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';
import { WebSocketServer } from 'ws';

// Define the port for our WebSocket server
const WEBSOCKET_PORT = 8082;

// 1. Set up the WebSocket Server
const wss = new WebSocketServer({ port: WEBSOCKET_PORT });
console.log(`✅ WebSocket server started on ws://localhost:${WEBSOCKET_PORT}`);

// A simple broadcast function to send data to all connected clients
function broadcast(data: object) {
    const message = JSON.stringify(data);
    console.log(`Broadcasting message to ${wss.clients.size} clients: ${message}`);
    wss.clients.forEach(client => {
        if (client.readyState === client.OPEN) {
            client.send(message);
        }
    });
}

wss.on('connection', ws => {
    console.log('🔗 New client connected.');
    ws.on('close', () => {
        console.log('✖️ Client disconnected.');
    });
});


// 2. Main Fabric Listener Logic (adapted from your blockListener.ts)
async function main() {
    try {
        const wallet = await Wallets.newInMemoryWallet();
        const certPath = path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-cert.pem');
        const cert = fs.readFileSync(certPath, 'utf8');
        const keyPath = path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-key.pem');
        const key = fs.readFileSync(keyPath, 'utf8');

        const identity = {
            credentials: { certificate: cert, privateKey: key },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('Org1Admin', identity);

        const ccpPath = path.resolve(__dirname, '..', 'fabric_config', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: 'Org1Admin', 
            discovery: { enabled: true, asLocalhost: true } 
        });

        const network = await gateway.getNetwork('mychannel');
        
        // Register the block listener
        await network.addBlockListener(async (event) => {
            const blockNumber = event.blockNumber.toString();
            
            if ('data' in event.blockData) {
                for (const tx of event.blockData.data?.data ?? []) {
                    const payload = (tx as any)?.payload?.data?.actions[0]?.payload?.action?.proposal_response_payload?.extension;
                    const txId = (tx as any)?.payload?.header?.channel_header?.tx_id;
                    
                    if (payload && txId) {
                        // Instead of console.log, we now broadcast the event
                        broadcast({
                            type: 'NEW_TRANSACTION',
                            blockNumber,
                            txId,
                            chaincode: payload.chaincode_id.name,
                            timestamp: new Date().toISOString()
                        });
                    }
                }
            }
        });

        console.log('✅ Fabric listener registered. Listening for new block events...');

    } catch (error) {
        console.error(`🔴 Failed to run the Fabric listener: ${error}`);
        process.exit(1);
    }
}

// Start the Fabric listener after setting up the WebSocket server
main();