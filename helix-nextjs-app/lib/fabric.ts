// lib/fabric.ts
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Gateway, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const channelName = 'mychannel';
const chaincodeName = 'helixcc';
const mspId = 'Org1MSP';

// --- MODIFIED ---
// All paths are now relative to the project's 'fabric_config' directory
const configPath = path.resolve(process.cwd(), 'fabric_config');
const certPath = path.resolve(configPath, 'org1-admin-cert.pem');
const keyPath = path.resolve(configPath, 'org1-admin-key.pem');
const tlsCertPath = path.resolve(configPath, 'ca.crt');
// --- END MODIFIED ---

// Gateway peer endpoint.
const peerEndpoint = 'localhost:7051';
const peerHostAlias = 'peer0.org1.example.com';

async function newGrpcConnection(): Promise<grpc.Client> {
    const tlsRootCert = await fs.readFile(tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': peerHostAlias,
    });
}

async function newIdentity(): Promise<Identity> {
    const cert = await fs.readFile(certPath);
    return { mspId, credentials: cert };
}

async function newSigner(): Promise<Signer> {
    // In the test network, the private key is in a directory named after the key's SKI
    // We just read the first file in that directory.
    const keyPem = await fs.readFile(keyPath);
    const privateKey = crypto.createPrivateKey(keyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// This is the main function to be used by API routes
export async function connectToGateway(): Promise<{ gateway: Gateway, client: grpc.Client }> {
    const client = await newGrpcConnection();
    const gateway = connect({
        client,
        identity: await newIdentity(),
        signer: await newSigner(),
    });

    return { gateway, client };
}

export async function getContract(gateway: Gateway): Promise<Contract> {
    const network = gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}