import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { salesApi } from './api.js';

export const SALES_KEYS = {
  leads: ['leads'],
  lead: (id) => ['leads', id],
  surveys: ['surveys'],
  survey: (id) => ['surveys', id],
  quotes: ['quotes'],
  quote: (id) => ['quotes', id],
  projects: ['projects'],
  project: (id) => ['projects', id],
  payments: ['payments'],
  customers: ['customers'],
  customer: (id) => ['customers', id],
  kitTemplates: ['kit-templates'],
  users: ['users'],
};

// ── Leads ────────────────────────────────────────────────────────────────────
export function useLeads(params = {}) {
  return useQuery({ queryKey: [...SALES_KEYS.leads, params], queryFn: () => salesApi.getLeads(params) });
}

export function useLead(id) {
  return useQuery({ queryKey: SALES_KEYS.lead(id), queryFn: () => salesApi.getLead(id), enabled: !!id });
}

export function useCreateLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.createLead,
    onSuccess: () => { qc.invalidateQueries({ queryKey: SALES_KEYS.leads }); toast.success('Lead created'); },
    onError: (e) => toast.error(e.message ?? 'Failed to create lead'),
  });
}

export function useAddActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => salesApi.addActivity(id, data),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: SALES_KEYS.lead(id) }); toast.success('Activity logged'); },
    onError: (e) => toast.error(e.message ?? 'Failed to log activity'),
  });
}

export function useQualifyLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => salesApi.qualifyLead(id, data),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: SALES_KEYS.lead(id) }); qc.invalidateQueries({ queryKey: SALES_KEYS.leads }); toast.success('Lead qualified'); },
    onError: (e) => toast.error(e.message ?? 'Failed to qualify lead'),
  });
}

export function useAssignLead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => salesApi.assignLead(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SALES_KEYS.leads }); toast.success('Lead reassigned'); },
    onError: (e) => toast.error(e.message ?? 'Failed to assign lead'),
  });
}

export function useMarkLeadLost() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => salesApi.markLeadLost(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SALES_KEYS.leads }); toast.success('Lead marked as lost'); },
    onError: (e) => toast.error(e.message ?? 'Failed to update lead'),
  });
}

// ── Surveys ──────────────────────────────────────────────────────────────────
export function useSurveys(params = {}) {
  return useQuery({ queryKey: [...SALES_KEYS.surveys, params], queryFn: () => salesApi.getSurveys(params) });
}

export function useSurvey(id) {
  return useQuery({ queryKey: SALES_KEYS.survey(id), queryFn: () => salesApi.getSurvey(id), enabled: !!id });
}

export function useApproveSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => salesApi.approveSurvey(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SALES_KEYS.surveys }); toast.success('Survey approved'); },
    onError: (e) => toast.error(e.message ?? 'Failed to approve survey'),
  });
}

export function useRejectSurvey() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => salesApi.rejectSurvey(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: SALES_KEYS.surveys }); toast.success('Survey rejected'); },
    onError: (e) => toast.error(e.message ?? 'Failed to reject survey'),
  });
}

// ── Quotes ───────────────────────────────────────────────────────────────────
export function useQuotes(params = {}) {
  return useQuery({ queryKey: [...SALES_KEYS.quotes, params], queryFn: () => salesApi.getQuotes(params) });
}

export function useQuote(id) {
  return useQuery({ queryKey: SALES_KEYS.quote(id), queryFn: () => salesApi.getQuote(id), enabled: !!id });
}

export function useCreateQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.createQuote,
    onSuccess: () => { qc.invalidateQueries({ queryKey: SALES_KEYS.quotes }); toast.success('Quote created'); },
    onError: (e) => toast.error(e.message ?? 'Failed to create quote'),
  });
}

export function useSendQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => salesApi.sendQuote(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: SALES_KEYS.quote(id) }); qc.invalidateQueries({ queryKey: SALES_KEYS.quotes }); toast.success('Quote sent to customer'); },
    onError: (e) => toast.error(e.message ?? 'Failed to send quote'),
  });
}

// ── Projects ─────────────────────────────────────────────────────────────────
export function useProjects(params = {}) {
  return useQuery({ queryKey: [...SALES_KEYS.projects, params], queryFn: () => salesApi.getProjects(params) });
}

export function useProject(id) {
  return useQuery({ queryKey: SALES_KEYS.project(id), queryFn: () => salesApi.getProject(id), enabled: !!id });
}

export function useConfirmProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => salesApi.confirmProject(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: SALES_KEYS.project(id) }); qc.invalidateQueries({ queryKey: SALES_KEYS.projects }); toast.success('Project confirmed'); },
    onError: (e) => toast.error(e.message ?? 'Failed to confirm project'),
  });
}

// ── Payments ──────────────────────────────────────────────────────────────────
export function useRecordPayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salesApi.recordPayment,
    onSuccess: () => { qc.invalidateQueries({ queryKey: SALES_KEYS.payments }); qc.invalidateQueries({ queryKey: SALES_KEYS.projects }); toast.success('Payment recorded'); },
    onError: (e) => toast.error(e.message ?? 'Failed to record payment'),
  });
}

// ── Customers ─────────────────────────────────────────────────────────────────
export function useCustomers(params = {}) {
  return useQuery({ queryKey: [...SALES_KEYS.customers, params], queryFn: () => salesApi.getCustomers(params) });
}

// ── Shared ────────────────────────────────────────────────────────────────────
export function useKitTemplates() {
  return useQuery({ queryKey: SALES_KEYS.kitTemplates, queryFn: () => salesApi.getKitTemplates({}) });
}

export function useSalesExecutives() {
  return useQuery({
    queryKey: [...SALES_KEYS.users, 'sales-exec'],
    queryFn: () => salesApi.getUsers({ role: 'SALES_EXECUTIVE', isActive: true }),
  });
}
