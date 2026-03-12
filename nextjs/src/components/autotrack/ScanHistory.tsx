'use client';

import React, { useState, useMemo } from 'react';
import { Clock, AlertCircle, CheckCircle, XCircle, Loader2, Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScanHistory as ScanHistoryType } from '@/types/site-scanner';

interface ScanHistoryProps {
  scans: ScanHistoryType[];
  onSelectScan: (scanId: string) => void;
  activeScanId?: string | null;
}

const statusConfig: Record<string, { icon: React.ReactNode; className: string; label: string }> = {
  COMPLETED: { icon: <CheckCircle className="h-3.5 w-3.5" />, className: 'text-green-600', label: 'Completed' },
  FAILED: { icon: <AlertCircle className="h-3.5 w-3.5" />, className: 'text-red-600', label: 'Failed' },
  CANCELLED: { icon: <XCircle className="h-3.5 w-3.5" />, className: 'text-gray-500', label: 'Cancelled' },
  QUEUED: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-blue-500', label: 'Queued' },
  CRAWLING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-blue-500', label: 'Crawling' },
  ANALYZING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-purple-500', label: 'Analyzing' },
  NICHE_DETECTED: { icon: <Clock className="h-3.5 w-3.5" />, className: 'text-yellow-600', label: 'Niche Detected' },
  AWAITING_CONFIRMATION: { icon: <Clock className="h-3.5 w-3.5" />, className: 'text-yellow-600', label: 'Awaiting Confirmation' },
  DEEP_CRAWLING: { icon: <Loader2 className="h-3.5 w-3.5 animate-spin" />, className: 'text-indigo-500', label: 'Deep Crawling' },
};

export function ScanHistoryList({ scans, onSelectScan, activeScanId }: ScanHistoryProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const filteredScans = useMemo(() => {
    return scans.filter((scan) => {
      if (statusFilter !== 'ALL' && scan.status !== statusFilter) return false;
      if (search) {
        const q = search.toLowerCase();
        const matchesUrl = scan.websiteUrl?.toLowerCase().includes(q);
        const matchesNiche = scan.detectedNiche?.toLowerCase().includes(q);
        if (!matchesUrl && !matchesNiche) return false;
      }
      return true;
    });
  }, [scans, search, statusFilter]);

  if (scans.length === 0) return null;

  const availableStatuses = Array.from(new Set(scans.map(s => s.status)));

  return (
    <div className="bg-white rounded-lg border p-4">
      <h3 className="font-semibold mb-3 text-sm">Previous Scans ({filteredScans.length})</h3>
      <div className="flex items-center gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search scans..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-8 h-8 text-xs"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[130px] h-8 text-xs">
            <SelectValue placeholder="All" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Statuses</SelectItem>
            {availableStatuses.map((s) => (
              <SelectItem key={s} value={s}>
                {statusConfig[s]?.label || s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {filteredScans.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">No scans match your filters</p>
        ) : (
          filteredScans.map((scan) => {
            const status = statusConfig[scan.status] || statusConfig.QUEUED;
            const isActive = activeScanId === scan.id;

            return (
              <button
                key={scan.id}
                onClick={() => onSelectScan(scan.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  isActive ? 'bg-indigo-50 border-indigo-200' : 'hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={status.className}>{status.icon}</span>
                    <span className="text-sm font-medium truncate max-w-[200px]">
                      {scan.websiteUrl}
                    </span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(scan.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  {scan.detectedNiche && (
                    <Badge variant="outline" className="text-xs capitalize">
                      {scan.detectedNiche}
                    </Badge>
                  )}
                  {scan.totalPagesScanned && (
                    <span className="text-xs text-muted-foreground">
                      {scan.totalPagesScanned} pages
                    </span>
                  )}
                  {scan.totalRecommendations !== null && (
                    <span className="text-xs text-muted-foreground">
                      {scan.totalRecommendations} recommendations
                    </span>
                  )}
                  {scan.trackingReadinessScore !== null && (
                    <Badge variant="outline" className="text-xs">
                      Score: {scan.trackingReadinessScore}
                    </Badge>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
