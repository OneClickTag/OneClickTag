'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Plus,
  Pencil,
  Loader2,
  Mail,
  FileText,
  History,
  Check,
  X,
  AlertCircle,
  Clock,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
  Eye,
  Code,
  Send,
  Users,
  UserX,
} from 'lucide-react';
import { format } from 'date-fns';

interface EmailTemplate {
  id: string;
  type: 'QUESTIONNAIRE_THANK_YOU' | 'LEAD_WELCOME' | 'CUSTOM';
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string | null;
  availableVariables: Record<string, string> | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface TemplateType {
  value: string;
  label: string;
  description: string;
}

interface EmailLog {
  id: string;
  templateType: string;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  status: 'PENDING' | 'SENT' | 'FAILED';
  errorMessage: string | null;
  leadId: string | null;
  sentAt: string | null;
  createdAt: string;
  lead?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  } | null;
}

interface EmailLogsResponse {
  data: EmailLog[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
}

interface EmailTrigger {
  action: 'LEAD_SIGNUP' | 'QUESTIONNAIRE_COMPLETE';
  label: string;
  description: string;
  defaultTemplate: string;
  id: string | null;
  templateType: string;
  isActive: boolean;
  configuredDescription?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface BulkSendStats {
  subscribersCount: number;
  totalLeads: number;
  unsubscribedCount: number;
  unsubscribeReasons: Array<{ reason: string; count: number }>;
}

interface TemplateFormData {
  type: string;
  name: string;
  subject: string;
  htmlContent: string;
  textContent: string;
  availableVariables: Record<string, string>;
  isActive: boolean;
}

const defaultFormData: TemplateFormData = {
  type: 'QUESTIONNAIRE_THANK_YOU',
  name: '',
  subject: '',
  htmlContent: '',
  textContent: '',
  availableVariables: {},
  isActive: true,
};

export default function AdminEmailTemplatesPage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('templates');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [formData, setFormData] = useState<TemplateFormData>(defaultFormData);
  const [previewMode, setPreviewMode] = useState<'html' | 'text' | 'preview'>('preview');
  const [logsPage, setLogsPage] = useState(1);
  const [logsStatusFilter, setLogsStatusFilter] = useState<string>('all');
  const [bulkSendTemplate, setBulkSendTemplate] = useState<string>('');
  const [bulkSendSubject, setBulkSendSubject] = useState<string>('');
  const [testEmail, setTestEmail] = useState<string>('');
  const [isSendingBulk, setIsSendingBulk] = useState(false);
  const [bulkSendResult, setBulkSendResult] = useState<{
    success: boolean;
    sent: number;
    failed: number;
    testMode?: boolean;
  } | null>(null);

  // Fetch templates
  const { data: templates, isLoading: templatesLoading } = useQuery({
    queryKey: ['admin', 'email-templates'],
    queryFn: () => api.get<EmailTemplate[]>('/api/admin/email-templates'),
  });

  // Fetch template types
  const { data: templateTypes } = useQuery({
    queryKey: ['admin', 'email-templates', 'types'],
    queryFn: () => api.get<TemplateType[]>('/api/admin/email-templates/types'),
  });

  // Fetch logs
  const { data: logsData, isLoading: logsLoading } = useQuery({
    queryKey: ['admin', 'email-templates', 'logs', logsPage, logsStatusFilter],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('page', logsPage.toString());
      params.set('limit', '20');
      if (logsStatusFilter !== 'all') {
        params.set('status', logsStatusFilter);
      }
      return api.get<EmailLogsResponse>(`/api/admin/email-templates/logs?${params.toString()}`);
    },
  });

  // Fetch triggers
  const { data: triggers, isLoading: triggersLoading } = useQuery({
    queryKey: ['admin', 'email-triggers'],
    queryFn: () => api.get<EmailTrigger[]>('/api/admin/email-triggers'),
  });

  // Fetch bulk send stats
  const { data: bulkStats, isLoading: bulkStatsLoading, refetch: refetchBulkStats } = useQuery({
    queryKey: ['admin', 'email-templates', 'bulk-stats'],
    queryFn: () => api.get<BulkSendStats>('/api/admin/email-templates/bulk-send'),
  });

  // Upsert mutation
  const upsertMutation = useMutation({
    mutationFn: (data: TemplateFormData) =>
      api.post('/api/admin/email-templates', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      toast.success(editingTemplate ? 'Template updated successfully' : 'Template created successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(`Failed to save template: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/email-templates/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      toast.success('Template status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Init defaults mutation
  const initDefaultsMutation = useMutation({
    mutationFn: () => api.post('/api/admin/email-templates/init-defaults'),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates'] });
      toast.success('Default templates initialized');
    },
    onError: (error: Error) => {
      toast.error(`Failed to initialize defaults: ${error.message}`);
    },
  });

  // Update trigger mutation
  const updateTriggerMutation = useMutation({
    mutationFn: (data: { action: string; templateType: string; isActive: boolean }) =>
      api.post('/api/admin/email-triggers', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'email-triggers'] });
      toast.success('Trigger updated successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update trigger: ${error.message}`);
    },
  });

  const handleOpenCreate = () => {
    setEditingTemplate(null);
    setFormData(defaultFormData);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      type: template.type,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      availableVariables: template.availableVariables || {},
      isActive: template.isActive,
    });
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingTemplate(null);
    setFormData(defaultFormData);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.subject || !formData.htmlContent) {
      toast.error('Please fill in all required fields');
      return;
    }
    upsertMutation.mutate(formData);
  };

  const handleBulkSend = async (isTest: boolean) => {
    if (!bulkSendTemplate) {
      toast.error('Please select a template');
      return;
    }
    if (isTest && !testEmail) {
      toast.error('Please enter a test email address');
      return;
    }

    setIsSendingBulk(true);
    setBulkSendResult(null);

    try {
      const response = await api.post<{
        success: boolean;
        sent: number;
        failed: number;
        testMode?: boolean;
        error?: string;
      }>('/api/admin/email-templates/bulk-send', {
        templateType: bulkSendTemplate,
        subject: bulkSendSubject || undefined,
        testEmail: isTest ? testEmail : undefined,
      });

      setBulkSendResult(response);

      if (response.success) {
        toast.success(
          isTest
            ? 'Test email sent successfully!'
            : `Bulk email sent: ${response.sent} successful, ${response.failed} failed`
        );
        queryClient.invalidateQueries({ queryKey: ['admin', 'email-templates', 'logs'] });
      } else {
        toast.error(response.error || 'Failed to send emails');
      }
    } catch (error) {
      toast.error('Failed to send bulk email');
      console.error(error);
    } finally {
      setIsSendingBulk(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" /> Sent</Badge>;
      case 'FAILED':
        return <Badge variant="destructive"><X className="h-3 w-3 mr-1" /> Failed</Badge>;
      case 'PENDING':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getTemplateTypeLabel = (type: string) => {
    const typeInfo = templateTypes?.find(t => t.value === type);
    return typeInfo?.label || type;
  };

  const renderPreview = () => {
    if (previewMode === 'html') {
      return (
        <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
          <pre className="text-sm whitespace-pre-wrap">{formData.htmlContent}</pre>
        </div>
      );
    }
    if (previewMode === 'text') {
      return (
        <div className="bg-gray-100 p-4 rounded-md overflow-auto max-h-96">
          <pre className="text-sm whitespace-pre-wrap">{formData.textContent}</pre>
        </div>
      );
    }
    // Preview mode - render HTML
    return (
      <div className="border rounded-md overflow-hidden max-h-96 overflow-y-auto">
        <iframe
          srcDoc={formData.htmlContent}
          className="w-full h-96 border-0"
          title="Email Preview"
        />
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Email Templates</h1>
          <p className="text-gray-500 mt-1">
            Manage email templates and view send history
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => initDefaultsMutation.mutate()}
            disabled={initDefaultsMutation.isPending}
          >
            {initDefaultsMutation.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Init Defaults
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Template
          </Button>
        </div>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">
            <FileText className="h-4 w-4 mr-2" />
            Templates
          </TabsTrigger>
          <TabsTrigger value="triggers">
            <ToggleRight className="h-4 w-4 mr-2" />
            Triggers
          </TabsTrigger>
          <TabsTrigger value="marketing">
            <Send className="h-4 w-4 mr-2" />
            Marketing
          </TabsTrigger>
          <TabsTrigger value="logs">
            <History className="h-4 w-4 mr-2" />
            Send History
          </TabsTrigger>
        </TabsList>

        {/* Templates Tab */}
        <TabsContent value="templates">
          <Card>
            <CardHeader>
              <CardTitle>Email Templates</CardTitle>
              <CardDescription>
                Configure email templates for automated sending
              </CardDescription>
            </CardHeader>
            <CardContent>
              {templatesLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : templates && templates.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Template</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Last Updated</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {templates.map((template) => (
                      <TableRow key={template.id}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4 text-gray-400" />
                            <span className="font-medium">{template.name}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {getTemplateTypeLabel(template.type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="max-w-xs truncate">
                          {template.subject}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate(template.id)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {template.isActive ? (
                              <ToggleRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell className="text-sm text-gray-500">
                          {format(new Date(template.updatedAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenEdit(template)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Mail className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No templates yet. Create your first template or initialize defaults.</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => initDefaultsMutation.mutate()}
                    disabled={initDefaultsMutation.isPending}
                  >
                    Initialize Default Templates
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Triggers Tab */}
        <TabsContent value="triggers">
          <Card>
            <CardHeader>
              <CardTitle>Email Triggers</CardTitle>
              <CardDescription>
                Configure which actions automatically send emails. Enable or disable triggers and choose which template to use.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {triggersLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : triggers && triggers.length > 0 ? (
                <div className="space-y-4">
                  {triggers.map((trigger) => (
                    <div
                      key={trigger.action}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <h3 className="font-medium text-gray-900">{trigger.label}</h3>
                          <Badge
                            variant={trigger.isActive ? 'default' : 'secondary'}
                            className={trigger.isActive ? 'bg-green-100 text-green-800' : ''}
                          >
                            {trigger.isActive ? 'Active' : 'Inactive'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">{trigger.description}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-400">Template:</span>
                          <Badge variant="outline" className="text-xs">
                            {getTemplateTypeLabel(trigger.templateType)}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <Select
                          value={trigger.templateType}
                          onValueChange={(value) =>
                            updateTriggerMutation.mutate({
                              action: trigger.action,
                              templateType: value,
                              isActive: trigger.isActive,
                            })
                          }
                        >
                          <SelectTrigger className="w-48">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {templateTypes?.map((type) => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Switch
                          checked={trigger.isActive}
                          onCheckedChange={(checked) =>
                            updateTriggerMutation.mutate({
                              action: trigger.action,
                              templateType: trigger.templateType,
                              isActive: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No triggers configured. Triggers will appear here once you enable them.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Marketing Tab */}
        <TabsContent value="marketing">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Subscriber Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Subscriber Statistics
                </CardTitle>
                <CardDescription>
                  Overview of your email subscribers
                </CardDescription>
              </CardHeader>
              <CardContent>
                {bulkStatsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  </div>
                ) : bulkStats ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-green-50 rounded-lg">
                        <p className="text-2xl font-bold text-green-600">
                          {bulkStats.subscribersCount}
                        </p>
                        <p className="text-sm text-green-700">Active Subscribers</p>
                      </div>
                      <div className="p-4 bg-gray-50 rounded-lg">
                        <p className="text-2xl font-bold text-gray-600">
                          {bulkStats.totalLeads}
                        </p>
                        <p className="text-sm text-gray-700">Total Leads</p>
                      </div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-lg">
                      <p className="text-lg font-semibold text-red-600">
                        {bulkStats.unsubscribedCount} Unsubscribed
                      </p>
                      {bulkStats.unsubscribeReasons && bulkStats.unsubscribeReasons.length > 0 && (
                        <div className="mt-2 space-y-1">
                          <p className="text-xs font-medium text-red-800">Unsubscribe Reasons:</p>
                          {bulkStats.unsubscribeReasons.map((r, i) => (
                            <div key={i} className="flex justify-between text-xs text-red-700">
                              <span>{r.reason}</span>
                              <span className="font-medium">{r.count}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => refetchBulkStats()}
                      className="w-full"
                    >
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Refresh Stats
                    </Button>
                  </div>
                ) : (
                  <p className="text-gray-500 text-center py-4">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Send Bulk Email */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Send className="h-5 w-5" />
                  Send Marketing Email
                </CardTitle>
                <CardDescription>
                  Send emails to all subscribers who have marketing consent
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Template</Label>
                  <Select
                    value={bulkSendTemplate}
                    onValueChange={setBulkSendTemplate}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates?.map((template) => (
                        <SelectItem key={template.id} value={template.type}>
                          {template.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Subject Override (Optional)</Label>
                  <Input
                    value={bulkSendSubject}
                    onChange={(e) => setBulkSendSubject(e.target.value)}
                    placeholder="Leave empty to use template subject"
                  />
                </div>

                <div className="border-t pt-4 mt-4">
                  <Label className="text-sm text-gray-500">Test Before Sending</Label>
                  <div className="flex gap-2 mt-2">
                    <Input
                      value={testEmail}
                      onChange={(e) => setTestEmail(e.target.value)}
                      placeholder="Enter test email..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      onClick={() => handleBulkSend(true)}
                      disabled={isSendingBulk || !bulkSendTemplate || !testEmail}
                    >
                      {isSendingBulk ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Send Test'
                      )}
                    </Button>
                  </div>
                </div>

                {bulkSendResult && (
                  <div className={`p-3 rounded-lg ${bulkSendResult.success ? 'bg-green-50' : 'bg-red-50'}`}>
                    <p className={`text-sm font-medium ${bulkSendResult.success ? 'text-green-800' : 'text-red-800'}`}>
                      {bulkSendResult.testMode ? 'Test email ' : 'Bulk send '}
                      {bulkSendResult.success ? 'completed' : 'failed'}
                    </p>
                    {!bulkSendResult.testMode && (
                      <p className="text-xs text-gray-600 mt-1">
                        Sent: {bulkSendResult.sent} | Failed: {bulkSendResult.failed}
                      </p>
                    )}
                  </div>
                )}

                <Button
                  className="w-full"
                  onClick={() => handleBulkSend(false)}
                  disabled={isSendingBulk || !bulkSendTemplate || bulkStats?.subscribersCount === 0}
                >
                  {isSendingBulk ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 mr-2" />
                      Send to {bulkStats?.subscribersCount || 0} Subscribers
                    </>
                  )}
                </Button>

                <p className="text-xs text-gray-500 text-center">
                  Only sends to leads with marketing consent who have not unsubscribed
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Logs Tab */}
        <TabsContent value="logs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Send History</CardTitle>
                  <CardDescription>
                    View email send logs and status
                  </CardDescription>
                </div>
                <Select
                  value={logsStatusFilter}
                  onValueChange={setLogsStatusFilter}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="SENT">Sent</SelectItem>
                    <SelectItem value="FAILED">Failed</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                </div>
              ) : logsData && logsData.data.length > 0 ? (
                <>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Recipient</TableHead>
                        <TableHead>Subject</TableHead>
                        <TableHead>Template</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Sent At</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {logsData.data.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.recipientEmail}</p>
                              {log.recipientName && (
                                <p className="text-sm text-gray-500">{log.recipientName}</p>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {log.subject}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {getTemplateTypeLabel(log.templateType)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(log.status)}
                            {log.errorMessage && (
                              <p className="text-xs text-red-500 mt-1 max-w-xs truncate" title={log.errorMessage}>
                                {log.errorMessage}
                              </p>
                            )}
                          </TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {log.sentAt
                              ? format(new Date(log.sentAt), 'MMM d, yyyy HH:mm')
                              : format(new Date(log.createdAt), 'MMM d, yyyy HH:mm')}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {logsData.meta.totalPages > 1 && (
                    <div className="flex justify-center gap-2 mt-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage(p => Math.max(1, p - 1))}
                        disabled={logsPage === 1}
                      >
                        Previous
                      </Button>
                      <span className="flex items-center px-3 text-sm text-gray-600">
                        Page {logsPage} of {logsData.meta.totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setLogsPage(p => Math.min(logsData.meta.totalPages, p + 1))}
                        disabled={logsPage === logsData.meta.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <History className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No email logs yet. Logs will appear here when emails are sent.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTemplate ? 'Edit Template' : 'Add Template'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Template Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value })}
                  disabled={!!editingTemplate}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {templateTypes?.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Template Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Welcome Email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                value={formData.subject}
                onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                placeholder="e.g., Welcome to OneClickTag!"
              />
              <p className="text-xs text-gray-500">
                You can use variables like {"{{name}}"} or {"{{email}}"}
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Email Content</Label>
                <div className="flex items-center gap-2">
                  <Button
                    variant={previewMode === 'preview' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('preview')}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Preview
                  </Button>
                  <Button
                    variant={previewMode === 'html' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('html')}
                  >
                    <Code className="h-4 w-4 mr-1" />
                    HTML
                  </Button>
                  <Button
                    variant={previewMode === 'text' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setPreviewMode('text')}
                  >
                    <FileText className="h-4 w-4 mr-1" />
                    Text
                  </Button>
                </div>
              </div>

              {previewMode === 'preview' ? (
                renderPreview()
              ) : previewMode === 'html' ? (
                <Textarea
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  placeholder="Enter HTML content..."
                  rows={12}
                  className="font-mono text-sm"
                />
              ) : (
                <Textarea
                  value={formData.textContent}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  placeholder="Enter plain text content (fallback for email clients that do not support HTML)..."
                  rows={12}
                />
              )}
            </div>

            <div className="p-3 bg-blue-50 rounded-md">
              <p className="text-sm text-blue-800 font-medium mb-1">Available Variables:</p>
              <p className="text-sm text-blue-600">
                {"{{name}}"} - Recipient name | {"{{email}}"} - Recipient email | {"{{questionnaireUrl}}"} - Questionnaire link
              </p>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="active"
                checked={formData.isActive}
                onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
              />
              <Label htmlFor="active">Active (template can be used for sending)</Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={upsertMutation.isPending}
            >
              {upsertMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingTemplate ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
