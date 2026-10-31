import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { adminApi } from './api.js';

export const ADMIN_KEYS = {
  users: ['admin', 'users'],
  settings: ['admin', 'settings'],
  kitTemplates: ['admin', 'kit-templates'],
  kitTemplate: (id) => ['admin', 'kit-templates', id],
  auditLogs: ['admin', 'audit-logs'],
  products: ['products'],
};

// Users
export function useUsers(params = {}) {
  return useQuery({
    queryKey: [...ADMIN_KEYS.users, params],
    queryFn: () => adminApi.getUsers(params),
  });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createUser,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users });
      toast.success('User account created successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create user');
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateUser(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users });
      toast.success('User updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update user');
    },
  });
}

export function useUpdateUserStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, isActive }) => adminApi.updateUserStatus(id, isActive),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.users });
      toast.success(vars.isActive ? 'User activated' : 'User deactivated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update user status');
    },
  });
}

export function useResetPassword() {
  return useMutation({
    mutationFn: ({ id, newPassword }) => adminApi.resetPassword(id, newPassword),
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to reset password');
    },
  });
}

// Settings
export function useSettings() {
  return useQuery({
    queryKey: ADMIN_KEYS.settings,
    queryFn: adminApi.getSettings,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.updateSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.settings });
      toast.success('Settings updated successfully');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update settings');
    },
  });
}

// Kit Templates
export function useKitTemplates(params = {}) {
  return useQuery({
    queryKey: [...ADMIN_KEYS.kitTemplates, params],
    queryFn: () => adminApi.getKitTemplates(params),
  });
}

export function useKitTemplate(id) {
  return useQuery({
    queryKey: ADMIN_KEYS.kitTemplate(id),
    queryFn: () => adminApi.getKitTemplate(id),
    enabled: Boolean(id),
  });
}

export function useCreateKitTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: adminApi.createKitTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.kitTemplates });
      toast.success('Kit template created');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to create template');
    },
  });
}

export function useUpdateKitTemplate() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => adminApi.updateKitTemplate(id, data),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.kitTemplates });
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.kitTemplate(vars.id) });
      toast.success('Kit template updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update template');
    },
  });
}

export function useUpdateKitTemplateItems() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, items }) => adminApi.updateKitTemplateItems(id, items),
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.kitTemplates });
      queryClient.invalidateQueries({ queryKey: ADMIN_KEYS.kitTemplate(vars.id) });
      toast.success('Bill of Materials updated');
    },
    onError: (err) => {
      toast.error(err.response?.data?.error?.message || 'Failed to update BOM items');
    },
  });
}

// Audit Logs
export function useAuditLogs(params = {}) {
  return useQuery({
    queryKey: [...ADMIN_KEYS.auditLogs, params],
    queryFn: () => adminApi.getAuditLogs(params),
  });
}

