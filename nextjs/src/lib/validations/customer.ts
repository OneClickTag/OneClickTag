import { z } from 'zod';

export const createCustomerSchema = z.object({
  email: z.string().email('Invalid email address'),
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  company: z.string().max(200).optional(),
  phone: z.string().max(50).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).optional(),
});

export const updateCustomerSchema = z.object({
  email: z.string().email('Invalid email address').optional(),
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  company: z.string().max(200).nullable().optional(),
  phone: z.string().max(50).nullable().optional(),
  status: z.enum(['ACTIVE', 'INACTIVE', 'SUSPENDED', 'ARCHIVED']).optional(),
  tags: z.array(z.string()).optional(),
  notes: z.string().max(5000).nullable().optional(),
  trackingSettings: z.record(z.unknown()).nullable().optional(),
});

export type CreateCustomerInput = z.infer<typeof createCustomerSchema>;
export type UpdateCustomerInput = z.infer<typeof updateCustomerSchema>;
