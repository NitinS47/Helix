// app/api/records/[id]/access/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToGateway, getContract } from '../../../../../lib/fabric';

// --- NEW POST FUNCTION ---
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const recordId = params.id;
    const { granteeID } = await req.json();

    if (!granteeID) {
        return NextResponse.json({ error: 'granteeID is required in the request body' }, { status: 400 });
    }

    console.log(`Received request to grant access for ${granteeID} to record ${recordId}`);
    const { gateway, client } = await connectToGateway();
    try {
        const contract = await getContract(gateway);

        console.log('Submitting GrantAccess transaction');
        await contract.submitTransaction('GrantAccess', recordId, granteeID);
        console.log('Transaction committed successfully.');

        return NextResponse.json({ message: `Access granted to ${granteeID} for record ${recordId}` });
    } catch (error) {
        console.error('Failed to submit transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}

// --- EXISTING DELETE FUNCTION (No changes needed) ---
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    // ... your existing DELETE code remains here
    const recordId = params.id;
    const { granteeID } = await req.json();

    if (!granteeID) {
        return NextResponse.json({ error: 'granteeID is required in the request body' }, { status: 400 });
    }

    console.log(`Received request to revoke access for ${granteeID} from record ${recordId}`);
    const { gateway, client } = await connectToGateway();
    try {
        const contract = await getContract(gateway);

        console.log('Submitting RevokeAccess transaction');
        await contract.submitTransaction('RevokeAccess', recordId, granteeID);
        console.log('Transaction committed successfully.');

        return NextResponse.json({ message: `Access revoked for ${granteeID} from record ${recordId}` });
    } catch (error) {
        console.error('Failed to submit transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}