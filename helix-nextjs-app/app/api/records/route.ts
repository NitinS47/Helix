// app/api/records/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToGateway, getContract } from '../../../lib/fabric';
import { TextDecoder } from 'util';

const utf8Decoder = new TextDecoder();

// --- NEW GET FUNCTION ---
export async function GET() {
    console.log('Received request to get all records');
    const { gateway, client } = await connectToGateway();
    try {
        const contract = await getContract(gateway);
        
        const resultBytes = await contract.evaluateTransaction('GetAllRecords');
        
        const resultJsonString = new TextDecoder().decode(resultBytes);
        
        const parsedData = JSON.parse(resultJsonString);

        const resultJson = utf8Decoder.decode(resultBytes);

        return NextResponse.json(JSON.parse(resultJson));
    } catch (error) {
        console.error('Failed to evaluate transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}

// --- EXISTING POST FUNCTION (No changes needed) ---
export async function POST(req: NextRequest) {
    const { gateway, client } = await connectToGateway();
    try {
        const contract = await getContract(gateway);
        const { recordID, patientID, recordType, recordDataHash } = await req.json();

        console.log(`Submitting CreateHealthRecord transaction for ${recordID}`);
        await contract.submitTransaction(
            'CreateHealthRecord',
            recordID,
            patientID,
            recordType,
            recordDataHash
        );
        console.log('Transaction committed successfully.');
        
        return NextResponse.json({ message: `Record ${recordID} created successfully` });
    } catch (error) {
        console.error('Failed to submit transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}