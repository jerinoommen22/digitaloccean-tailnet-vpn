import { NextResponse } from 'next/server';
import { getVPNDroplets, deleteDroplet } from '@/lib/digitalocean';
import { listDevices, deleteDevice } from '@/lib/tailscale';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { doToken, tailscaleKey, tailnet } = body;
        // tailscaleKey is the API Key (not auth key) for management actions

        const token = doToken || request.headers.get('x-do-token');

        if (!token || !tailscaleKey || !tailnet) {
            return NextResponse.json({ error: 'Missing credentials (DO Token, TS Key, TS Tailnet)' }, { status: 400 });
        }

        // 1. Get Active Droplets
        const droplets = await getVPNDroplets(token);

        if (droplets.length === 0) {
            return NextResponse.json({ message: 'No active VPN nodes found' });
        }

        const results = [];

        // 2. Process cleanup
        // Helper to cleanup one node
        for (const droplet of droplets) {
            // Delete from DO
            await deleteDroplet(token, droplet.id);

            // Delete from Tailscale
            // We need to find the device ID by matching hostname (droplet.name)
            // Note: Tailscale device listing might take a second to reflect changes or might be tricky
            try {
                // Tailscale lowercases hostnames. Droplet might be MixedCase.
                const targetHostname = droplet.name.toLowerCase();

                const devices = await listDevices(tailscaleKey, tailnet);
                // Find ALL devices with this hostname (handling duplicates/stale nodes)
                const matchingDevices = devices.filter(d => {
                    const match = d.hostname.toLowerCase() === targetHostname;
                    console.log(`[Disconnect] Checking ${d.hostname} (id: ${d.id}) against ${targetHostname} -> Match: ${match}`);
                    return match;
                });

                if (matchingDevices.length > 0) {
                    console.log(`[Disconnect] Found ${matchingDevices.length} devices matching ${targetHostname}. Deleting all...`);

                    await Promise.all(matchingDevices.map(d => deleteDevice(tailscaleKey, d.id)));

                    results.push({
                        name: droplet.name,
                        status: `Deleted from DO. Removed ${matchingDevices.length} node(s) from Tailscale.`
                    });
                } else {
                    console.log(`[Disconnect] Device not found in Tailscale: ${targetHostname}`);
                    results.push({ name: droplet.name, status: 'Deleted from DO (Device not found in TS)' });
                }
            } catch (tsError: any) {
                console.error('Tailscale cleanup error:', tsError);
                results.push({ name: droplet.name, status: 'Deleted from DO (Tailscale cleanup failed)' });
            }
        }

        return NextResponse.json({ results });
    } catch (error: any) {
        console.error('[Disconnect] Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
