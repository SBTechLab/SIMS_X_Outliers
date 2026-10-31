import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { portalApi } from './api.js';

const PORTAL_KEYS = {
  overview: ['portal-overview'],
  projects: ['portal-projects'],
  quotes: ['portal-quotes'],
  invoices: ['portal-invoices'],
  payments: ['portal-payments'],
  systems: ['portal-systems'],
  myTickets: (params) => ['portal-tickets', params],
};

export function usePortalOverview() {
  return useQuery({ queryKey: PORTAL_KEYS.overview, queryFn: portalApi.getOverview });
}

export function useMyProjects() {
  return useQuery({ queryKey: PORTAL_KEYS.projects, queryFn: portalApi.getProjects });
}

export function useMyQuotes() {
  return useQuery({ queryKey: PORTAL_KEYS.quotes, queryFn: portalApi.getQuotes });
}

export function useMyInvoices() {
  return useQuery({ queryKey: PORTAL_KEYS.invoices, queryFn: portalApi.getInvoices });
}

export function useMyPayments() {
  return useQuery({ queryKey: PORTAL_KEYS.payments, queryFn: portalApi.getPayments });
}

export function useAcceptQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => portalApi.acceptQuote(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PORTAL_KEYS.quotes }); toast.success('Quote accepted. Your project is now in progress.'); },
    onError: (e) => toast.error(e.message ?? 'Failed to accept quote'),
  });
}

export function useRejectQuote() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => portalApi.rejectQuote(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: PORTAL_KEYS.quotes }); toast.success('Quote declined.'); },
    onError: (e) => toast.error(e.message ?? 'Failed to reject quote'),
  });
}

export function useMySystems() {
  return useQuery({ queryKey: PORTAL_KEYS.systems, queryFn: portalApi.getSystems });
}

export function useMyTickets(params) {
  return useQuery({ queryKey: PORTAL_KEYS.myTickets(params), queryFn: () => portalApi.getMyTickets(params) });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => portalApi.createTicket(data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-tickets'] }); toast.success('Service request raised.'); },
    onError: (e) => toast.error(e.message ?? 'Failed to raise ticket'),
  });
}

export function useConfirmTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmationNote }) => portalApi.confirmTicket(id, { confirmationNote }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['portal-tickets'] }); toast.success('Resolution confirmed. Ticket closed.'); },
    onError: (e) => toast.error(e.message ?? 'Failed to confirm resolution'),
  });
}
