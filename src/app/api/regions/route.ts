import { NextResponse } from 'next/server';
import { listRegions } from '@/lib/digitalocean';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    // Allow passing token via query param or header
    const token = request.headers.get('x-do-token') || searchParams.get('token');

    if (!token) {
        return NextResponse.json({ error: 'DigitalOcean Token is required' }, { status: 401 });
    }

    try {
        const regions = await listRegions(token);
        return NextResponse.json({ regions });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
