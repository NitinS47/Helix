// app/api/records/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToGateway, getContract } from '../../../../lib/fabric';
import { TextDecoder } from 'util';

type OrgName = 'Org1MSP' | 'Org2MSP';
const utf8Decoder = new TextDecoder();

function getOrgFromRequest(req: NextRequest): OrgName {
    const org = req.nextUrl.searchParams.get('org') as OrgName;
    return (org === 'Org1MSP' || org === 'Org2MSP') ? org : 'Org1MSP';
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const recordId = params.id;
    const { gateway, client } = await connectToGateway();
    try {
        const contract = await getContract(gateway);
        
        const resultBytes = await contract.evaluateTransaction('QueryHealthRecord', recordId);
        
        const resultJson = utf8Decoder.decode(resultBytes);

        return NextResponse.json(JSON.parse(resultJson));
    } catch (error) {
        console.error('Failed to evaluate transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    const callingOrg = getOrgFromRequest(req);
    const recordId = params.id;
    console.log(`Received request from ${callingOrg} to delete record ${recordId}`);
    
    const { gateway, client } = await connectToGateway(callingOrg);
    try {
        const contract = await getContract(gateway);

        console.log('Submitting DeleteRecord transaction');
        await contract.submitTransaction('DeleteRecord', recordId);
        console.log('Transaction committed successfully.');

        return NextResponse.json({ message: `Record ${recordId} has been deleted from ${callingOrg}'s collection` });
    } catch (error) {
        console.error('Failed to submit transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}