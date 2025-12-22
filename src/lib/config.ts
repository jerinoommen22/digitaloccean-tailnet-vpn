import fs from 'fs/promises';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'server-config.json');

export interface ServerConfig {
    doToken?: string;
    tailscaleKey?: string;
    tailscaleAuthKey?: string;
    tailnet?: string;
}

export async function getConfig(): Promise<ServerConfig> {
    let fileConfig: ServerConfig = {};
    try {
        const data = await fs.readFile(CONFIG_PATH, 'utf-8');
        fileConfig = JSON.parse(data);
    } catch (e) {
        // ignore error, file might not exist
    }

    // Merge: File config takes precedence over Env vars?
    // User asked: "if its not avalible ... it should update if I want to"
    // Usually Env vars are defaults. File config (user settings) overrides env vars?
    // OR Env vars are hard overrides?
    // Context: "I have configs in env, if its not avalible ... it should update if I want to"
    // This implies Env is the base/fallback. If user edits in UI, it saves to file, which should then take precedence.

    return {
        doToken: fileConfig.doToken || process.env.DO_TOKEN,
        tailscaleKey: fileConfig.tailscaleKey || process.env.TAILSCALE_KEY,
        tailscaleAuthKey: fileConfig.tailscaleAuthKey || process.env.TAILSCALE_AUTH_KEY,
        tailnet: fileConfig.tailnet || process.env.TAILSCALE_TAILNET,
    };
}

export async function saveConfig(config: ServerConfig): Promise<void> {
    await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}
