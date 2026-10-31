import { asyncHandler } from '../../core/asyncHandler.js';
import { ok } from '../../core/response.js';
import { listInstallations, getInstallation, getInstallationByProject, scheduleInstallation, startInstallation, completeInstallation } from './installations.service.js';
import { z } from 'zod';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
});

const scheduleSchema = z.object({
  scheduledDate: z.string(),
  crew: z.array(z.object({
    technicianId: z.string().min(1),
    isLead: z.boolean().default(false),
  })).min(1),
});

const completeSchema = z.object({
  confirmedCapacityKw: z.number().min(0),
  generationTestKw: z.number().min(0).optional(),
  checklist: z.record(z.unknown()).optional(),
  customerSignatureUrl: z.string().url().optional(),
  signedByName: z.string().max(100).optional(),
  remarks: z.string().max(2000).optional(),
});

export const listInstallationsHandler = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  const { rows, meta } = await listInstallations(query, req.user);
  ok(res, rows, meta);
});

export const getInstallationHandler = asyncHandler(async (req, res) => {
  const job = await getInstallation(req.params.id);
  ok(res, job);
});

export const getByProjectHandler = asyncHandler(async (req, res) => {
  const job = await getInstallationByProject(req.params.projectId);
  ok(res, job);
});

export const scheduleHandler = asyncHandler(async (req, res) => {
  const data = scheduleSchema.parse(req.body);
  const job = await scheduleInstallation(req.params.id, data, req.user.id);
  ok(res, job);
});

export const startHandler = asyncHandler(async (req, res) => {
  const job = await startInstallation(req.params.id, req.user);
  ok(res, job);
});

export const completeHandler = asyncHandler(async (req, res) => {
  const data = completeSchema.parse(req.body);
  const job = await completeInstallation(req.params.id, data, req.user);
  ok(res, job);
});
