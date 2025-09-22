// app/api/records/[id]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToGateway, getContract } from '../../../../lib/fabric';
import { TextDecoder } from 'util';

const utf8Decoder = new TextDecoder();

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
    const recordId = params.id;
    const { gateway, client } = await connectToGateway();
    try {
        const contract = await getContract(gateway);
        
        console.log(`Evaluating QueryHealthRecord for ${recordId}`);
        const resultBytes = await contract.evaluateTransaction('QueryHealthRecord', recordId);
        
        const resultJson = utf8Decoder.decode(resultBytes);
        console.log('Query result:', resultJson);

        return NextResponse.json(JSON.parse(resultJson));
    } catch (error) {
        console.error('Failed to evaluate transaction:', error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}