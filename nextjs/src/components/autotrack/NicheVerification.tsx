'use client';

import React, { useState } from 'react';
import { Brain, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ScanSummary,
  ScanNicheData,
  AVAILABLE_NICHES,
  NicheSignal,
  DetectedTechnology,
  ExistingTracking,
  LiveDiscovery,
} from '@/types/site-scanner';
import { TechnologyDetection } from './TechnologyDetection';
import { TechPanel } from './discovery/TechPanel';
import { PriorityElementsPanel } from './discovery/PriorityElementsPanel';

interface NicheVerificationProps {
  scan: ScanSummary | null;
  nicheData: ScanNicheData | null;
  onConfirm: (niche: string) => void;
  isConfirming: boolean;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export function NicheVerification({
  scan,
  nicheData,
  onConfirm,
  isConfirming,
  onCancel,
  isCancelling,
}: NicheVerificationProps) {
  const detectedNiche = nicheData?.niche || scan?.detectedNiche || 'other';
  const confidence = nicheData?.confidence || scan?.nicheConfidence || 0;
  const reasoning = nicheData?.reasoning || '';
  const subCategory = nicheData?.subCategory || scan?.nicheSubCategory || '';
  const technologies = (nicheData?.technologies || scan?.detectedTechnologies) as DetectedTechnology[] | null;
  const existingTracking = (nicheData?.existingTracking || scan?.existingTracking) as ExistingTracking[] | null;
  const pagesScanned = nicheData?.pagesScanned || scan?.totalPagesScanned || 0;
  const signals = scan?.nicheSignals as NicheSignal[] | null;

  const [selectedNiche, setSelectedNiche] = useState(detectedNiche);

  const confidencePercent = Math.round(confidence * 100);

  return (
    <div className="bg-white rounded-lg border p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-purple-100 rounded-lg">
          <Brain className="h-5 w-5 text-purple-600" />
        </div>
        <div>
          <h3 className="font-semibold">Niche Detected</h3>
          <p className="text-sm text-muted-foreground">
            Review the detected niche and confirm to continue
          </p>
        </div>
      </div>

      {/* Detection Result */}
      <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-100">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-indigo-900 capitalize">
              {AVAILABLE_NICHES.find(n => n.value === detectedNiche)?.label || detectedNiche}
            </span>
            <Badge variant="outline" className="bg-white text-xs">
              {confidencePercent}% confidence
            </Badge>
          </div>
          <span className="text-xs text-muted-foreground">{pagesScanned} pages scanned</span>
        </div>
        {subCategory && (
          <p className="text-sm text-indigo-700 mb-1">{subCategory}</p>
        )}
        {reasoning && (
          <p className="text-sm text-indigo-600">{reasoning}</p>
        )}
      </div>

      {/* Signals */}
      {signals && signals.length > 0 && (
        <div>
          <h4 className="text-xs font-medium text-muted-foreground uppercase mb-2">Detection Signals</h4>
          <div className="space-y-1">
            {signals.slice(0, 5).map((signal, i) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="text-muted-foreground">{signal.description}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Technologies (legacy array format) */}
      <TechnologyDetection technologies={technologies} existingTracking={existingTracking} />

      {/* Live Discovery panels (v2 rich data) */}
      {scan?.liveDiscovery && (
        <div className="space-y-3">
          <TechPanel discovery={scan.liveDiscovery as LiveDiscovery} />
          <PriorityElementsPanel discovery={scan.liveDiscovery as LiveDiscovery} />
          {/* Page type summary */}
          {scan.liveDiscovery && Object.keys((scan.liveDiscovery as LiveDiscovery).pageTypes).length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {Object.entries((scan.liveDiscovery as LiveDiscovery).pageTypes).map(([type, count]) => (
                <Badge key={type} variant="outline" className="text-xs">
                  {type}: {count as number}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Niche Selection */}
      <div className="pt-2 border-t">
        <Label className="text-sm font-medium mb-2 block">
          Confirm or change the detected niche:
        </Label>
        <Select value={selectedNiche} onValueChange={setSelectedNiche}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {AVAILABLE_NICHES.map((niche) => (
              <SelectItem key={niche.value} value={niche.value}>
                {niche.label}
                {niche.value === detectedNiche && ' (Detected)'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        {onCancel && (
          <Button
            variant="outline"
            onClick={onCancel}
            disabled={isCancelling || isConfirming}
            className="flex-shrink-0"
          >
            {isCancelling ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              <>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel Scan
              </>
            )}
          </Button>
        )}
        <Button
          onClick={() => onConfirm(selectedNiche)}
          disabled={isConfirming || isCancelling}
          className="flex-1"
        >
          {isConfirming ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Confirming...
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Confirm & Continue Analysis
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
