import { NextResponse } from 'next/server';
import { getConfig, saveConfig } from '@/lib/config';

export async function GET() {
    const config = await getConfig();
    return NextResponse.json(config);
}

export async function POST(request: Request) {
    try {
        const body = await request.json();
        await saveConfig(body);
        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: 'Failed to save config' }, { status: 500 });
    }
}
