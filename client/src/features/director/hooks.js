import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { directorApi } from './api.js';
import { toast } from 'sonner';

export const DIRECTOR_KEYS = {
  overview: (params) => ['director', 'overview', params],
  profitability: (params) => ['director', 'profitability', params],
  projectProfit: (id) => ['director', 'project-profit', id],
  pipeline: () => ['director', 'pipeline'],
  unfinished: () => ['director', 'unfinished'],
  serviceReport: () => ['director', 'service-report'],
  invoices: (params) => ['director', 'invoices', params],
  invoice: (id) => ['director', 'invoice', id],
  subsidies: (params) => ['director', 'subsidies', params],
  subsidy: (id) => ['director', 'subsidy', id],
  expenses: (params) => ['director', 'expenses', params],
  payouts: (params) => ['director', 'payouts', params],
  payout: (id) => ['director', 'payout', id],
  pendingTimeLogs: (params) => ['director', 'pending-time-logs', params],
};

export function useOverview(params) {
  return useQuery({ queryKey: DIRECTOR_KEYS.overview(params), queryFn: () => directorApi.getOverview(params) });
}

export function useProfitability(params) {
  return useQuery({ queryKey: DIRECTOR_KEYS.profitability(params), queryFn: () => directorApi.getProfitability(params) });
}

export function useProjectProfit(id) {
  return useQuery({ queryKey: DIRECTOR_KEYS.projectProfit(id), queryFn: () => directorApi.getProjectProfit(id), enabled: !!id });
}

export function usePipeline() {
  return useQuery({ queryKey: DIRECTOR_KEYS.pipeline(), queryFn: directorApi.getPipeline });
}

export function useUnfinished() {
  return useQuery({ queryKey: DIRECTOR_KEYS.unfinished(), queryFn: directorApi.getUnfinished });
}

export function useServiceReport() {
  return useQuery({ queryKey: DIRECTOR_KEYS.serviceReport(), queryFn: directorApi.getServiceReport });
}

export function useInvoices(params) {
  return useQuery({ queryKey: DIRECTOR_KEYS.invoices(params), queryFn: () => directorApi.getInvoices(params) });
}

export function useInvoice(id) {
  return useQuery({ queryKey: DIRECTOR_KEYS.invoice(id), queryFn: () => directorApi.getInvoice(id), enabled: !!id });
}

export function useUpdateInvoiceStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => directorApi.updateInvoiceStatus(id, status),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['director', 'invoices'] });
      qc.invalidateQueries({ queryKey: ['director', 'invoice'] });
      toast.success('Invoice status updated.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useSubsidies(params) {
  return useQuery({ queryKey: DIRECTOR_KEYS.subsidies(params), queryFn: () => directorApi.getSubsidies(params) });
}

export function useSubsidy(id) {
  return useQuery({ queryKey: DIRECTOR_KEYS.subsidy(id), queryFn: () => directorApi.getSubsidy(id), enabled: !!id });
}

export function useUpdateSubsidy() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => directorApi.updateSubsidy(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['director', 'subsidies'] });
      qc.invalidateQueries({ queryKey: ['director', 'subsidy'] });
      toast.success('Subsidy updated.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useExpenses(params) {
  return useQuery({ queryKey: DIRECTOR_KEYS.expenses(params), queryFn: () => directorApi.getExpenses(params) });
}

export function useCreateExpense() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => directorApi.createExpense(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['director', 'expenses'] });
      toast.success('Expense recorded.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function usePayouts(params) {
  return useQuery({ queryKey: DIRECTOR_KEYS.payouts(params), queryFn: () => directorApi.getPayouts(params) });
}

export function usePayout(id) {
  return useQuery({ queryKey: DIRECTOR_KEYS.payout(id), queryFn: () => directorApi.getPayout(id), enabled: !!id });
}

export function useGeneratePayouts() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => directorApi.generatePayouts(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['director', 'payouts'] });
      toast.success('Payouts generated.');
    },
    onError: (err) => toast.error(err.message),
  });
}

export function useApprovePayout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => directorApi.approvePayout(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['director', 'payouts'] }); toast.success('Payout approved.'); },
    onError: (err) => toast.error(err.message),
  });
}

export function useMarkPayoutPaid() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => directorApi.markPayoutPaid(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['director', 'payouts'] }); toast.success('Payout marked paid.'); },
    onError: (err) => toast.error(err.message),
  });
}

export function usePendingTimeLogs(params) {
  return useQuery({ queryKey: DIRECTOR_KEYS.pendingTimeLogs(params), queryFn: () => directorApi.getPendingTimeLogs(params) });
}

export function useApproveTimeLog() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => directorApi.approveTimeLog(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['director', 'pending-time-logs'] }); toast.success('Time log approved.'); },
    onError: (err) => toast.error(err.message),
  });
}
