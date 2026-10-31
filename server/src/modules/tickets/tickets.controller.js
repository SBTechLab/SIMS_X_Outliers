import { asyncHandler } from '../../core/asyncHandler.js';
import { ok, created } from '../../core/response.js';
import { listTickets, getTicket, createTicket, assignTicket, updateTicketStatus, resolveTicket, confirmTicket, addActivity, addPart } from './tickets.service.js';
import { z } from 'zod';

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  status: z.string().optional(),
  priority: z.string().optional(),
  category: z.string().optional(),
  customerId: z.string().optional(),
  projectId: z.string().optional(),
});

const createSchema = z.object({
  customerId: z.string().min(1),
  projectId: z.string().optional(),
  serialUnitId: z.string().optional(),
  source: z.enum(['PHONE', 'PORTAL', 'WHATSAPP', 'EMAIL']),
  category: z.enum(['NO_POWER', 'LOW_GENERATION', 'INVERTER_FAULT', 'BATTERY_ISSUE', 'PHYSICAL_DAMAGE', 'OTHER']),
  faultCode: z.string().max(50).optional(),
  description: z.string().min(1).max(2000),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
});

const assignSchema = z.object({ technicianId: z.string().min(1) });
const statusSchema = z.object({
  status: z.enum(['IN_PROGRESS', 'AWAITING_PARTS', 'REOPENED']),
  note: z.string().max(500).optional(),
});
const resolveSchema = z.object({ resolutionNote: z.string().min(1).max(2000) });
const confirmSchema = z.object({ confirmationNote: z.string().max(500).optional() });

const activitySchema = z.object({
  type: z.enum(['CALL', 'NOTE', 'STATUS_CHANGE', 'VISIT']),
  message: z.string().min(1).max(2000),
});

const partSchema = z.object({
  productId: z.string().min(1),
  quantity: z.number().min(0.01),
  unitPrice: z.number().min(0),
  unitCost: z.number().min(0),
  oldSerialId: z.string().optional(),
  newSerialId: z.string().optional(),
  labourHours: z.number().min(0).optional(),
});

export const listTicketsHandler = asyncHandler(async (req, res) => {
  const query = listQuery.parse(req.query);
  const { rows, meta } = await listTickets(query, req.user);
  ok(res, rows, meta);
});

export const getTicketHandler = asyncHandler(async (req, res) => {
  const ticket = await getTicket(req.params.id);
  ok(res, ticket);
});

export const createTicketHandler = asyncHandler(async (req, res) => {
  const data = createSchema.parse(req.body);
  const ticket = await createTicket(data, req.user.id);
  created(res, ticket);
});

export const assignTicketHandler = asyncHandler(async (req, res) => {
  const { technicianId } = assignSchema.parse(req.body);
  const ticket = await assignTicket(req.params.id, technicianId, req.user.id);
  ok(res, ticket);
});

export const updateStatusHandler = asyncHandler(async (req, res) => {
  const { status, note } = statusSchema.parse(req.body);
  const ticket = await updateTicketStatus(req.params.id, status, note, req.user.id);
  ok(res, ticket);
});

export const resolveTicketHandler = asyncHandler(async (req, res) => {
  const { resolutionNote } = resolveSchema.parse(req.body);
  const ticket = await resolveTicket(req.params.id, resolutionNote, req.user.id);
  ok(res, ticket);
});

export const confirmTicketHandler = asyncHandler(async (req, res) => {
  const { confirmationNote } = confirmSchema.parse(req.body);
  const ticket = await confirmTicket(req.params.id, confirmationNote, req.user);
  ok(res, ticket);
});

export const addActivityHandler = asyncHandler(async (req, res) => {
  const data = activitySchema.parse(req.body);
  const activity = await addActivity(req.params.id, data, req.user.id);
  created(res, activity);
});

export const addPartHandler = asyncHandler(async (req, res) => {
  const data = partSchema.parse(req.body);
  const part = await addPart(req.params.id, data);
  created(res, part);
});
