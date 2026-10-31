import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { warehouseApi } from './api.js';

export const WH_KEYS = {
  products: ['products'],
  product: (id) => ['products', id],
  inventory: ['inventory'],
  lowStock: ['inventory', 'low-stock'],
  purchases: ['purchases'],
  purchase: (id) => ['purchases', id],
  suppliers: ['suppliers'],
  serials: ['serials'],
  serialByNumber: (sn) => ['serials', 'by-number', sn],
  dispatches: ['dispatches'],
  dispatch: (id) => ['dispatches', id],
  installations: ['installations'],
  installation: (id) => ['installations', id],
};

export function useProducts(params = {}) {
  return useQuery({ queryKey: [...WH_KEYS.products, params], queryFn: () => warehouseApi.getProducts(params) });
}
export function useProduct(id) {
  return useQuery({ queryKey: WH_KEYS.product(id), queryFn: () => warehouseApi.getProduct(id), enabled: !!id });
}
export function useInventory(params = {}) {
  return useQuery({ queryKey: [...WH_KEYS.inventory, params], queryFn: () => warehouseApi.getInventory(params) });
}
export function useLowStock() {
  return useQuery({ queryKey: WH_KEYS.lowStock, queryFn: warehouseApi.getLowStock });
}
export function usePurchases(params = {}) {
  return useQuery({ queryKey: [...WH_KEYS.purchases, params], queryFn: () => warehouseApi.getPurchases(params) });
}
export function usePurchase(id) {
  return useQuery({ queryKey: WH_KEYS.purchase(id), queryFn: () => warehouseApi.getPurchase(id), enabled: !!id });
}
export function useSuppliers() {
  return useQuery({ queryKey: WH_KEYS.suppliers, queryFn: warehouseApi.getSuppliers });
}
export function useSerials(params = {}) {
  return useQuery({ queryKey: [...WH_KEYS.serials, params], queryFn: () => warehouseApi.getSerials(params) });
}
export function useSerialByNumber(sn) {
  return useQuery({ queryKey: WH_KEYS.serialByNumber(sn), queryFn: () => warehouseApi.getSerialByNumber(sn), enabled: !!sn });
}
export function useDispatches(params = {}) {
  return useQuery({ queryKey: [...WH_KEYS.dispatches, params], queryFn: () => warehouseApi.getDispatches(params) });
}
export function useDispatch(id) {
  return useQuery({ queryKey: WH_KEYS.dispatch(id), queryFn: () => warehouseApi.getDispatch(id), enabled: !!id });
}
export function useInstallations(params = {}) {
  return useQuery({ queryKey: [...WH_KEYS.installations, params], queryFn: () => warehouseApi.getInstallations(params) });
}
export function useInstallation(id) {
  return useQuery({ queryKey: WH_KEYS.installation(id), queryFn: () => warehouseApi.getInstallation(id), enabled: !!id });
}

export function useStartPacking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => warehouseApi.startPacking(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: WH_KEYS.dispatch(id) }); toast.success('Packing started'); },
    onError: (e) => toast.error(e.message ?? 'Failed'),
  });
}
export function useScanSerial() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ dispatchId, serialNumber }) => warehouseApi.scanSerial(dispatchId, { serialNumber }),
    onSuccess: (_, { dispatchId }) => { qc.invalidateQueries({ queryKey: WH_KEYS.dispatch(dispatchId) }); toast.success('Serial scanned'); },
    onError: (e) => toast.error(e.message ?? 'Scan failed'),
  });
}
export function useMarkReady() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => warehouseApi.markReady(id),
    onSuccess: (_, id) => { qc.invalidateQueries({ queryKey: WH_KEYS.dispatch(id) }); toast.success('Dispatch marked ready'); },
    onError: (e) => toast.error(e.message ?? 'Failed'),
  });
}
export function useDispatchGoods() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => warehouseApi.dispatchGoods(id, data),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: WH_KEYS.dispatch(id) }); qc.invalidateQueries({ queryKey: WH_KEYS.dispatches }); toast.success('Dispatched'); },
    onError: (e) => toast.error(e.message ?? 'Failed'),
  });
}
export function useRecordDelivery() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => warehouseApi.recordDelivery(id, data),
    onSuccess: (_, { id }) => { qc.invalidateQueries({ queryKey: WH_KEYS.dispatch(id) }); qc.invalidateQueries({ queryKey: WH_KEYS.dispatches }); toast.success('Delivery recorded'); },
    onError: (e) => toast.error(e.message ?? 'Failed'),
  });
}
export function useScheduleInstallation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => warehouseApi.scheduleInstallation(id, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: WH_KEYS.installations }); toast.success('Installation scheduled'); },
    onError: (e) => toast.error(e.message ?? 'Failed to schedule'),
  });
}
