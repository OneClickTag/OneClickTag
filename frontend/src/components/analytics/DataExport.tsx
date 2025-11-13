import React from 'react';
import { 
  Download, 
  FileText, 
  Table, 
  BarChart3, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { AnalyticsFilters, ExportRequest } from '@/types/analytics.types';
import { useExportData } from '@/hooks/useAnalytics';

interface DataExportProps {
  filters: AnalyticsFilters;
  availableTypes: Array<{
    type: 'customer_usage' | 'campaign_performance' | 'system_health' | 'overview';
    label: string;
    description: string;
    icon: React.ComponentType<{ className?: string }>;
  }>;
  className?: string;
}

const exportFormats = [
  {
    format: 'csv' as const,
    label: 'CSV',
    description: 'Comma-separated values for spreadsheet applications',
    icon: Table,
  },
  {
    format: 'excel' as const,
    label: 'Excel',
    description: 'Microsoft Excel workbook with formatted data',
    icon: BarChart3,
  },
  {
    format: 'pdf' as const,
    label: 'PDF',
    description: 'Formatted report with charts and visualizations',
    icon: FileText,
  },
];

export function DataExport({ filters, availableTypes, className = '' }: DataExportProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>([]);
  const [selectedFormat, setSelectedFormat] = React.useState<'csv' | 'excel' | 'pdf'>('csv');
  const [includeCharts, setIncludeCharts] = React.useState(false);
  const [exportHistory, setExportHistory] = React.useState<Array<{
    id: string;
    type: string;
    format: string;
    status: 'pending' | 'completed' | 'failed';
    downloadUrl?: string;
    filename?: string;
    createdAt: string;
  }>>([]);

  const exportData = useExportData();

  const handleTypeToggle = (type: string, checked: boolean) => {
    if (checked) {
      setSelectedTypes([...selectedTypes, type]);
    } else {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    }
  };

  const handleExport = async () => {
    if (selectedTypes.length === 0) return;

    try {
      for (const type of selectedTypes) {
        const request: ExportRequest = {
          type: type as any,
          format: selectedFormat,
          filters,
          includeCharts: selectedFormat === 'pdf' ? includeCharts : false,
        };

        const response = await exportData.mutateAsync(request);
        
        // Add to export history
        const newExport = {
          id: Date.now().toString(),
          type,
          format: selectedFormat,
          status: 'completed' as const,
          downloadUrl: response.downloadUrl,
          filename: response.filename,
          createdAt: new Date().toISOString(),
        };
        
        setExportHistory(prev => [newExport, ...prev.slice(0, 9)]);

        // Auto-download
        const link = document.createElement('a');
        link.href = response.downloadUrl;
        link.download = response.filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      setIsOpen(false);
      setSelectedTypes([]);
    } catch (error) {
      console.error('Export failed:', error);
      
      // Add failed export to history
      selectedTypes.forEach(type => {
        const failedExport = {
          id: Date.now().toString() + type,
          type,
          format: selectedFormat,
          status: 'failed' as const,
          createdAt: new Date().toISOString(),
        };
        setExportHistory(prev => [failedExport, ...prev.slice(0, 9)]);
      });
    }
  };

  const getStatusIcon = (status: 'pending' | 'completed' | 'failed') => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-red-600" />;
    }
  };

  const canExport = selectedTypes.length > 0 && !exportData.isPending;

  return (
    <div className={className}>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" className="flex items-center space-x-2">
            <Download className="h-4 w-4" />
            <span>Export Data</span>
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Export Analytics Data</DialogTitle>
            <DialogDescription>
              Select the data types and format you want to export. Current filters will be applied to the export.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Data Types Selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Select Data Types</h4>
              <div className="space-y-3">
                {availableTypes.map((type) => {
                  const Icon = type.icon;
                  return (
                    <div key={type.type} className="flex items-start space-x-3 p-3 border rounded-lg">
                      <Checkbox
                        id={type.type}
                        checked={selectedTypes.includes(type.type)}
                        onCheckedChange={(checked) => handleTypeToggle(type.type, !!checked)}
                      />
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <Icon className="h-4 w-4 text-gray-600" />
                          <Label htmlFor={type.type} className="font-medium cursor-pointer">
                            {type.label}
                          </Label>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{type.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Format Selection */}
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Export Format</h4>
              <div className="grid grid-cols-3 gap-3">
                {exportFormats.map((format) => {
                  const Icon = format.icon;
                  return (
                    <div
                      key={format.format}
                      className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                        selectedFormat === format.format
                          ? 'border-primary bg-primary/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => setSelectedFormat(format.format)}
                    >
                      <div className="flex flex-col items-center text-center">
                        <Icon className={`h-6 w-6 mb-2 ${
                          selectedFormat === format.format ? 'text-primary' : 'text-gray-600'
                        }`} />
                        <div className="font-medium text-sm">{format.label}</div>
                        <div className="text-xs text-gray-600 mt-1">{format.description}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Additional Options */}
            {selectedFormat === 'pdf' && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">PDF Options</h4>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="includeCharts"
                    checked={includeCharts}
                    onCheckedChange={(checked) => setIncludeCharts(!!checked)}
                  />
                  <Label htmlFor="includeCharts" className="cursor-pointer">
                    Include charts and visualizations
                  </Label>
                </div>
              </div>
            )}

            {/* Current Filters Summary */}
            <div className="bg-gray-50 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-2">Applied Filters</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <div>
                  <strong>Date Range:</strong> {new Date(filters.dateRange.from).toLocaleDateString()} - {new Date(filters.dateRange.to).toLocaleDateString()}
                </div>
                {filters.customerIds && filters.customerIds.length > 0 && (
                  <div>
                    <strong>Customers:</strong> {filters.customerIds.length} selected
                  </div>
                )}
                {filters.campaignTypes && filters.campaignTypes.length > 0 && (
                  <div>
                    <strong>Campaign Types:</strong> {filters.campaignTypes.join(', ')}
                  </div>
                )}
                {filters.status && filters.status.length > 0 && (
                  <div>
                    <strong>Status:</strong> {filters.status.join(', ')}
                  </div>
                )}
              </div>
            </div>

            {/* Export History */}
            {exportHistory.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Recent Exports</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {exportHistory.map((export_) => (
                    <div key={export_.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(export_.status)}
                        <span className="text-sm">
                          {availableTypes.find(t => t.type === export_.type)?.label} ({export_.format.toUpperCase()})
                        </span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs text-gray-500">
                          {new Date(export_.createdAt).toLocaleString()}
                        </span>
                        {export_.status === 'completed' && export_.downloadUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = export_.downloadUrl!;
                              link.download = export_.filename || 'export';
                              link.click();
                            }}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleExport} disabled={!canExport}>
              {exportData.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedTypes.length} {selectedTypes.length === 1 ? 'Type' : 'Types'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}