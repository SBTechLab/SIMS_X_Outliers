import { z } from 'zod';

export const createSurvey = z.object({
  leadId: z.string().cuid(),
  technicianId: z.string().cuid(),
  scheduledAt: z.coerce.date(),
});

export const listSurveys = z.object({
  status: z.string().optional(),
  technicianId: z.string().cuid().optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().positive().default(1),
  pageSize: z.coerce.number().int().positive().max(100).default(20),
});

export const surveyReport = z.object({
  roofType: z.enum(['FLAT', 'SLOPED', 'MIXED']),
  shadowFreeAreaSqft: z.coerce.number().int().positive(),
  roofDirection: z.enum(['NORTH', 'SOUTH', 'EAST', 'WEST', 'NORTH_EAST', 'NORTH_WEST', 'SOUTH_EAST', 'SOUTH_WEST']),
  tiltDegrees: z.coerce.number().int().min(0).max(90),
  cableDistanceMeters: z.coerce.number().int().positive(),
  structureHeightFt: z.coerce.number().int().positive(),
  earthingPointAvailable: z.coerce.boolean(),
  recommendedCapacityKw: z.coerce.number().min(0.5).max(10),
  recommendedSystemType: z.enum(['ON_GRID', 'OFF_GRID']),
  notes: z.string().trim().max(1000).optional(),
});

export const approve = z.object({ notes: z.string().trim().max(500).optional() });

export const reject = z.object({
  rejectionReason: z.string().trim().min(3).max(500),
});

export const reschedule = z.object({
  scheduledAt: z.coerce.date(),
  technicianId: z.string().cuid().optional(),
});

export const surveyId = z.object({ id: z.string().cuid() });
