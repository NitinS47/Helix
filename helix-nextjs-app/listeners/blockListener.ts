// listeners/blockListener.ts
import { Gateway, Wallets } from 'fabric-network';
import * as path from 'path';
import * as fs from 'fs';

async function main() {
    try {
        // --- 1. Create a wallet and add the identity ---
        // The wallet holds the identities used to connect. We'll build one in memory.
        const wallet = await Wallets.newInMemoryWallet();
        
        // Read the credentials from the files
        const certPath = path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-cert.pem');
        const cert = fs.readFileSync(certPath, 'utf8');
        
        const keyPath = path.resolve(__dirname, '..', 'fabric_config', 'org1-admin-key.pem');
        const key = fs.readFileSync(keyPath, 'utf8');

        // Create the identity object and import it into the wallet
        const identity = {
            credentials: {
                certificate: cert,
                privateKey: key,
            },
            mspId: 'Org1MSP',
            type: 'X.509',
        };
        await wallet.put('Org1Admin', identity);

        // --- 2. Connect to the gateway ---
        // Load the connection profile
        const ccpPath = path.resolve(__dirname, '..', 'fabric_config', 'connection-org1.json');
        const ccp = JSON.parse(fs.readFileSync(ccpPath, 'utf8'));

        // Create a new gateway for connecting to our peer node.
        const gateway = new Gateway();
        await gateway.connect(ccp, { 
            wallet, 
            identity: 'Org1Admin', 
            discovery: { enabled: true, asLocalhost: true } 
        });

        // --- 3. Register the block listener ---
        const network = await gateway.getNetwork('mychannel');
        
        const listener = await network.addBlockListener(async (event) => {
            console.log('---------------------------------');
            console.log(`🚀 New Block Detected! Block Number: ${event.blockNumber}`);
            
            // Type guard to check if this is a full block (IBlock)
            if ('data' in event.blockData) {
                // Inside this block, TypeScript knows event.blockData is a full block
                for (const tx of event.blockData.data?.data ?? []) {
                    // This complex path is needed to safely extract data from the block structure
                    const payload = (tx as any)?.payload?.data?.actions[0]?.payload?.action?.proposal_response_payload?.extension;
                    const txId = (tx as any)?.payload?.header?.channel_header?.tx_id;
                    
                    if (payload && txId) {
                        const chaincodeId = payload.chaincode_id.name;
                        console.log(`  - Transaction ID: ${txId}`);
                        console.log(`  - Chaincode: ${chaincodeId}`);
                    }
                }
            } else {
                // This is a filtered block, which doesn't contain full transaction data
                console.log('  - Received a filtered block. Cannot inspect transaction payloads.');
            }
            console.log('---------------------------------');
        });

        console.log('✅ Block listener registered. Listening for new block events...');
        console.log('Keep this terminal running. In another terminal, submit a transaction using the web UI.');

    } catch (error) {
        console.error(`Failed to run the block listener: ${error}`);
        process.exit(1);
    }
}

main();