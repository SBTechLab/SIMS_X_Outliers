import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supportApi } from './api.js';

export const SUP_KEYS = {
  dashboard: ['support', 'dashboard'],
  lookup: (q) => ['support', 'lookup', q],
  customer360: (id) => ['support', 'customer360', id],
  warranty: (sn) => ['support', 'warranty', sn],
  tickets: (params) => ['tickets', params],
  ticket: (id) => ['tickets', id],
  warranties: (params) => ['warranties', params],
};

export function useSupportDashboard() {
  return useQuery({ queryKey: SUP_KEYS.dashboard, queryFn: () => supportApi.getDashboard() });
}

export function useLookup(q) {
  return useQuery({
    queryKey: SUP_KEYS.lookup(q),
    queryFn: () => supportApi.lookup(q),
    enabled: q?.length >= 2,
  });
}

export function useCustomer360(customerId) {
  return useQuery({
    queryKey: SUP_KEYS.customer360(customerId),
    queryFn: () => supportApi.getCustomer360(customerId),
    enabled: !!customerId,
  });
}

export function useWarrantyCheck(serialNumber) {
  return useQuery({
    queryKey: SUP_KEYS.warranty(serialNumber),
    queryFn: () => supportApi.checkWarranty(serialNumber),
    enabled: !!serialNumber,
  });
}

export function useTickets(params) {
  return useQuery({ queryKey: SUP_KEYS.tickets(params), queryFn: () => supportApi.getTickets(params) });
}

export function useTicket(id) {
  return useQuery({ queryKey: SUP_KEYS.ticket(id), queryFn: () => supportApi.getTicket(id), enabled: !!id });
}

export function useWarranties(params) {
  return useQuery({ queryKey: SUP_KEYS.warranties(params), queryFn: () => supportApi.getWarranties(params) });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data) => supportApi.createTicket(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}

export function useAssignTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, technicianId }) => supportApi.assignTicket(id, { technicianId }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: SUP_KEYS.ticket(id) });
    },
  });
}

export function useResolveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionNote }) => supportApi.resolveTicket(id, { resolutionNote }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: SUP_KEYS.ticket(id) });
    },
  });
}

export function useConfirmTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, confirmationNote }) => supportApi.confirmTicket(id, { confirmationNote }),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['tickets'] });
      qc.invalidateQueries({ queryKey: SUP_KEYS.ticket(id) });
    },
  });
}

export function useAddActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => supportApi.addActivity(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: SUP_KEYS.ticket(id) }),
  });
}
