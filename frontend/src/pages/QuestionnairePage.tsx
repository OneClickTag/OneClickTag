import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ArrowLeft, ArrowRight, Loader2, Star } from 'lucide-react';
import { questionnaireService, leadsService } from '@/lib/api/services';
import type { Question } from '@/lib/api/services/questionnaireService';

export function QuestionnairePage() {
  const { leadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

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
      const data = await questionnaireService.getActiveQuestions();
      setQuestions(data);
    } catch (err) {
      console.error('Failed to load questions:', err);
      setError('Failed to load questionnaire. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const currentQuestion = questions[currentStep];
  const progress = questions.length > 0 ? ((currentStep + 1) / questions.length) * 100 : 0;

  const handleAnswer = (value: any) => {
    setAnswers(prev => ({
      ...prev,
      [currentQuestion.id]: value,
    }));
  };

  const handleNext = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleSkip = () => {
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    } else {
      handleSubmit();
    }
  };

  const handleSubmit = async () => {
    if (!leadId) return;

    setSubmitting(true);
    setError(null);

    try {
      // Convert answers to response format
      const responses = Object.entries(answers).map(([questionId, answer]) => ({
        questionId,
        answer,
      }));

      await leadsService.submitQuestionnaire(leadId, { responses });
      navigate('/thank-you');
    } catch (err: any) {
      console.error('Failed to submit questionnaire:', err);
      setError(err.response?.data?.message || 'Failed to submit questionnaire. Please try again.');
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
          <Textarea
            value={value || ''}
            onChange={(e) => handleAnswer(e.target.value)}
            placeholder={currentQuestion.placeholder || 'Your answer...'}
            className="text-lg p-6 min-h-[150px]"
          />
        );

      case 'RADIO':
        return (
          <RadioGroup value={value || ''} onValueChange={handleAnswer}>
            <div className="space-y-3">
              {currentQuestion.options?.map((option) => (
                <div
                  key={option}
                  className="flex items-center space-x-3 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all cursor-pointer"
                  onClick={() => handleAnswer(option)}
                >
                  <RadioGroupItem value={option} id={option} />
                  <Label htmlFor={option} className="flex-1 cursor-pointer text-base">
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'CHECKBOX':
        const selectedOptions = value || [];
        return (
          <div className="space-y-3">
            {currentQuestion.options?.map((option) => (
              <div
                key={option}
                className="flex items-center space-x-3 border-2 border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <Checkbox
                  id={option}
                  checked={selectedOptions.includes(option)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      handleAnswer([...selectedOptions, option]);
                    } else {
                      handleAnswer(selectedOptions.filter((o: string) => o !== option));
                    }
                  }}
                />
                <Label htmlFor={option} className="flex-1 cursor-pointer text-base">
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
              <span>{currentQuestion.options?.[currentQuestion.options.length - 1] || '10'}</span>
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
          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
            className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-8"
          >
            <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-8">
              {currentQuestion?.question}
            </h2>

            <div className="mb-8">
              {renderQuestionInput()}
            </div>

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
                {!currentQuestion?.isRequired && currentStep < questions.length - 1 && (
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
          </motion.div>
        </AnimatePresence>

        {/* Help Text */}
        <div className="text-center text-sm text-gray-500">
          Your responses help us build a better product for you.
        </div>
      </div>
    </div>
  );
}
