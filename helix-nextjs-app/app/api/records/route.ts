// app/api/records/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToGateway, getContract } from '../../../lib/fabric';
import { TextDecoder } from 'util';

const utf8Decoder = new TextDecoder();
type OrgName = 'Org1MSP' | 'Org2MSP';

// Helper to get org from request
function getOrgFromRequest(req: NextRequest): OrgName {
    const org = req.nextUrl.searchParams.get('org') as OrgName;
    if (org === 'Org1MSP' || org === 'Org2MSP') {
        return org;
    }
    // Default to Org1 if not specified or invalid
    return 'Org1MSP';
}


// --- NEW GET FUNCTION ---
export async function GET(req: NextRequest) {
    const org = getOrgFromRequest(req);
    console.log(`Received GET request for all records as ${org}`);
    
    const { gateway, client } = await connectToGateway(org);
    try {
        const contract = await getContract(gateway);
        const resultBytes = await contract.evaluateTransaction('GetAllRecords');
        const resultJson = new TextDecoder().decode(resultBytes);

        // --- ADD THIS CHECK ---
        // If the chaincode returns an empty string, it means no records were found.
        // Return a valid empty JSON array to the frontend.
        if (!resultJson) {
            return NextResponse.json([]);
        }
        // --- END OF CHECK --

        return NextResponse.json(JSON.parse(resultJson));
    } catch (error) {
        console.error(`🔴 [${org}] Full error:`, error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}

// --- EXISTING POST FUNCTION (No changes needed) ---
export async function POST(req: NextRequest) {
    const org = getOrgFromRequest(req); // Determine which org is creating the record
    console.log(`Received POST request to create record as ${org}`);

    const { gateway, client } = await connectToGateway(org);
    try {
        const contract = await getContract(gateway);
        const recordData = await req.json();

        // The private data is passed in a transient field named "record"
        const transientData = Buffer.from(JSON.stringify(recordData));

        // The function in our PDC-aware chaincode is named 'CreateRecord'.
        await contract.submit('CreateRecord', {
            transientData: {
                record: transientData,
            },
            // --- FIX IS HERE: Specify the endorsing org directly in the options ---
            endorsingOrganizations: [org],
        });
        
        return NextResponse.json({ message: `Record ${recordData.recordID} created successfully by ${org}` });
    } catch (error) {
        console.error('--- TRANSACTION SUBMISSION FAILED ---');
        console.error(error); 
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}