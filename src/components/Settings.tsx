import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save } from 'lucide-react';
import { useSettings, Settings as SettingsType } from '@/hooks/useSettings';
import { clsx } from 'clsx';

interface SettingsProps {
    onUiClose?: () => void;
}

export function SettingsForm({ onUiClose }: SettingsProps) {
    const { settings, saveSettings } = useSettings();
    const [formData, setFormData] = useState<SettingsType>(settings);

    // Sync state when settings load
    useEffect(() => {
        setFormData(settings);
    }, [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        saveSettings(formData);
        if (onUiClose) onUiClose();
    };

    return (
        <div className="p-6 max-w-md mx-auto bg-slate-900 text-white rounded-2xl shadow-xl">
            <div className="flex items-center gap-2 mb-6 text-green-400">
                <SettingsIcon className="w-6 h-6" />
                <h2 className="text-xl font-bold tracking-tight">Configuration</h2>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                        DigitalOcean Personal Access Token
                    </label>
                    <input
                        type="password"
                        name="doToken"
                        value={formData.doToken}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="dop_v1_..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                        Tailscale API Key
                    </label>
                    <input
                        type="password"
                        name="tailscaleKey"
                        value={formData.tailscaleKey}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="tskey-api-..."
                    />
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                        Tailscale Auth Key (Disposable/Ephemeral)
                    </label>
                    <input
                        type="password"
                        name="tailscaleAuthKey"
                        value={formData.tailscaleAuthKey}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="tskey-auth-..."
                    />
                    <p className="text-xs text-slate-500 mt-1">Recommended: Use an ephemeral key so nodes cleanup automatically if this app crashes.</p>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-400 mb-1">
                        Tailnet Name
                    </label>
                    <input
                        type="text"
                        name="tailnet"
                        value={formData.tailnet}
                        onChange={handleChange}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500 outline-none transition-all placeholder:text-slate-600"
                        placeholder="example.com or user@gmail.com"
                    />
                </div>

                <button
                    type="submit"
                    className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-transform active:scale-95 mt-6"
                >
                    <Save className="w-4 h-4" />
                    Save Configuration
                </button>
            </form>
        </div>
    );
}
