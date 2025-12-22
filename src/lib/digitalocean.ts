import { compareDesc } from 'date-fns';

const BASE_URL = 'https://api.digitalocean.com/v2';

export interface Droplet {
  id: number;
  name: string;
  status: 'new' | 'active' | 'off' | 'archive';
  created_at: string;
  region: {
    slug: string;
    name: string;
  };
  tags: string[];
}

export interface Region {
  slug: string;
  name: string;
  available: boolean;
}

const TAG_NAME = 'vpn-manager';

async function request(endpoint: string, method: string = 'GET', body?: any, token?: string) {
  if (!token) {
    // try to get from env or fail
    // In a real app we might pass it from frontend via API route context or arguments
    throw new Error('DigitalOcean Token is required');
  }

  const res = await fetch(`${BASE_URL}${endpoint}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.message || `DigitalOcean API Error: ${res.statusText}`);
  }

  return res.json();
}

export async function listRegions(token: string): Promise<Region[]> {
  const data = await request('/regions', 'GET', undefined, token);
  // Filter for available regions that support droplets
  return data.regions.filter((r: any) => r.available).map((r: any) => ({
    slug: r.slug,
    name: r.name,
    available: r.available
  }));
}

export async function getVPNDroplets(token: string): Promise<Droplet[]> {
  const data = await request(`/droplets?tag_name=${TAG_NAME}`, 'GET', undefined, token);
  return data.droplets.map((d: any) => ({
    id: d.id,
    name: d.name,
    status: d.status,
    created_at: d.created_at,
    region: {
      slug: d.region.slug,
      name: d.region.name
    },
    tags: d.tags
  }));
}

export async function createVPNNode(token: string, tailscaleAuthKey: string, region: string) {
  // Use a minimal droplet
  const size = 's-1vcpu-512mb-10gb';
  const image = 'ubuntu-22-04-x64';
  const name = `${region}-VPN`;

  const userData = `#!/bin/bash
# Enable IP forwarding
echo 'net.ipv4.ip_forward = 1' | tee -a /etc/sysctl.d/99-tailscale.conf
echo 'net.ipv6.conf.all.forwarding = 1' | tee -a /etc/sysctl.d/99-tailscale.conf
sysctl -p /etc/sysctl.d/99-tailscale.conf

# Configure custom DNS (1.1.1.3 for Family/Malware blocking)
# We overwrite resolved.conf to ensure it takes precedence over cloud-init defaults
echo "[Resolve]
DNS=1.1.1.3 1.1.1.3
Domains=~.
" > /etc/systemd/resolved.conf

systemctl restart systemd-resolved

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Bring up Tailscale
tailscale up --authkey=${tailscaleAuthKey} --hostname=${name} --advertise-exit-node --accept-dns=false
`;

  const body = {
    name,
    region,
    size,
    image,
    tags: [TAG_NAME],
    user_data: userData,
  };

  return request('/droplets', 'POST', body, token);
}

export async function deleteDroplet(token: string, dropletId: number) {
  return request(`/droplets/${dropletId}`, 'DELETE', undefined, token);
}
