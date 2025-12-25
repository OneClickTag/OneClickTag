import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Mail, User, Calendar, Globe, CheckCircle2, Clock } from 'lucide-react';
import { adminLeadsService } from '@/lib/api/services';
import type { AdminLead } from '@/lib/api/services/admin/adminLeadsService';

export function AdminLeadDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [lead, setLead] = useState<AdminLead | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) {
      loadLead();
    }
  }, [id]);

  const loadLead = async () => {
    try {
      setLoading(true);
      const data = await adminLeadsService.getById(id!);
      setLead(data);
    } catch (error) {
      console.error('Failed to load lead:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
        </div>
      </AdminLayout>
    );
  }

  if (!lead) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Lead Not Found</h2>
          <p className="text-gray-600 mb-4">The lead you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/admin/leads')}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Leads
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/admin/leads')}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div>
              <h2 className="text-3xl font-bold text-gray-900">{lead.name}</h2>
              <p className="text-gray-600 mt-1">{lead.email}</p>
            </div>
          </div>
          <div>
            {lead.questionnaireCompleted ? (
              <Badge className="bg-green-100 text-green-700">
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Completed
              </Badge>
            ) : (
              <Badge variant="outline" className="text-yellow-700 border-yellow-300">
                <Clock className="w-4 h-4 mr-1" />
                Pending
              </Badge>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Lead Info */}
          <div className="lg:col-span-1 space-y-6">
            {/* Basic Info Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Lead Information</h3>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <User className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Name</div>
                    <div className="font-medium text-gray-900">{lead.name}</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium text-gray-900">{lead.email}</div>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                  <div>
                    <div className="text-sm text-gray-500">Signed Up</div>
                    <div className="font-medium text-gray-900">
                      {new Date(lead.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </div>
                  </div>
                </div>

                {lead.questionnaireCompleted && lead.completedAt && (
                  <div className="flex items-start space-x-3">
                    <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Completed</div>
                      <div className="font-medium text-gray-900">
                        {new Date(lead.completedAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Purpose Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Use Case</h3>
              <p className="text-gray-700 whitespace-pre-wrap">{lead.purpose}</p>
            </div>

            {/* Metadata Card */}
            {(lead.source || lead.utmSource || lead.ipAddress) && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Metadata</h3>
                <div className="space-y-3">
                  {lead.source && (
                    <div>
                      <div className="text-sm text-gray-500">Source</div>
                      <Badge variant="outline">{lead.source}</Badge>
                    </div>
                  )}

                  {lead.utmSource && (
                    <div>
                      <div className="text-sm text-gray-500">UTM Source</div>
                      <div className="font-medium text-gray-900">{lead.utmSource}</div>
                    </div>
                  )}

                  {lead.utmMedium && (
                    <div>
                      <div className="text-sm text-gray-500">UTM Medium</div>
                      <div className="font-medium text-gray-900">{lead.utmMedium}</div>
                    </div>
                  )}

                  {lead.utmCampaign && (
                    <div>
                      <div className="text-sm text-gray-500">UTM Campaign</div>
                      <div className="font-medium text-gray-900">{lead.utmCampaign}</div>
                    </div>
                  )}

                  {lead.ipAddress && (
                    <div>
                      <div className="text-sm text-gray-500">IP Address</div>
                      <div className="font-mono text-sm text-gray-900">{lead.ipAddress}</div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Questionnaire Responses */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-6">Questionnaire Responses</h3>

              {!lead.questionnaireCompleted ? (
                <div className="text-center py-12">
                  <Clock className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Questionnaire not completed yet</p>
                </div>
              ) : !lead.responses || lead.responses.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-500">No responses recorded</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {lead.responses.map((response, index) => (
                    <div
                      key={response.id}
                      className="border-b border-gray-200 last:border-b-0 pb-6 last:pb-0"
                    >
                      <div className="flex items-start space-x-3 mb-3">
                        <div className="w-8 h-8 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 font-semibold text-sm">
                          {index + 1}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900 mb-2">
                            {response.question.question}
                          </h4>
                          <div className="bg-gray-50 rounded-lg p-4">
                            {Array.isArray(response.answer) ? (
                              <ul className="list-disc list-inside space-y-1">
                                {response.answer.map((item, i) => (
                                  <li key={i} className="text-gray-700">
                                    {String(item)}
                                  </li>
                                ))}
                              </ul>
                            ) : typeof response.answer === 'object' ? (
                              <div className="text-gray-700">
                                {JSON.stringify(response.answer, null, 2)}
                              </div>
                            ) : (
                              <div className="text-gray-700 whitespace-pre-wrap">
                                {String(response.answer)}
                              </div>
                            )}
                          </div>
                          <div className="mt-2">
                            <Badge variant="outline" className="text-xs">
                              {response.question.type}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Page Views */}
            {lead.pageViews && lead.pageViews.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Activity Timeline</h3>
                <div className="space-y-3">
                  {lead.pageViews.map((view) => (
                    <div key={view.id} className="flex items-center space-x-3 text-sm">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-700">{view.path}</span>
                      <span className="text-gray-400">•</span>
                      <span className="text-gray-500">
                        {new Date(view.createdAt).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
