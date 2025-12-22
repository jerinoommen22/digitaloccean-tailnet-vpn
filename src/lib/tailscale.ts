const BASE_URL = 'https://api.tailscale.com/api/v2';

export interface TailscaleDevice {
    id: string; // deviceId
    idn: string; // The "node ID"
    hostname: string;
    name: string;
    created: string;
    lastSeen: string;
    keyExpiryDisabled: boolean;
    tags: string[];
    addresses: string[];
    clientVersion: string;
    os: string;
    advertisedRoutes: string[];
    enabledRoutes: string[];
}

async function request(endpoint: string, method: string = 'GET', token?: string, body?: any) {
    if (!token) {
        throw new Error('Tailscale API Key is required');
    }

    // Tailscale uses Basic Auth with the API key as the username and empty password
    const auth = Buffer.from(`${token}:`).toString('base64');

    const res = await fetch(`${BASE_URL}${endpoint}`, {
        method,
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Basic ${auth}`,
        },
        body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || `Tailscale API Error: ${res.statusText}`);
    }

    return res.json();
}

/**
 * List all devices in the tailnet.
 */
export async function listDevices(token: string, tailnet: string): Promise<TailscaleDevice[]> {
    const data = await request(`/tailnet/${tailnet}/devices`, 'GET', token);
    return data.devices as TailscaleDevice[];
}

/**
 * Get a specific device status from the tailnet by hostname.
 * Note: Tailscale API doesn't have a direct "get by hostname", so we filter the list.
 */
export async function getDeviceStatus(token: string, tailnet: string, hostname: string): Promise<TailscaleDevice | undefined> {
    const devices = await listDevices(token, tailnet);
    return devices.find(d => d.hostname === hostname); // precise match
}

/**
 * Delete a device from the tailnet.
 */
export async function deleteDevice(token: string, deviceId: string) {
    return request(`/device/${deviceId}`, 'DELETE', token);
}

/**
 * Set the enabled routes for a device.
 * Use this to approve exit node routes (0.0.0.0/0, ::/0).
 */
export async function setDeviceRoutes(token: string, deviceId: string, routes: string[]) {
    console.log(`[TailscaleLib] Setting routes for ${deviceId}:`, routes);
    return request(`/device/${deviceId}/routes`, 'POST', token, {
        routes: routes
    });
}
