import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { installationApi } from './api.js';

export const INST_KEYS = {
  installations: (params) => ['installations', params],
  installation: (id) => ['installations', id],
  myTickets: (params) => ['tickets', 'mine', params],
  ticket: (id) => ['tickets', id],
};

export function useMyInstallations(params) {
  return useQuery({
    queryKey: INST_KEYS.installations(params),
    queryFn: () => installationApi.getInstallations(params),
  });
}

export function useInstallation(id) {
  return useQuery({
    queryKey: INST_KEYS.installation(id),
    queryFn: () => installationApi.getInstallation(id),
    enabled: !!id,
  });
}

export function useMyTickets(params) {
  return useQuery({
    queryKey: INST_KEYS.myTickets(params),
    queryFn: () => installationApi.getMyTickets(params),
  });
}

export function useStartInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => installationApi.startInstallation(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installations'] }),
  });
}

export function useCompleteInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => installationApi.completeInstallation(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['installations'] }),
  });
}

export function useAddTicketActivity() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => installationApi.addActivity(id, data),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: INST_KEYS.ticket(id) }),
  });
}

export function useResolveTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, resolutionNote }) => installationApi.resolveTicket(id, { resolutionNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tickets'] }),
  });
}
