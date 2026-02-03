'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useApi } from '@/hooks/use-api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
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
  Trash2,
  GripVertical,
  Loader2,
  BarChart3,
  MessageSquare,
  CheckSquare,
  List,
  AlignLeft,
  Star,
  RefreshCw,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';

interface Question {
  id: string;
  question: string;
  type: 'TEXT' | 'TEXTAREA' | 'SELECT' | 'MULTISELECT' | 'RADIO' | 'CHECKBOX' | 'RATING' | 'SCALE';
  options: string[] | null;
  placeholder: string | null;
  order: number;
  isRequired: boolean;
  isActive: boolean;
  category: string | null;
  createdAt: string;
  responseCount?: number;
}

interface QuestionFormData {
  question: string;
  type: Question['type'];
  options: string[];
  placeholder: string;
  isRequired: boolean;
  isActive: boolean;
  category: string;
  order: number;
}

interface QuestionAnalytics {
  questionId: string;
  question: string;
  type: string;
  category: string | null;
  totalResponses: number;
  answerBreakdown?: Array<{ option: string; count: number; percentage: number }>;
  averageRating?: number;
  ratingDistribution?: Array<{ rating: number; count: number; percentage: number }>;
  sampleResponses?: (string | number | string[])[];
}

interface ResponseAnalytics {
  overview: {
    totalLeads: number;
    completedLeads: number;
    completionRate: number;
  };
  questions: QuestionAnalytics[];
}

const questionTypeOptions = [
  { value: 'TEXT', label: 'Text Input', icon: AlignLeft },
  { value: 'TEXTAREA', label: 'Text Area', icon: MessageSquare },
  { value: 'SELECT', label: 'Dropdown', icon: List },
  { value: 'MULTISELECT', label: 'Multi-Select', icon: CheckSquare },
  { value: 'RADIO', label: 'Radio Buttons', icon: CheckSquare },
  { value: 'CHECKBOX', label: 'Checkbox', icon: CheckSquare },
  { value: 'RATING', label: 'Rating', icon: Star },
  { value: 'SCALE', label: 'Scale', icon: BarChart3 },
];

const defaultFormData: QuestionFormData = {
  question: '',
  type: 'TEXT',
  options: [],
  placeholder: '',
  isRequired: true,
  isActive: true,
  category: '',
  order: 0,
};

export default function AdminQuestionnairePage() {
  const api = useApi();
  const queryClient = useQueryClient();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [formData, setFormData] = useState<QuestionFormData>(defaultFormData);
  const [optionsText, setOptionsText] = useState('');
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Fetch questions
  const { data: questions, isLoading } = useQuery({
    queryKey: ['admin', 'questionnaire'],
    queryFn: () => api.get<Question[]>('/api/admin/questionnaire'),
  });

  // Fetch response analytics
  const { data: analytics } = useQuery({
    queryKey: ['admin', 'leads', 'response-analytics'],
    queryFn: () => api.get<ResponseAnalytics>('/api/admin/leads/response-analytics'),
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: (data: Partial<QuestionFormData>) =>
      api.post('/api/admin/questionnaire', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'questionnaire'] });
      toast.success('Question created successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(`Failed to create question: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<QuestionFormData> }) =>
      api.put(`/api/admin/questionnaire/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'questionnaire'] });
      toast.success('Question updated successfully');
      handleCloseModal();
    },
    onError: (error: Error) => {
      toast.error(`Failed to update question: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/questionnaire/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'questionnaire'] });
      toast.success('Question deleted successfully');
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete question: ${error.message}`);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/admin/questionnaire/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'questionnaire'] });
      toast.success('Question status updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to update status: ${error.message}`);
    },
  });

  // Reorder mutation
  const reorderMutation = useMutation({
    mutationFn: (items: Array<{ id: string; order: number }>) =>
      api.put('/api/admin/questionnaire/reorder', { items }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'questionnaire'] });
      toast.success('Order updated');
    },
    onError: (error: Error) => {
      toast.error(`Failed to reorder: ${error.message}`);
    },
  });

  const handleOpenCreate = () => {
    setEditingQuestion(null);
    setFormData({
      ...defaultFormData,
      order: questions ? Math.max(...questions.map(q => q.order), 0) + 1 : 1,
    });
    setOptionsText('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (question: Question) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      type: question.type,
      options: question.options || [],
      placeholder: question.placeholder || '',
      isRequired: question.isRequired,
      isActive: question.isActive,
      category: question.category || '',
      order: question.order,
    });
    setOptionsText(question.options?.join('\n') || '');
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingQuestion(null);
    setFormData(defaultFormData);
    setOptionsText('');
  };

  const handleSubmit = () => {
    const options = optionsText
      .split('\n')
      .map(o => o.trim())
      .filter(o => o.length > 0);

    const data = {
      ...formData,
      options: options.length > 0 ? options : undefined,
    };

    if (editingQuestion) {
      updateMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this question? This cannot be undone.')) {
      deleteMutation.mutate(id);
    }
  };

  const handleMoveUp = (index: number) => {
    if (!questions || index === 0) return;
    const items = [...questions];
    const temp = items[index].order;
    items[index].order = items[index - 1].order;
    items[index - 1].order = temp;
    reorderMutation.mutate([
      { id: items[index].id, order: items[index].order },
      { id: items[index - 1].id, order: items[index - 1].order },
    ]);
  };

  const handleMoveDown = (index: number) => {
    if (!questions || index === questions.length - 1) return;
    const items = [...questions];
    const temp = items[index].order;
    items[index].order = items[index + 1].order;
    items[index + 1].order = temp;
    reorderMutation.mutate([
      { id: items[index].id, order: items[index].order },
      { id: items[index + 1].id, order: items[index + 1].order },
    ]);
  };

  const getQuestionTypeIcon = (type: string) => {
    const option = questionTypeOptions.find(o => o.value === type);
    const Icon = option?.icon || MessageSquare;
    return <Icon className="h-4 w-4" />;
  };

  const getAnalyticsForQuestion = (questionId: string) => {
    return analytics?.questions.find(q => q.questionId === questionId);
  };

  const needsOptions = (type: string) => {
    return ['SELECT', 'MULTISELECT', 'RADIO', 'CHECKBOX'].includes(type);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Questionnaire Management</h1>
          <p className="text-gray-500 mt-1">
            Create and manage questionnaire questions for leads
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={() => setShowAnalytics(!showAnalytics)}
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            {showAnalytics ? 'Hide' : 'Show'} Analytics
          </Button>
          <Button onClick={handleOpenCreate}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>
      </div>

      {/* Analytics Overview */}
      {showAnalytics && analytics && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Total Leads
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.overview.totalLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Completed Questionnaires
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.overview.completedLeads}</p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-500">
                Completion Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold">{analytics.overview.completionRate.toFixed(1)}%</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Questions Table */}
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>
            Manage questionnaire questions. Drag to reorder.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : questions && questions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">Order</TableHead>
                  <TableHead>Question</TableHead>
                  <TableHead className="w-32">Type</TableHead>
                  <TableHead className="w-24">Required</TableHead>
                  <TableHead className="w-24">Status</TableHead>
                  <TableHead className="w-24">Responses</TableHead>
                  <TableHead className="w-32 text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions
                  .sort((a, b) => a.order - b.order)
                  .map((question, index) => {
                    const questionAnalytics = getAnalyticsForQuestion(question.id);
                    return (
                      <TableRow key={question.id}>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0"
                              disabled={index === 0}
                              onClick={() => handleMoveUp(index)}
                            >
                              <GripVertical className="h-4 w-4 rotate-90" />
                            </Button>
                            <span className="text-center text-sm text-gray-500">
                              {question.order}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <p className="font-medium">{question.question}</p>
                            {question.category && (
                              <Badge variant="secondary" className="text-xs">
                                {question.category}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getQuestionTypeIcon(question.type)}
                            <span className="text-sm">
                              {questionTypeOptions.find(o => o.value === question.type)?.label}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {question.isRequired ? (
                            <Badge variant="default">Required</Badge>
                          ) : (
                            <Badge variant="outline">Optional</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleActiveMutation.mutate(question.id)}
                            disabled={toggleActiveMutation.isPending}
                          >
                            {question.isActive ? (
                              <ToggleRight className="h-5 w-5 text-green-600" />
                            ) : (
                              <ToggleLeft className="h-5 w-5 text-gray-400" />
                            )}
                          </Button>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-gray-600">
                            {questionAnalytics?.totalResponses || 0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEdit(question)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(question.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No questions yet. Add your first question to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Response Analytics by Question */}
      {showAnalytics && analytics && analytics.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Response Analytics</CardTitle>
            <CardDescription>
              Breakdown of responses for each question
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {analytics.questions.map((q) => (
              <div key={q.questionId} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium">{q.question}</h4>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge variant="outline">{q.type}</Badge>
                      {q.category && (
                        <Badge variant="secondary">{q.category}</Badge>
                      )}
                      <span className="text-sm text-gray-500">
                        {q.totalResponses} responses
                      </span>
                    </div>
                  </div>
                </div>

                {/* Answer Breakdown */}
                {q.answerBreakdown && q.answerBreakdown.length > 0 && (
                  <div className="space-y-2">
                    {q.answerBreakdown.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className="w-32 text-sm truncate" title={item.option}>
                          {item.option}
                        </div>
                        <div className="flex-1 bg-gray-200 rounded-full h-4">
                          <div
                            className="bg-blue-600 h-4 rounded-full"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                        <div className="w-16 text-sm text-right">
                          {item.count} ({item.percentage.toFixed(0)}%)
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Rating Distribution */}
                {q.averageRating !== undefined && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600">
                      Average Rating: <span className="font-bold">{q.averageRating.toFixed(1)}</span>
                    </p>
                    {q.ratingDistribution && (
                      <div className="flex items-end gap-2 h-24">
                        {q.ratingDistribution.map((item) => (
                          <div key={item.rating} className="flex-1 flex flex-col items-center">
                            <div
                              className="w-full bg-yellow-400 rounded-t"
                              style={{ height: `${item.percentage}%` }}
                            />
                            <span className="text-xs mt-1">{item.rating}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Sample Responses */}
                {q.sampleResponses && q.sampleResponses.length > 0 && (
                  <div className="mt-3">
                    <p className="text-sm font-medium text-gray-600 mb-2">Sample Responses:</p>
                    <div className="space-y-1">
                      {q.sampleResponses.slice(0, 3).map((response, idx) => (
                        <p key={idx} className="text-sm text-gray-500 italic">
                          &ldquo;{Array.isArray(response) ? response.join(', ') : response}&rdquo;
                        </p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingQuestion ? 'Edit Question' : 'Add Question'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="question">Question Text</Label>
              <Input
                id="question"
                value={formData.question}
                onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                placeholder="Enter your question..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Question Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value) => setFormData({ ...formData, type: value as Question['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {questionTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <option.icon className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Business Info"
                />
              </div>
            </div>

            {needsOptions(formData.type) && (
              <div className="space-y-2">
                <Label htmlFor="options">Options (one per line)</Label>
                <Textarea
                  id="options"
                  value={optionsText}
                  onChange={(e) => setOptionsText(e.target.value)}
                  placeholder="Option 1&#10;Option 2&#10;Option 3"
                  rows={4}
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="placeholder">Placeholder (Optional)</Label>
              <Input
                id="placeholder"
                value={formData.placeholder}
                onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                placeholder="Enter placeholder text..."
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="required"
                  checked={formData.isRequired}
                  onCheckedChange={(checked) => setFormData({ ...formData, isRequired: checked })}
                />
                <Label htmlFor="required">Required</Label>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={handleCloseModal}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingQuestion ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
