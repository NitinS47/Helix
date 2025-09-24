// lib/fabric.ts
import * as grpc from '@grpc/grpc-js';
import { connect, Contract, Gateway, Identity, Signer, signers } from '@hyperledger/fabric-gateway';
import * as crypto from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';

const channelName = 'mychannel';
const chaincodeName = 'helixcc';

// Define connection details for both organizations
const orgDetails = {
    Org1MSP: {
        peerEndpoint: 'localhost:7051',
        peerHostAlias: 'peer0.org1.example.com',
        tlsCertPath: path.resolve(process.cwd(), 'fabric_config', 'org1-ca.crt'),
        certPath: path.resolve(process.cwd(), 'fabric_config', 'org1-admin-cert.pem'),
        keyPath: path.resolve(process.cwd(), 'fabric_config', 'org1-admin-key.pem'),
    },
    Org2MSP: {
        peerEndpoint: 'localhost:9051',
        peerHostAlias: 'peer0.org2.example.com',
        tlsCertPath: path.resolve(process.cwd(), 'fabric_config', 'org2-ca.crt'),
        certPath: path.resolve(process.cwd(), 'fabric_config', 'org2-admin-cert.pem'),
        keyPath: path.resolve(process.cwd(), 'fabric_config', 'org2-admin-key.pem'),
    }
};

type OrgName = 'Org1MSP' | 'Org2MSP';

async function newGrpcConnection(org: OrgName): Promise<grpc.Client> {
    const details = orgDetails[org];
    const tlsRootCert = await fs.readFile(details.tlsCertPath);
    const tlsCredentials = grpc.credentials.createSsl(tlsRootCert);
    return new grpc.Client(details.peerEndpoint, tlsCredentials, {
        'grpc.ssl_target_name_override': details.peerHostAlias,
    });
}

async function newIdentity(org: OrgName): Promise<Identity> {
    const cert = await fs.readFile(orgDetails[org].certPath);
    return { mspId: org, credentials: cert };
}

async function newSigner(org: OrgName): Promise<Signer> {
    // In the test network, the private key is in a directory named after the key's SKI
    // We just read the first file in that directory.
    const keyPem = await fs.readFile(orgDetails[org].keyPath);
    const privateKey = crypto.createPrivateKey(keyPem);
    return signers.newPrivateKeySigner(privateKey);
}

// This is the main function to be used by API routes
export async function connectToGateway(org: OrgName): Promise<{ gateway: Gateway, client: grpc.Client }> {
    const client = await newGrpcConnection(org);
    const gateway = connect({
        client,
        identity: await newIdentity(org),
        signer: await newSigner(org),
    });
    return { gateway, client };
}

export async function getContract(gateway: Gateway): Promise<Contract> {
    const network = gateway.getNetwork(channelName);
    return network.getContract(chaincodeName);
}