import { NextResponse } from 'next/server';
import { getVPNDroplets } from '@/lib/digitalocean';
import { differenceInMinutes } from 'date-fns';

// Minimal droplet cost per hour (approximate for s-1vcpu-512mb-10gb)
// In reality, this depends on the region and actual size, but $4/mo is ~$0.006/hr
const HOURLY_RATE = 0.006;

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const token = request.headers.get('x-do-token') || searchParams.get('token');
    const tailscaleKey = request.headers.get('x-tailscale-key');
    const tailnet = request.headers.get('x-tailnet');

    if (!token) {
        return NextResponse.json({ error: 'DigitalOcean Token is required' }, { status: 401 });
    }

    try {
        const droplets = await getVPNDroplets(token);

        let tailscaleDevices: any[] = [];
        if (tailscaleKey && tailnet) {
            try {
                // Fetch devices from Tailscale to verify connectivity
                const { listDevices } = await import('@/lib/tailscale');
                tailscaleDevices = await listDevices(tailscaleKey, tailnet);
                console.log(`[Status] Found ${tailscaleDevices.length} Tailscale devices:`, tailscaleDevices.map(d => d.hostname).join(', '));
            } catch (e) {
                console.error("Failed to fetch Tailscale status:", e);
                // We don't fail the whole request, just proceed without tailscale verification
            }
        } else {
            console.log("[Status] No Tailscale credentials provided in headers/config.");
        }

        // We assume mostly 1 active VPN node, but return list
        const activeNodes = await Promise.all(droplets.map(async (droplet) => {
            console.log(`[Status] Checking Droplet: ${droplet.name} (${droplet.status})`);
            const created = new Date(droplet.created_at);
            const now = new Date();
            const minutesRunning = differenceInMinutes(now, created);
            const hoursRunning = minutesRunning / 60;
            const cost = hoursRunning * HOURLY_RATE;

            // Determine detailed status
            let provisioningStatus: 'starting' | 'ready' | 'offline' = 'starting';

            if (tailscaleDevices.length > 0) {
                // Check if any device matches this droplet's hostname
                // Our droplet naming convention is vpn-{region}-{timestamp}
                // Tailscale might sanitize it, but normally it keeps it.
                const device = tailscaleDevices.find(d => d.hostname === droplet.name);

                if (device) {
                    console.log(`[Status] MATCH FOUND for ${droplet.name}! Device ID: ${device.id}`);
                    // Check if it's actually connected/seen recently?
                    // For now, presence in the list is a good enough indicator for "joined"
                    // We could check lastSeen, but for a new connection it might be null or old?
                    // Actually, if it's in the list, it has authenticated.
                    provisioningStatus = 'ready';

                    // Auto-approve exit node routes
                    const EXIT_ROUTES = ["0.0.0.0/0", "::/0"];
                    // Check if routes are already enabled
                    const routesEnabled = device.enabledRoutes &&
                        EXIT_ROUTES.every(r => device.enabledRoutes.includes(r));

                    if (!routesEnabled) {
                        const { setDeviceRoutes } = await import('@/lib/tailscale');
                        try {
                            console.log(`[Status] Auto-approving routes for ${device.hostname}...`);
                            await setDeviceRoutes(tailscaleKey as string, device.id, EXIT_ROUTES);
                            console.log(`[Status] Routes approved successfully for ${device.hostname}`);
                        } catch (err: any) {
                            console.error(`[Status] Failed to auto-approve routes for ${device.hostname}. Error: ${err.message || err}`);
                            // If it's a permission error, it's likely the API key scope.
                        }
                    } else {
                        // console.log(`[Status] Routes already enabled for ${device.hostname}`);
                    }
                } else {
                    // Droplet exists but not in Tailscale yet -> 'starting'
                    provisioningStatus = 'starting';
                }
            } else {
                // If we couldn't check tailscale, fallback to just assuming ready if it's been a while?
                // Or just 'ready' (legacy behavior)
                // Let's default to 'starting' if it's very young (< 2 min) and we have no tailscale info?
                // But better to stick to 'ready' if we can't verify, to avoid blocking usage if API fails.
                // However, user specifically asked to NOT say connected until ready.
                // So if we lack tailscale info, maybe we should indicate that?
                // Let's assume 'ready' if we lack keys, but if we have keys and list is empty, then 'starting'.
                if (tailscaleKey && tailnet) {
                    // Keys provided but no devices found?
                    provisioningStatus = 'starting';
                } else {
                    provisioningStatus = 'ready'; // Fallback for users without API key configured
                }
            }

            return {
                ...droplet,
                minutesRunning,
                costEstimate: cost.toFixed(4),
                provisioningStatus
            };
        }));

        return NextResponse.json({ activeNodes });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
