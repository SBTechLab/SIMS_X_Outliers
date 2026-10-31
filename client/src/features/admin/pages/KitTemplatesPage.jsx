import { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus,
  Copy,
  Trash2,
  Package2,
  AlertTriangle,
  CheckCircle2,
  Zap,
  BatteryCharging,
  ArrowRight,
} from 'lucide-react';
import {
  PageHeader,
  Card,
  Button,
  StatusBadge,
  Drawer,
  Input,
  Select,
  Switch,
  Skeleton,
} from '@/components/ui';
import {
  useKitTemplates,
  useKitTemplate,
  useCreateKitTemplate,
  useUpdateKitTemplate,
  useUpdateKitTemplateItems,
} from '../hooks.js';
import { adminApi } from '../api.js';
import { formatINR } from '@/lib/format.js';
import { useQuery } from '@tanstack/react-query';

const templateSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  systemType: z.enum(['ON_GRID', 'OFF_GRID']),
  capacityKw: z.coerce.number().positive('Capacity must be > 0'),
  description: z.string().optional().or(z.literal('')),
  basePrice: z.coerce.number().min(0, 'Base price cannot be negative'),
  isActive: z.boolean().default(true),
});

export function KitTemplatesPage() {
  const { data: templates, isLoading } = useKitTemplates();
  const createMutation = useCreateKitTemplate();
  const updateMutation = useUpdateKitTemplate();
  const updateItemsMutation = useUpdateKitTemplateItems();

  // Products list for BOM picker
  const { data: productsData } = useQuery({
    queryKey: ['products', 'all'],
    queryFn: () => adminApi.getProducts({ pageSize: 100 }),
  });
  const allProducts = productsData?.data || [];

  // Drawer state for header/new
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);

  // BOM editor drawer
  const [bomDrawerOpen, setBomDrawerOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(null);

  // Active template with full items for BOM editor
  const { data: activeTemplateDetail, isLoading: loadingDetail } = useKitTemplate(activeTemplateId);

  // Header form
  const {
    register: registerHeader,
    handleSubmit: handleSubmitHeader,
    reset: resetHeader,
    formState: { errors: headerErrors },
  } = useForm({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      name: '',
      systemType: 'ON_GRID',
      capacityKw: 3,
      description: '',
      basePrice: 165000,
      isActive: true,
    },
  });

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingTemplate(null);
    resetHeader({
      name: '',
      systemType: 'ON_GRID',
      capacityKw: 3,
      description: '',
      basePrice: 165000,
      isActive: true,
    });
    setDrawerOpen(true);
  };

  // Open Edit Header
  const handleOpenEdit = (t) => {
    setEditingTemplate(t);
    resetHeader({
      name: t.name,
      systemType: t.systemType,
      capacityKw: t.capacityKw,
      description: t.description || '',
      basePrice: t.basePrice,
      isActive: t.isActive,
    });
    setDrawerOpen(true);
  };

  // Duplicate template action
  const handleDuplicate = (t) => {
    setEditingTemplate(null);
    resetHeader({
      name: `${t.name} (Copy)`,
      systemType: t.systemType,
      capacityKw: t.capacityKw,
      description: t.description || '',
      basePrice: t.basePrice,
      isActive: true,
    });
    setDrawerOpen(true);
  };

  const onSubmitHeader = (data) => {
    if (editingTemplate) {
      updateMutation.mutate(
        { id: editingTemplate.id, data },
        { onSuccess: () => setDrawerOpen(false) },
      );
    } else {
      createMutation.mutate(data, { onSuccess: () => setDrawerOpen(false) });
    }
  };

  // Open BOM Editor
  const handleOpenBom = (templateId) => {
    setActiveTemplateId(templateId);
    setBomDrawerOpen(true);
  };

  const onToggleActive = (t) => {
    updateMutation.mutate({
      id: t.id,
      data: { isActive: !t.isActive },
    });
  };

  const onGridList = (templates?.data || []).filter((t) => t.systemType === 'ON_GRID');
  const offGridList = (templates?.data || []).filter((t) => t.systemType === 'OFF_GRID');

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kit Templates & Standard Bills of Materials"
        subtitle="Standardised component templates (BR-04) so sales never forgets parts on a quote."
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            New Kit Template
          </Button>
        }
      />

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      ) : (
        <div className="space-y-8">
          {/* On-Grid Templates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-5 h-5 text-sun" />
              <h2 className="text-base font-semibold text-ink">On-Grid Solar Systems</h2>
              <span className="text-xs text-muted">({onGridList.length} packages)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {onGridList.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => handleOpenEdit(t)}
                  onEditBom={() => handleOpenBom(t.id)}
                  onDuplicate={() => handleDuplicate(t)}
                  onToggleActive={() => onToggleActive(t)}
                />
              ))}
            </div>
          </div>

          {/* Off-Grid Templates */}
          <div>
            <div className="flex items-center gap-2 mb-3">
              <BatteryCharging className="w-5 h-5 text-sky" />
              <h2 className="text-base font-semibold text-ink">Off-Grid Battery Systems</h2>
              <span className="text-xs text-muted">({offGridList.length} packages)</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offGridList.map((t) => (
                <TemplateCard
                  key={t.id}
                  template={t}
                  onEdit={() => handleOpenEdit(t)}
                  onEditBom={() => handleOpenBom(t.id)}
                  onDuplicate={() => handleDuplicate(t)}
                  onToggleActive={() => onToggleActive(t)}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Header Drawer */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingTemplate ? `Edit ${editingTemplate.name}` : 'New Kit Template'}
      >
        <form onSubmit={handleSubmitHeader(onSubmitHeader)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Package Name</label>
            <Input
              {...registerHeader('name')}
              placeholder="e.g. 3 kW On-Grid Standard"
              error={headerErrors.name?.message}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-ink mb-1">System Type</label>
              <Select {...registerHeader('systemType')}>
                <option value="ON_GRID">On-Grid</option>
                <option value="OFF_GRID">Off-Grid</option>
              </Select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Capacity (kW)</label>
              <Input
                type="number"
                step="0.5"
                {...registerHeader('capacityKw')}
                error={headerErrors.capacityKw?.message}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Base Price (INR, ex. Tax)</label>
            <Input
              type="number"
              step="1000"
              {...registerHeader('basePrice')}
              error={headerErrors.basePrice?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Description / Notes</label>
            <Input
              {...registerHeader('description')}
              placeholder="e.g. Ideal for 2-3 BHK residential roofs"
            />
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {editingTemplate ? 'Save Details' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* BOM Builder Drawer */}
      {bomDrawerOpen && activeTemplateDetail && (
        <BomEditorDrawer
          open={bomDrawerOpen}
          onClose={() => setBomDrawerOpen(false)}
          template={activeTemplateDetail.data}
          allProducts={allProducts}
          onSave={(items) => {
            updateItemsMutation.mutate(
              { id: activeTemplateDetail.data.id, items },
              { onSuccess: () => setBomDrawerOpen(false) },
            );
          }}
          saving={updateItemsMutation.isPending}
        />
      )}
    </div>
  );
}

function TemplateCard({ template, onEdit, onEditBom, onDuplicate, onToggleActive }) {
  return (
    <Card className="p-4 space-y-3 flex flex-col justify-between hover:border-ink/20 transition-colors">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-semibold text-ink text-sm leading-snug">{template.name}</h3>
            <span className="text-xs text-muted">{template.capacityKw} kW System</span>
          </div>
          <Switch checked={template.isActive} onChange={onToggleActive} />
        </div>

        <div className="flex items-center justify-between text-xs py-1 border-t border-b border-line/40">
          <span className="text-muted">{template.itemCount} components in BOM</span>
          <span className="font-semibold text-ink font-mono">{formatINR(template.basePrice)}</span>
        </div>

        <div className="grid grid-cols-2 gap-2 text-[11px] bg-paper/80 p-2 rounded">
          <div>
            <span className="text-muted block">Material Cost</span>
            <span className="font-mono text-ink font-medium">{formatINR(template.totalCost)}</span>
          </div>
          <div className="text-right">
            <span className="text-muted block">Gross Margin</span>
            <span
              className={`font-mono font-medium ${
                template.marginPercent < 20 ? 'text-alert' : 'text-leaf'
              }`}
            >
              {template.marginPercent}%
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between pt-1 text-xs">
        <Button variant="ghost" size="sm" onClick={onDuplicate} title="Duplicate template">
          <Copy className="w-3.5 h-3.5 mr-1 text-muted" /> Duplicate
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="sm" onClick={onEdit}>
            Edit
          </Button>
          <Button variant="outline" size="sm" onClick={onEditBom}>
            Edit BOM <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BomEditorDrawer({ open, onClose, template, allProducts, onSave, saving }) {
  const [items, setItems] = useState(
    (template.items || []).map((i) => ({
      productId: i.productId,
      quantity: i.quantity,
      notes: i.notes || '',
      product: i.product,
    })),
  );

  const [selectedProductId, setSelectedProductId] = useState('');
  const [addQty, setAddQty] = useState(1);

  // Live calculation
  let totalCost = 0;
  let totalSell = 0;
  let hasBattery = false;
  let hasChargeController = false;

  for (const item of items) {
    const prod = allProducts.find((p) => p.id === item.productId) || item.product;
    if (prod) {
      totalCost += Number(prod.costPrice) * item.quantity;
      totalSell += Number(prod.sellPrice) * item.quantity;
      if (prod.category === 'BATTERY') hasBattery = true;
      if (prod.category === 'CHARGE_CONTROLLER') hasChargeController = true;
    }
  }

  const basePrice = Number(template.basePrice);
  const effectiveSell = basePrice > 0 ? basePrice : totalSell;
  const marginPercent =
    effectiveSell > 0 ? (((effectiveSell - totalCost) / effectiveSell) * 100).toFixed(2) : 0;

  const isOffGrid = template.systemType === 'OFF_GRID';
  const showOffGridWarning = isOffGrid && (!hasBattery || !hasChargeController);

  const handleAddItem = () => {
    if (!selectedProductId) return;
    if (items.some((i) => i.productId === selectedProductId)) return;

    const prod = allProducts.find((p) => p.id === selectedProductId);
    setItems([
      ...items,
      {
        productId: selectedProductId,
        quantity: Math.max(1, addQty),
        notes: '',
        product: prod,
      },
    ]);
    setSelectedProductId('');
    setAddQty(1);
  };

  const handleRemoveItem = (index) => {
    setItems(items.filter((_, idx) => idx !== index));
  };

  const handleUpdateQty = (index, qty) => {
    const newItems = [...items];
    newItems[index].quantity = Math.max(1, parseInt(qty, 10) || 1);
    setItems(newItems);
  };

  const handleUpdateNotes = (index, notes) => {
    const newItems = [...items];
    newItems[index].notes = notes;
    setItems(newItems);
  };

  const handleSave = () => {
    onSave(
      items.map((i) => ({
        productId: i.productId,
        quantity: i.quantity,
        notes: i.notes || null,
      })),
    );
  };

  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={`Bill of Materials: ${template.name}`}
      className="max-w-xl"
    >
      <div className="space-y-5">
        {/* Margin & Cost Summary Card */}
        <div className="p-3.5 bg-paper rounded-lg border border-line space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Target Base Price (Sell):</span>
            <span className="font-mono font-semibold text-ink">{formatINR(basePrice)}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted">Total Component Cost:</span>
            <span className="font-mono font-semibold text-ink">{formatINR(totalCost)}</span>
          </div>
          <div className="flex items-center justify-between text-xs border-t border-line/60 pt-1.5">
            <span className="font-medium text-ink">Gross Margin:</span>
            <span
              className={`font-mono font-bold ${
                marginPercent < 20 ? 'text-alert' : 'text-leaf'
              }`}
            >
              {marginPercent}%
            </span>
          </div>
        </div>

        {/* Off-Grid Warning Alert */}
        {showOffGridWarning && (
          <div className="flex items-start gap-2 p-3 bg-amber-soft/50 border border-sun/40 rounded text-xs text-ink">
            <AlertTriangle className="w-4 h-4 text-sun shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Missing Off-Grid Components:</span>{' '}
              {!hasBattery && !hasChargeController
                ? 'An Off-Grid kit requires both Batteries and a Charge Controller.'
                : !hasBattery
                ? 'Missing Battery component.'
                : 'Missing Charge Controller.'}
            </div>
          </div>
        )}

        {/* Product Adder */}
        <div className="space-y-2 pt-1 border-t border-line">
          <label className="block text-xs font-semibold text-ink">Add Product to BOM</label>
          <div className="flex items-center gap-2">
            <Select
              value={selectedProductId}
              onChange={(e) => setSelectedProductId(e.target.value)}
              className="flex-1 text-xs"
            >
              <option value="">Select a product...</option>
              {allProducts
                .filter((p) => !items.some((i) => i.productId === p.id))
                .map((p) => (
                  <option key={p.id} value={p.id}>
                    [{p.category}] {p.name} ({formatINR(p.costPrice)})
                  </option>
                ))}
            </Select>
            <Input
              type="number"
              min="1"
              value={addQty}
              onChange={(e) => setAddQty(parseInt(e.target.value, 10) || 1)}
              className="w-16 text-xs font-mono"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddItem}
              disabled={!selectedProductId}
            >
              <Plus className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* BOM Items Table */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-ink">
            Components ({items.length})
          </label>
          {items.length === 0 ? (
            <div className="text-center py-8 text-xs text-muted border border-dashed border-line rounded">
              No components added to this kit yet.
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {items.map((item, idx) => {
                const prod = allProducts.find((p) => p.id === item.productId) || item.product;
                const cost = prod ? Number(prod.costPrice) * item.quantity : 0;
                return (
                  <div
                    key={item.productId}
                    className="p-2.5 bg-surface border border-line rounded text-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium text-ink">{prod?.name || item.productId}</div>
                        <div className="text-[11px] text-muted">
                          {prod?.sku} · {prod?.category}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-muted hover:text-alert p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[11px] text-muted">Qty:</span>
                        <Input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleUpdateQty(idx, e.target.value)}
                          className="w-16 h-7 text-xs font-mono"
                        />
                      </div>
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="Notes (optional)"
                          value={item.notes}
                          onChange={(e) => handleUpdateNotes(idx, e.target.value)}
                          className="h-7 text-xs"
                        />
                      </div>
                      <div className="text-right font-mono font-medium text-ink text-[11px]">
                        {formatINR(cost)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="pt-4 flex justify-end gap-2 border-t border-line">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="primary" onClick={handleSave} loading={saving}>
            Save Bill of Materials
          </Button>
        </div>
      </div>
    </Drawer>
  );
}

