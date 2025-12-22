import { useState, useEffect } from 'react';

export interface Settings {
    doToken: string;
    tailscaleKey: string;
    tailscaleAuthKey: string;
    tailnet: string;
}

const STORAGE_KEY = 'vpn-manager-settings';

export function useSettings() {
    const [settings, setSettings] = useState<Settings>({
        doToken: '',
        tailscaleKey: '',
        tailscaleAuthKey: '',
        tailnet: '',
    });
    const [isLoaded, setIsLoaded] = useState(false);

    useEffect(() => {
        // Fetch from API on mount
        fetch('/api/config')
            .then(res => res.json())
            .then(data => {
                setSettings(prev => ({ ...prev, ...data }));
                setIsLoaded(true);
            })
            .catch(err => {
                console.error('Failed to load settings', err);
                setIsLoaded(true);
            });
    }, []);

    const saveSettings = async (newSettings: Settings) => {
        setSettings(newSettings);
        try {
            await fetch('/api/config', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSettings),
            });
        } catch (err) {
            console.error('Failed to save settings', err);
        }
    };

    const isConfigured = Boolean(
        settings.doToken &&
        settings.tailscaleKey &&
        settings.tailscaleAuthKey &&
        settings.tailnet
    );

    return { settings, saveSettings, isLoaded, isConfigured };
}
