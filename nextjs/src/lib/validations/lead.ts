import { z } from 'zod';

export const createLeadSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  email: z.string().email('Invalid email address'),
  purpose: z.string().min(1, 'Purpose is required').max(2000),
  source: z.string().optional(),
  utmSource: z.string().optional(),
  utmMedium: z.string().optional(),
  utmCampaign: z.string().optional(),
});

export const questionnaireResponseSchema = z.object({
  questionId: z.string().min(1),
  answer: z.union([
    z.string(),
    z.number(),
    z.array(z.string()),
  ]),
});

export const submitResponsesSchema = z.object({
  responses: z.array(questionnaireResponseSchema),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type SubmitResponsesInput = z.infer<typeof submitResponsesSchema>;
