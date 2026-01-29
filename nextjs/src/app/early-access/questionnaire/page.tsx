'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, ArrowRight, Loader2, Star } from 'lucide-react';

interface Question {
  id: string;
  question: string;
  type: 'TEXT' | 'TEXTAREA' | 'RADIO' | 'CHECKBOX' | 'RATING' | 'SCALE';
  options?: string[];
  placeholder?: string;
  isRequired: boolean;
}

function QuestionnaireContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const leadId = searchParams.get('leadId');

  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadQuestions();
  }, []);

  const loadQuestions = async () => {
    try {
      const response = await fetch('/api/public/questionnaire');
      if (response.ok) {
        const data = await response.json();
        setQuestions(data);
      } else {
        // Use default questions if API fails
        setQuestions([
          {
            id: 'q1',
            question: 'What best describes your role?',
            type: 'RADIO',
            options: [
              'Marketing Manager',
              'Agency Owner',
              'Freelancer',
              'Business Owner',
              'Developer',
              'Other',
            ],
            isRequired: true,
          },
          {
            id: 'q2',
            question: 'How many websites do you manage tracking for?',
            type: 'RADIO',
            options: ['1-5', '6-20', '21-50', '50+'],
            isRequired: true,
          },
          {
            id: 'q3',
            question: 'What is your biggest challenge with tracking setup?',
            type: 'TEXTAREA',
            placeholder: 'Tell us about your pain points...',
            isRequired: false,
          },
          {
            id: 'q4',
            question: 'How would you rate your GTM expertise?',
            type: 'RATING',
            isRequired: true,
          },
        ]);
      }
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError('Failed to load questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentStep];
  const progress =
    questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

  const handleAnswer = (value: any) => {
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!leadId) {
      router.push('/early-access');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      const response = await fetch(`/api/public/leads/${leadId}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ responses }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit questionnaire');
      }

      router.push('/thank-you');
    } catch (err: any) {
      console.error('Failed to submit questionnaire:', err);
      setError('Failed to submit questionnaire. Please try again.');
      setSubmitting(false);
    }
  };

  const renderQuestionInput = () => {
    if (!currentQuestion) return null;

    const value = answers[currentQuestion.id];

    switch (currentQuestion.type) {
      case 'TEXT':
        return (
          <Input
            value={value || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder || 'Your answer...'}
            className="text-lg p-6"
          />
        );

      case 'TEXTAREA':
        return (
          <textarea
            value={value || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder || 'Your answer...'}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none text-lg min-h-[150px]"
          />
        );

      case 'RADIO':
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option) => (
              <div
                key={option}
                className={`flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  value === option
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
                onClick={() => handleAnswer(option)}
              >
                <div
                  className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    value === option ? 'border-blue-500' : 'border-gray-300'
                  }`}
                >
                  {value === option && (
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                  )}
                </div>
                <Label className="flex-1 cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'CHECKBOX':
        const selectedOptions = value || [];
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option) => (
              <div
                key={option}
                className={`flex items-center space-x-3 border-2 rounded-lg p-4 cursor-pointer transition-all ${
                  selectedOptions.includes(option)
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-blue-300 hover:bg-blue-50/50'
                }`}
                onClick={() => {
                  if (selectedOptions.includes(option)) {
                    handleAnswer(
                      selectedOptions.filter((o: string) => o !== option)
                    );
                  } else {
                    handleAnswer([...selectedOptions, option]);
                  }
                }}
              >
                <div
                  className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedOptions.includes(option)
                      ? 'border-blue-500 bg-blue-500'
                      : 'border-gray-300'
                  }`}
                >
                  {selectedOptions.includes(option) && (
                    <svg
                      className="w-3 h-3 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={3}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  )}
                </div>
                <Label className="flex-1 cursor-pointer text-base">
                  {option}
                </Label>
              </div>
            ))}
          </div>
        );

      case 'RATING':
        return (
          <div className="flex justify-center space-x-2">
            {[1, 2, 3, 4, 5].map((rating) => (
              <button
                key={rating}
                type="button"
                onClick={() => handleAnswer(rating)}
                className="focus:outline-none transition-transform hover:scale-110"
              >
                <Star
                  className={`w-12 h-12 ${
                    value && value >= rating
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
        );

      case 'SCALE':
        return (
          <div className="space-y-4">
            <div className="flex justify-between text-sm text-gray-500">
              <span>{currentQuestion.options?.[0] || '1'}</span>
              <span>
                {currentQuestion.options?.[
                  currentQuestion.options.length - 1
                ] || '10'}
              </span>
            </div>
            <input
              type="range"
              min="1"
              max={currentQuestion.options?.length || 10}
              value={value || 1}
              onChange={(e) => handleAnswer(parseInt(e.target.value))}
              className="w-full h-3 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="text-center text-3xl font-bold text-blue-600">
              {value || 1}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    if (!currentQuestion) return false;
    if (!currentQuestion.isRequired) return true;

    const value = answers[currentQuestion.id];
    if (currentQuestion.type === 'CHECKBOX') {
      return Array.isArray(value) && value.length > 0;
    }
    return value !== undefined && value !== '' && value !== null;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error && questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Oops!</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 py-12 px-4">
      <div className="max-w-3xl mx-auto">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">
              Question {currentStep + 1} of {questions.length}
            </span>
            <span className="text-sm font-medium text-blue-600">
              {Math.round(progress)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Question Card */}
        <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
            {currentQuestion?.question}
          </h2>

          <div className="mb-8">{renderQuestionInput()}</div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex items-center justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={handlePrev}
              disabled={currentStep === 0 || submitting}
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Previous
            </Button>

            <div className="flex items-center space-x-3">
              {!currentQuestion?.isRequired &&
                currentStep < questions.length - 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={handleSkip}
                    disabled={submitting}
                  >
                    Skip
                  </Button>
                )}

              <Button
                type="button"
                onClick={handleNext}
                disabled={!canProceed() || submitting}
                className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : currentStep === questions.length - 1 ? (
                  'Submit'
                ) : (
                  <>
                    Next
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          Your responses help us build a better product for you.
        </div>
      </div>
    </div>
  );
}

export default function QuestionnairePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600" />
        </div>
      }
    >
      <QuestionnaireContent />
    </Suspense>
  );
}
