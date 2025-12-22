import { NextResponse } from 'next/server';
import { createVPNNode } from '@/lib/digitalocean';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { doToken, tailscaleAuthKey, region } = body;

        // We can also accept headers if preferred, but body is easier for POST
        const token = doToken || request.headers.get('x-do-token');

        if (!token || !tailscaleAuthKey || !region) {
            console.error('[Connect] Missing parameters:', { hasToken: !!token, hasAuthKey: !!tailscaleAuthKey, region });
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const keyPrefix = tailscaleAuthKey.substring(0, 10) + '...';
        console.log(`[Connect] Creating droplet in ${region} with AuthKey (prefix: ${keyPrefix}, len: ${tailscaleAuthKey.length})`);
        const result = await createVPNNode(token, tailscaleAuthKey, region);
        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
