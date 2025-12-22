import React, { useState } from 'react';
import useSWR from 'swr';
import { Shield, ShieldCheck, Power, Settings as SettingsIcon, Activity, Clock, DollarSign, Loader2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useSettings } from '@/hooks/useSettings';
import { SettingsForm } from '@/components/Settings';
import { LocationSelector } from '@/components/LocationSelector';
import { Droplet } from '@/lib/digitalocean';

const fetcher = ([url, token, tailscaleKey, tailnet]: [string, string, string, string]) =>
    fetch(url, {
        headers: {
            'x-do-token': token,
            'x-tailscale-key': tailscaleKey,
            'x-tailnet': tailnet
        }
    }).then(res => res.json());

export function Dashboard() {
    const { settings, isConfigured, isLoaded } = useSettings();
    const [showSettings, setShowSettings] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);

    // Poll status every 5 seconds
    const { data: statusData, mutate } = useSWR<{ activeNodes: (Droplet & { minutesRunning: number, costEstimate: string, provisioningStatus: 'starting' | 'ready' | 'offline' })[] }>(
        isConfigured ? ['/api/status', settings.doToken, settings.tailscaleKey, settings.tailnet] : null,
        fetcher,
        { refreshInterval: 5000 }
    );

    const activeNode = statusData?.activeNodes?.[0];
    const isConnected = !!activeNode;
    const isReady = activeNode?.provisioningStatus === 'ready';

    const handleConnect = async (region: string) => {
        setIsProcessing(true);
        try {
            const res = await fetch('/api/connect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-do-token': settings.doToken // We don't need tailscale headers for connect, only for status check if we wanted
                },
                body: JSON.stringify({
                    doToken: settings.doToken,
                    tailscaleAuthKey: settings.tailscaleAuthKey,
                    region
                })
            });
            if (!res.ok) throw new Error('Connection failed');
            await mutate();
        } catch (e) {
            alert('Failed to connect. Check console/logs.');
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleDisconnect = async () => {
        if (!confirm('Are you sure you want to disconnect? This will destroy the VPN droplet.')) return;

        setIsProcessing(true);
        try {
            await fetch('/api/disconnect', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-do-token': settings.doToken
                },
                body: JSON.stringify({
                    doToken: settings.doToken,
                    tailscaleKey: settings.tailscaleKey,
                    tailnet: settings.tailnet
                })
            });
            await mutate(); // Force refresh to show disconnected
        } catch (e) {
            alert('Failed to disconnect');
            console.error(e);
        } finally {
            setIsProcessing(false);
        }
    };

    if (!isLoaded) return null;

    if (showSettings || !isConfigured) {
        return (
            <div className="min-h-screen bg-slate-950 p-4 pb-20">
                <div className="max-w-md mx-auto">
                    <div className="flex justify-between items-center mb-6">
                        <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-green-400 bg-clip-text text-transparent">
                            VPN Manager
                        </h1>
                        {isConfigured && (
                            <button onClick={() => setShowSettings(false)} className="text-slate-400 hover:text-white">
                                Close
                            </button>
                        )}
                    </div>
                    <SettingsForm onUiClose={() => setShowSettings(false)} />
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 p-4 pb-20 font-sans">
            <div className="max-w-md mx-auto space-y-6">
                {/* Header */}
                <header className="flex justify-between items-center py-4">
                    <div className="flex items-center gap-2">
                        <div className={clsx("p-2 rounded-lg", isConnected ? (isReady ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400") : "bg-slate-800 text-slate-400")}>
                            {isConnected ? <ShieldCheck className="w-6 h-6" /> : <Shield className="w-6 h-6" />}
                        </div>
                        <div>
                            <h1 className="font-bold text-lg leading-tight">Zero Trust VPN</h1>
                            <div className="flex items-center gap-1.5">
                                <span className={clsx("w-2 h-2 rounded-full", isConnected ? (isReady ? "bg-green-500 animate-pulse" : "bg-yellow-500 animate-bounce") : "bg-red-500")} />
                                <span className="text-xs font-medium text-slate-400">
                                    {isConnected ? (isReady ? 'Ready to use' : 'Setting up...') : 'Disconnected'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSettings(true)}
                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-full transition-colors"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                </header>

                {/* Main Content */}
                <main>
                    {isConnected ? (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                            {/* Active Connection Card */}
                            <div className="bg-slate-900 border border-green-500/30 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-32 bg-green-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />

                                <div className="relative z-10 flex flex-col items-center text-center space-y-4">
                                    <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center mb-2 ring-1 ring-green-500/50">
                                        <Activity className="w-10 h-10 text-green-400" />
                                    </div>

                                    <div>
                                        <h2 className="text-2xl font-bold text-white">{activeNode.region.name}</h2>
                                        <p className="text-green-400 font-mono text-sm">{activeNode.name}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4 w-full mt-4">
                                        <div className="bg-slate-950/50 p-3 rounded-lg flex flex-col items-center">
                                            <Clock className="w-4 h-4 text-slate-400 mb-1" />
                                            <span className="text-xl font-bold font-mono">{activeNode.minutesRunning}m</span>
                                            <span className="text-[10px] text-slate-500 uppercase">Duration</span>
                                        </div>
                                        <div className="bg-slate-950/50 p-3 rounded-lg flex flex-col items-center">
                                            <DollarSign className="w-4 h-4 text-slate-400 mb-1" />
                                            <span className="text-xl font-bold font-mono">${activeNode.costEstimate}</span>
                                            <span className="text-[10px] text-slate-500 uppercase">Est. Cost</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Disconnect Button */}
                            <button
                                onClick={handleDisconnect}
                                disabled={isProcessing}
                                className="group w-full py-4 px-6 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 hover:border-red-500 text-red-500 rounded-xl flex items-center justify-center gap-3 transition-all active:scale-95"
                            >
                                {isProcessing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Power className="w-5 h-5" />}
                                <span className="font-bold">Disconnect & Destroy</span>
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6 animate-in slide-in-from-bottom-4 fade-in duration-500">
                            {/* Intro/Instruction */}
                            <div className="bg-gradient-to-br from-blue-600 to-violet-600 rounded-2xl p-6 shadow-lg text-white">
                                <h3 className="text-lg font-bold mb-1">On-Demand VPN</h3>
                                <p className="text-blue-100 text-sm opacity-90">
                                    Deploy a private VPN node in seconds. Pay only for what you use (~$0.006/hour).
                                </p>
                            </div>

                            {/* Region Selector */}
                            {isProcessing ? (
                                <div className="flex flex-col items-center justify-center py-20 text-slate-400 space-y-4">
                                    <Loader2 className="w-12 h-12 text-blue-500 animate-spin" />
                                    <p className="animate-pulse">Deploying your personal cloud node...</p>
                                    <p className="text-xs text-slate-600">This usually takes 30-60s</p>
                                </div>
                            ) : (
                                <LocationSelector onSelect={handleConnect} disabled={isProcessing} />
                            )}
                        </div>
                    )}
                </main>
            </div>
        </div>
    );
}
