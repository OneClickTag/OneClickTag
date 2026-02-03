import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
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
  Plus,
  Edit2,
  Trash2,
  GripVertical,
  ToggleLeft,
  ToggleRight,
  BarChart3,
  FileText,
  Star,
  MessageSquare,
} from 'lucide-react';
import { adminQuestionnaireService } from '@/lib/api/services';
import type {
  AdminQuestion,
  CreateQuestionData,
  QuestionType,
  QuestionStats
} from '@/lib/api/services/admin/adminQuestionnaireService';

export function AdminQuestionnairePage() {
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [stats, setStats] = useState<QuestionStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AdminQuestion | null>(null);
  const [activeTab, setActiveTab] = useState('questions');
  const [formData, setFormData] = useState<CreateQuestionData>({
    question: '',
    type: 'TEXT',
    isRequired: true,
    isActive: true,
  });

  useEffect(() => {
    loadQuestions();
  }, []);

  useEffect(() => {
    if (activeTab === 'statistics') {
      loadStats();
    }
  }, [activeTab]);

  const loadQuestions = async () => {
    try {
      setLoading(true);
      const data = await adminQuestionnaireService.getAll(false); // Include inactive
      setQuestions(data);
    } catch (error) {
      console.error('Failed to load questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStats = async () => {
    try {
      setStatsLoading(true);
      const data = await adminQuestionnaireService.getAllStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load stats:', error);
    } finally {
      setStatsLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingQuestion(null);
    setFormData({
      question: '',
      type: 'TEXT',
      isRequired: true,
      isActive: true,
      order: questions.length,
    });
    setDialogOpen(true);
  };

  const handleEdit = (question: AdminQuestion) => {
    setEditingQuestion(question);
    setFormData({
      question: question.question,
      type: question.type,
      options: question.options,
      placeholder: question.placeholder,
      isRequired: question.isRequired,
      isActive: question.isActive,
      category: question.category,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (editingQuestion) {
        await adminQuestionnaireService.update(editingQuestion.id, formData);
      } else {
        await adminQuestionnaireService.create(formData);
      }

      setDialogOpen(false);
      loadQuestions();
    } catch (error) {
      console.error('Failed to save question:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    try {
      await adminQuestionnaireService.delete(id);
      loadQuestions();
    } catch (error) {
      console.error('Failed to delete question:', error);
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      await adminQuestionnaireService.toggleActive(id);
      loadQuestions();
    } catch (error) {
      console.error('Failed to toggle active status:', error);
    }
  };

  const needsOptions = ['RADIO', 'CHECKBOX', 'SCALE'].includes(formData.type);

  const questionTypes: { value: QuestionType; label: string }[] = [
    { value: 'TEXT', label: 'Short Text' },
    { value: 'TEXTAREA', label: 'Long Text' },
    { value: 'RADIO', label: 'Single Choice' },
    { value: 'CHECKBOX', label: 'Multiple Choice' },
    { value: 'RATING', label: 'Star Rating (1-5)' },
    { value: 'SCALE', label: 'Scale (1-10)' },
  ];

  const getTypeIcon = (type: QuestionType) => {
    switch (type) {
      case 'RATING':
        return <Star className="w-4 h-4" />;
      case 'TEXT':
      case 'TEXTAREA':
        return <MessageSquare className="w-4 h-4" />;
      default:
        return <BarChart3 className="w-4 h-4" />;
    }
  };

  const renderStatisticsContent = () => {
    if (statsLoading) {
      return (
        <div className="p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
        </div>
      );
    }

    if (stats.length === 0) {
      return (
        <div className="p-12 text-center">
          <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No response data available yet.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold">{stats.length}</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Responses</p>
                <p className="text-2xl font-bold">
                  {stats.reduce((sum, s) => sum + s.totalResponses, 0)}
                </p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Star className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Avg Response Rate</p>
                <p className="text-2xl font-bold">
                  {stats.length > 0
                    ? Math.round(
                        stats.reduce((sum, s) => sum + s.totalResponses, 0) / stats.length
                      )
                    : 0}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Question Stats */}
        <div className="space-y-4">
          {stats.map((questionStat) => (
            <div
              key={questionStat.id}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-start space-x-3">
                  <div className="p-2 bg-gray-100 rounded-lg">
                    {getTypeIcon(questionStat.type)}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{questionStat.question}</h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <Badge variant="outline">{questionStat.type}</Badge>
                      {questionStat.category && (
                        <Badge variant="outline" className="text-gray-500">
                          {questionStat.category}
                        </Badge>
                      )}
                      <span className="text-sm text-gray-500">
                        {questionStat.totalResponses} responses
                      </span>
                    </div>
                  </div>
                </div>
                {questionStat.average !== null && questionStat.average !== undefined && (
                  <div className="text-right">
                    <p className="text-sm text-gray-600">Average</p>
                    <p className="text-2xl font-bold text-blue-600">
                      {questionStat.average}
                    </p>
                  </div>
                )}
              </div>

              {/* Distribution */}
              {questionStat.distribution.length > 0 && (
                <div className="space-y-3">
                  {['RADIO', 'CHECKBOX', 'RATING', 'SCALE'].includes(questionStat.type) ? (
                    // Bar chart for choice-based questions
                    questionStat.distribution.map((item, index) => (
                      <div key={index} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-700">{item.answer}</span>
                          <span className="text-gray-500">
                            {item.count} ({item.percentage || 0}%)
                          </span>
                        </div>
                        <Progress value={item.percentage || 0} className="h-2" />
                      </div>
                    ))
                  ) : (
                    // Text samples for text questions
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-600">Sample Responses:</p>
                      <div className="grid gap-2">
                        {questionStat.distribution.slice(0, 5).map((item, index) => (
                          <div
                            key={index}
                            className="p-3 bg-gray-50 rounded-lg text-sm text-gray-700"
                          >
                            &ldquo;{item.answer}&rdquo;
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {questionStat.totalResponses === 0 && (
                <p className="text-gray-400 text-sm italic">No responses yet</p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-900">Questionnaire Management</h2>
            <p className="text-gray-600 mt-1">Manage questions and view response statistics</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="questions" className="flex items-center space-x-2">
              <FileText className="w-4 h-4" />
              <span>Questions</span>
            </TabsTrigger>
            <TabsTrigger value="statistics" className="flex items-center space-x-2">
              <BarChart3 className="w-4 h-4" />
              <span>Statistics</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="questions" className="mt-6">
            {/* Add Question Button */}
            <div className="flex justify-end mb-4">
              <Button onClick={handleCreate}>
                <Plus className="w-4 h-4 mr-2" />
                Add Question
              </Button>
            </div>

            {/* Questions List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 divide-y divide-gray-200">
              {loading ? (
                <div className="p-12 text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
                </div>
              ) : questions.length === 0 ? (
                <div className="p-12 text-center">
                  <p className="text-gray-500">No questions yet. Click &ldquo;Add Question&rdquo; to create one.</p>
                </div>
              ) : (
                questions.map((question, index) => (
                  <div
                    key={question.id}
                    className="p-6 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-start space-x-4">
                      {/* Order Number */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <GripVertical className="w-5 h-5 text-gray-400 cursor-move" />
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-semibold text-sm">
                          {index + 1}
                        </div>
                      </div>

                      {/* Question Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 flex-1">
                            {question.question}
                          </h3>
                          <div className="flex items-center space-x-2 ml-4">
                            {question.isActive ? (
                              <Badge className="bg-green-100 text-green-700">Active</Badge>
                            ) : (
                              <Badge variant="outline" className="text-gray-500">Inactive</Badge>
                            )}
                            {question.isRequired && (
                              <Badge variant="outline" className="text-red-600 border-red-300">Required</Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center space-x-4 text-sm text-gray-600 mb-3">
                          <Badge variant="outline">{question.type}</Badge>
                          {question.category && (
                            <span className="text-gray-500">{question.category}</span>
                          )}
                          {question.responseCount !== undefined && (
                            <span>{question.responseCount} responses</span>
                          )}
                        </div>

                        {question.options && question.options.length > 0 && (
                          <div className="text-sm text-gray-600 mb-2">
                            <span className="font-medium">Options:</span> {question.options.join(', ')}
                          </div>
                        )}

                        {question.placeholder && (
                          <div className="text-sm text-gray-500 italic">
                            Placeholder: {question.placeholder}
                          </div>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex items-center space-x-2 flex-shrink-0">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleToggleActive(question.id)}
                          title={question.isActive ? 'Deactivate' : 'Activate'}
                        >
                          {question.isActive ? (
                            <ToggleRight className="w-4 h-4 text-green-600" />
                          ) : (
                            <ToggleLeft className="w-4 h-4 text-gray-400" />
                          )}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleEdit(question)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handleDelete(question.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="mt-6">
            {renderStatisticsContent()}
          </TabsContent>
        </Tabs>

        {/* Create/Edit Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingQuestion ? 'Edit Question' : 'Create Question'}
              </DialogTitle>
              <DialogDescription>
                {editingQuestion
                  ? 'Update the question details below.'
                  : 'Add a new question to the questionnaire.'}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="question">Question Text *</Label>
                <Textarea
                  id="question"
                  required
                  value={formData.question}
                  onChange={(e) => setFormData({ ...formData, question: e.target.value })}
                  placeholder="What is your primary use case?"
                  className="mt-2"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Question Type *</Label>
                  <Select
                    value={formData.type}
                    onValueChange={(value: QuestionType) => setFormData({ ...formData, type: value })}
                  >
                    <SelectTrigger className="mt-2">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {questionTypes.map(({ value, label }) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="category">Category</Label>
                  <Input
                    id="category"
                    value={formData.category || ''}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., behavior, needs"
                    className="mt-2"
                  />
                </div>
              </div>

              {needsOptions && (
                <div>
                  <Label htmlFor="options">
                    Options * {formData.type === 'SCALE' ? '(numbers, e.g., 1, 2, 3...)' : '(one per line)'}
                  </Label>
                  <Textarea
                    id="options"
                    required={needsOptions}
                    value={formData.options?.join('\n') || ''}
                    onChange={(e) => setFormData({
                      ...formData,
                      options: e.target.value.split('\n').filter(o => o.trim())
                    })}
                    placeholder={
                      formData.type === 'SCALE'
                        ? '1\n2\n3\n4\n5'
                        : 'Option 1\nOption 2\nOption 3'
                    }
                    className="mt-2"
                    rows={5}
                  />
                </div>
              )}

              <div>
                <Label htmlFor="placeholder">Placeholder Text</Label>
                <Input
                  id="placeholder"
                  value={formData.placeholder || ''}
                  onChange={(e) => setFormData({ ...formData, placeholder: e.target.value })}
                  placeholder="Enter your answer..."
                  className="mt-2"
                />
              </div>

              <div className="flex items-center space-x-6">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isRequired}
                    onChange={(e) => setFormData({ ...formData, isRequired: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Required</span>
                </label>

                <label className="flex items-center space-x-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm font-medium">Active</span>
                </label>
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit">
                  {editingQuestion ? 'Update' : 'Create'} Question
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  );
}
