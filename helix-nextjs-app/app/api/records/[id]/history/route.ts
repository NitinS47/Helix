// app/api/records/[id]/history/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToGateway, getContract } from '../../../../../lib/fabric';
import { TextDecoder } from 'util';

const utf8Decoder = new TextDecoder();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const recordId = params.id;
    console.log(`Received request for history of record ${recordId}`);
    const { gateway, client } = await connectToGateway();
    try {
        const contract = await getContract(gateway);

        console.log('Evaluating GetRecordHistory transaction');
        const resultBytes = await contract.evaluateTransaction('GetRecordHistory', recordId);

        const resultJson = utf8Decoder.decode(resultBytes);
        console.log('GetRecordHistory query result:', resultJson);

        return NextResponse.json(JSON.parse(resultJson));
    } catch (error) {
        console.error('Failed to evaluate transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}