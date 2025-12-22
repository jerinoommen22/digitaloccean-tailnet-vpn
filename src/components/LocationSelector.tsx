import useSWR from 'swr';
import { clsx } from 'clsx';
import { Globe, Loader2, MapPin } from 'lucide-react';
import { useSettings } from '@/hooks/useSettings';
import { Region } from '@/lib/digitalocean';

interface LocationSelectorProps {
    onSelect: (regionSlug: string) => void;
    disabled?: boolean;
}

const fetcher = ([url, token]: [string, string]) =>
    fetch(url, { headers: { 'x-do-token': token } }).then(res => res.json());

export function LocationSelector({ onSelect, disabled }: LocationSelectorProps) {
    const { settings } = useSettings();
    const { data, error, isLoading } = useSWR<{ regions: Region[] }>(
        settings.doToken ? ['/api/regions', settings.doToken] : null,
        fetcher
    );

    if (!settings.doToken) {
        return <div className="text-center p-4 text-slate-400">Configure API Token to see regions</div>;
    }

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-blue-400">
                <Loader2 className="w-8 h-8 animate-spin mb-2" />
                <p className="text-sm">Loading regions...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-red-900/20 border border-red-800 rounded-lg text-red-200 text-center">
                Failed to load regions. Check your API Token.
            </div>
        );
    }

    const regions = data?.regions || [];

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                Select Location
            </h3>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {regions.map((region) => (
                    <button
                        key={region.slug}
                        onClick={() => onSelect(region.slug)}
                        disabled={disabled}
                        className={clsx(
                            "group relative flex flex-col items-start p-4 rounded-xl border transition-all duration-200",
                            "bg-slate-800 border-slate-700 hover:border-blue-500/50 hover:bg-slate-750",
                            "active:scale-95 active:bg-blue-900/20",
                            disabled && "opacity-50 cursor-not-allowed"
                        )}
                    >
                        <div className="flex items-center gap-2 mb-1 w-full">
                            <MapPin className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                            <span className="font-medium text-slate-200">{region.name}</span>
                        </div>
                        <span className="text-xs text-slate-500 uppercase tracking-wider font-mono">
                            {region.slug}
                        </span>

                        {/* Selection indicator effect */}
                        <div className="absolute inset-0 rounded-xl ring-2 ring-blue-500 opacity-0 group-focus:opacity-100 transition-opacity pointer-events-none" />
                    </button>
                ))}
            </div>
        </div>
    );
}
