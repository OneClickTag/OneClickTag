'use client';

import { useState } from 'react';
import { Loader2, Radar, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ScanLauncherProps {
  defaultUrl?: string;
  onStartScan: (websiteUrl?: string, maxPages?: number, maxDepth?: number) => void;
  isLoading: boolean;
}

export function ScanLauncher({ defaultUrl, onStartScan, isLoading }: ScanLauncherProps) {
  const [websiteUrl, setWebsiteUrl] = useState(defaultUrl || '');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [maxPages, setMaxPages] = useState(50);
  const [maxDepth, setMaxDepth] = useState(3);
  const [urlError, setUrlError] = useState<string | null>(null);

  const validateUrl = (url: string): boolean => {
    if (!url.trim()) {
      setUrlError('Website URL is required');
      return false;
    }
    try {
      const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
      if (!parsed.protocol.startsWith('http')) {
        setUrlError('URL must use http or https');
        return false;
      }
      setUrlError(null);
      return true;
    } catch {
      setUrlError('Please enter a valid URL');
      return false;
    }
  };

  const handleStart = () => {
    const url = websiteUrl.trim();
    const normalizedUrl = url.startsWith('http') ? url : `https://${url}`;
    if (!validateUrl(normalizedUrl)) return;
    onStartScan(
      normalizedUrl,
      showAdvanced ? maxPages : undefined,
      showAdvanced ? maxDepth : undefined,
    );
  };

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Radar className="h-5 w-5 text-indigo-600" />
        </div>
        <div>
          <h3 className="font-semibold">AutoTrack Scanner</h3>
          <p className="text-sm text-muted-foreground">
            Automatically discover tracking opportunities on your website
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="website-url">Website URL</Label>
          <div className="flex gap-2 mt-1">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="website-url"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => { setWebsiteUrl(e.target.value); setUrlError(null); }}
                className={`pl-9 ${urlError ? 'border-red-300' : ''}`}
              />
            </div>
            {urlError && (
              <p className="text-xs text-red-500 mt-1">{urlError}</p>
            )}
          </div>
        </div>

        <button
          type="button"
          className="text-xs text-muted-foreground hover:text-foreground"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? 'Hide' : 'Show'} advanced options
        </button>

        {showAdvanced && (
          <div className="grid grid-cols-2 gap-4 p-3 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="max-pages" className="text-xs">Max Pages</Label>
              <Input
                id="max-pages"
                type="number"
                min={1}
                max={200}
                value={maxPages}
                onChange={(e) => setMaxPages(parseInt(e.target.value) || 50)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="max-depth" className="text-xs">Max Depth</Label>
              <Input
                id="max-depth"
                type="number"
                min={1}
                max={5}
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value) || 3)}
                className="mt-1"
              />
            </div>
          </div>
        )}

        <Button onClick={handleStart} disabled={isLoading} className="w-full">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting Scan...
            </>
          ) : (
            <>
              <Radar className="mr-2 h-4 w-4" />
              Start AutoTrack Scan
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
