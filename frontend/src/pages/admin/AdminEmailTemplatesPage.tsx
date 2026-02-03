import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Edit2,
  Mail,
  ToggleLeft,
  ToggleRight,
  FileText,
  History,
  CheckCircle,
  XCircle,
  Clock,
  Eye,
} from 'lucide-react';
import { adminEmailTemplateService } from '@/lib/api/services';
import type {
  EmailTemplate,
  EmailTemplateType,
  CreateEmailTemplateData,
  EmailLog,
  TemplateTypeOption,
} from '@/lib/api/services/admin/adminEmailTemplateService';

export function AdminEmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [logs, setLogs] = useState<EmailLog[]>([]);
  const [logsMeta, setLogsMeta] = useState({ total: 0, page: 1, limit: 20, totalPages: 0 });
  const [templateTypes, setTemplateTypes] = useState<TemplateTypeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [logsLoading, setLogsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewContent, setPreviewContent] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState('templates');
  const [formData, setFormData] = useState<CreateEmailTemplateData>({
    type: 'QUESTIONNAIRE_THANK_YOU',
    name: '',
    subject: '',
    htmlContent: '',
    textContent: '',
    isActive: true,
  });

  useEffect(() => {
    loadTemplates();
    loadTypes();
  }, []);

  useEffect(() => {
    if (activeTab === 'logs') {
      loadLogs();
    }
  }, [activeTab]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const data = await adminEmailTemplateService.getAll();
      setTemplates(data);
    } catch (error) {
      console.error('Failed to load templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadTypes = async () => {
    try {
      const types = await adminEmailTemplateService.getTypes();
      setTemplateTypes(types);
    } catch (error) {
      console.error('Failed to load template types:', error);
    }
  };

  const loadLogs = async (page = 1) => {
    try {
      setLogsLoading(true);
      const response = await adminEmailTemplateService.getLogs({ page, limit: 20 });
      setLogs(response.data);
      setLogsMeta(response.meta);
    } catch (error) {
      console.error('Failed to load logs:', error);
    } finally {
      setLogsLoading(false);
    }
  };

  const handleEdit = (template: EmailTemplate) => {
    setEditingTemplate(template);
    setFormData({
      type: template.type,
      name: template.name,
      subject: template.subject,
      htmlContent: template.htmlContent,
      textContent: template.textContent || '',
      isActive: template.isActive,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingTemplate) {
        await adminEmailTemplateService.update(editingTemplate.id, formData);
      } else {
        await adminEmailTemplateService.upsert(formData);
      }

      setDialogOpen(false);
      loadTemplates();
    } catch (error) {
      console.error('Failed to save template:', error);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await adminEmailTemplateService.toggleActive(id);
      loadTemplates();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    }
  };

  const handlePreview = (htmlContent: string) => {
    setPreviewContent(htmlContent);
    setPreviewOpen(true);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'SENT':
        return (
          <Badge className="bg-green-100 text-green-700">
            <CheckCircle className="w-3 h-3 mr-1" />
            Sent
          </Badge>
        );
      case 'FAILED':
        return (
          <Badge className="bg-red-100 text-red-700">
            <XCircle className="w-3 h-3 mr-1" />
            Failed
          </Badge>
        );
      case 'PENDING':
        return (
          <Badge className="bg-yellow-100 text-yellow-700">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  const availableVariables = [
    { name: 'name', description: 'Recipient name' },
    { name: 'email', description: 'Recipient email' },
    { name: 'responses', description: 'Formatted questionnaire responses (HTML table)' },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Email Templates</h2>
            <p className="text-gray-600 mt-1">Manage email templates and view send history</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="templates" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Templates</span>
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center space-x-2">
              <History className="w-4 h-4" />
              <span>Send History</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="templates" className="mt-6">
            {/* Templates List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                </div>
              ) : templates.length === 0 ? (
                <div className="p-12 text-center">
                  <Mail className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No email templates found.</p>
                </div>
              ) : (
                templates.map((template) => (
                  <div key={template.id} className="p-6 hover:bg-gray-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <Mail className="w-5 h-5 text-blue-600" />
                          <h3 className="text-lg font-semibold text-gray-900">{template.name}</h3>
                          {template.isActive ? (
                            <Badge className="bg-green-100 text-green-700">Active</Badge>
                          ) : (
                            <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                          )}
                        </div>
                        <div className="space-y-1 text-sm text-gray-600">
                          <p>
                            <span className="font-medium">Type:</span>{' '}
                            <Badge variant="outline">{template.type.replace(/_/g, ' ')}</Badge>
                          </p>
                          <p>
                            <span className="font-medium">Subject:</span> {template.subject}
                          </p>
                          <p className="text-gray-400">
                            Updated: {formatDate(template.updatedAt)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePreview(template.htmlContent)}
                          title="Preview"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(template.id)}
                          title={template.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {template.isActive ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(template)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="mt-6">
            {/* Logs Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200">
              {logsLoading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                </div>
              ) : logs.length === 0 ? (
                <div className="p-12 text-center">
                  <History className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">No email logs yet.</p>
                </div>
              ) : (
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
                      {logs.map((log) => (
                        <TableRow key={log.id}>
                          <TableCell>
                            <div>
                              <p className="font-medium">{log.recipientName || 'Unknown'}</p>
                              <p className="text-sm text-gray-500">{log.recipientEmail}</p>
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">{log.subject}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{log.templateType.replace(/_/g, ' ')}</Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(log.status)}</TableCell>
                          <TableCell className="text-sm text-gray-500">
                            {log.sentAt ? formatDate(log.sentAt) : formatDate(log.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>

                  {/* Pagination */}
                  {logsMeta.totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <p className="text-sm text-gray-600">
                        Showing {(logsMeta.page - 1) * logsMeta.limit + 1} to{' '}
                        {Math.min(logsMeta.page * logsMeta.limit, logsMeta.total)} of {logsMeta.total}
                      </p>
                      <div className="flex space-x-2">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={logsMeta.page === 1}
                          onClick={() => loadLogs(logsMeta.page - 1)}
                        >
                          Previous
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={logsMeta.page === logsMeta.totalPages}
                          onClick={() => loadLogs(logsMeta.page + 1)}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* Edit Template Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Email Template</DialogTitle>
              <DialogDescription>
                Customize the email template content. Use {"{{variable}}"} syntax for dynamic content.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Questionnaire Thank You"
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="type">Template Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: EmailTemplateType) =>
                      setFormData({ ...formData, type: value })
                    }
                    disabled={!!editingTemplate}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {templateTypes.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="subject">Email Subject *</Label>
                <Input
                  id="subject"
                  required
                  value={formData.subject}
                  onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                  placeholder="Thank you for your submission, {{name}}!"
                  className="mt-2"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label htmlFor="htmlContent">HTML Content *</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => handlePreview(formData.htmlContent)}
                  >
                    <Eye className="w-3 h-3 mr-1" />
                    Preview
                  </Button>
                </div>
                <Textarea
                  id="htmlContent"
                  required
                  value={formData.htmlContent}
                  onChange={(e) => setFormData({ ...formData, htmlContent: e.target.value })}
                  placeholder="<h1>Hello {{name}}</h1><p>Thank you for your submission!</p>"
                  className="mt-2 font-mono text-sm"
                  rows={12}
                />
              </div>

              <div>
                <Label htmlFor="textContent">Plain Text Content (optional)</Label>
                <Textarea
                  id="textContent"
                  value={formData.textContent || ''}
                  onChange={(e) => setFormData({ ...formData, textContent: e.target.value })}
                  placeholder="Hello {{name}}, Thank you for your submission!"
                  className="mt-2"
                  rows={4}
                />
              </div>

              {/* Available Variables */}
              <div className="bg-gray-50 rounded-lg p-4">
                <Label className="mb-2 block">Available Variables</Label>
                <div className="flex flex-wrap gap-2">
                  {availableVariables.map((variable) => (
                    <Badge
                      key={variable.name}
                      variant="outline"
                      className="cursor-help"
                      title={variable.description}
                    >
                      {`{{${variable.name}}}`}
                    </Badge>
                  ))}
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="isActive" className="cursor-pointer">
                  Active (emails will be sent using this template)
                </Label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">Save Template</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* Preview Dialog */}
        <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh]">
            <DialogHeader>
              <DialogTitle>Email Preview</DialogTitle>
            </DialogHeader>
            <div className="border rounded-lg p-4 bg-white overflow-auto max-h-[60vh]">
              <div dangerouslySetInnerHTML={{ __html: previewContent }} />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
