// app/api/records/share/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { connectToGateway, getContract } from '../../../../lib/fabric';

type OrgName = 'Org1MSP' | 'Org2MSP';

function getOrgFromRequest(req: NextRequest): OrgName {
    const org = req.nextUrl.searchParams.get('org') as OrgName;
    return (org === 'Org1MSP' || org === 'Org2MSP') ? org : 'Org1MSP';
}

// Handler for Granting Access (Sharing the record)
export async function POST(req: NextRequest) {
    const callingOrg = getOrgFromRequest(req);
    // All required data now comes from the body
    const { recordID, targetOrg } = await req.json();

    const { gateway, client } = await connectToGateway(callingOrg);
    try {
        const contract = await getContract(gateway);
        await contract.submitTransaction('ShareRecord', recordID, targetOrg);
        return NextResponse.json({ message: `Record ${recordID} shared successfully with ${targetOrg}` });
    } catch (error) {
        console.log(error);
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}

// Handler for Revoking Access
export async function DELETE(req: NextRequest) {
    const callingOrg = getOrgFromRequest(req);
    // All required data now comes from the body
    const { recordID, targetOrg } = await req.json();

    const { gateway, client } = await connectToGateway(callingOrg);
    try {
        const contract = await getContract(gateway);
        await contract.submitTransaction('RevokeSharedRecord', recordID, targetOrg);
        return NextResponse.json({ message: `Access to ${recordID} revoked from ${targetOrg}` });
    } catch (error) {
        return NextResponse.json({ error: (error as Error).message }, { status: 500 });
    } finally {
        client.close();
    }
}