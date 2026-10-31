import { useState } from 'react';
import { Download, Package, Plus, Printer, Trash2, Wrench } from 'lucide-react';
import {
  Avatar,
  Button,
  Card,
  Checkbox,
  ConfirmDialog,
  DataTable,
  DateInput,
  Drawer,
  EmptyState,
  ErrorState,
  FileDropzone,
  FilterBar,
  IconButton,
  Input,
  Modal,
  PageHeader,
  Pagination,
  Radio,
  RadioGroup,
  SearchInput,
  Select,
  Skeleton,
  Spinner,
  StatCard,
  StatusBadge,
  Stepper,
  Switch,
  Tab,
  TabList,
  TabPanel,
  Tabs,
  Textarea,
  Timeline,
  stepsForProjectStatus,
} from '@/components/ui';
import { toast } from 'sonner';

/**
 * A living style guide for every component in the kit.
 *
 * Why this exists: three developers must not reinvent any of these; this page is the proof
 * that they do not need to. SUPER_ADMIN only.
 */
export function UiGalleryPage() {
  const [tab, setTab] = useState('buttons');
  const [modalOpen, setModalOpen] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [switchOn, setSwitchOn] = useState(true);
  const [checked, setChecked] = useState(true);
  const [radio, setRadio] = useState('on-grid');
  const [files, setFiles] = useState([]);
  const [page, setPage] = useState(1);

  const rows = [
    { id: '1', code: 'PRJ-2026-0007', customer: 'Vipul Mehta', status: 'INSTALLED', amount: '149075.00' },
    { id: '2', code: 'PRJ-2026-0008', customer: 'Iqbal Hussain', status: 'CONFIRMED', amount: '83200.00' },
    { id: '3', code: 'PRJ-2026-0009', customer: 'Rohini Deshpande', status: 'CONFIRMED', amount: '192500.00' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Developer' }, { label: 'UI kit' }]}
        title="UI kit"
        subtitle="Every component in the system, with its states. Super admin only."
      />

      <Tabs value={tab} onChange={setTab}>
        <TabList>
          <Tab value="buttons">Buttons</Tab>
          <Tab value="forms">Form controls</Tab>
          <Tab value="data">Data</Tab>
          <Tab value="overlays">Overlays</Tab>
          <Tab value="feedback">Feedback</Tab>
        </TabList>

        <TabPanel value="buttons">
          <Card title="Button" description="One primary per action group. `sun` carries ink text.">
            <div className="flex flex-wrap gap-3">
              <Button>Primary</Button>
              <Button variant="secondary">Secondary</Button>
              <Button variant="outline">Outline</Button>
              <Button variant="ghost">Ghost</Button>
              <Button variant="danger" leadingIcon={Trash2}>Danger</Button>
              <Button variant="link">Link</Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button size="sm">Small</Button>
              <Button size="md">Medium</Button>
              <Button size="lg">Large</Button>
            </div>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button leadingIcon={Plus}>With leading</Button>
              <Button trailingIcon={Download}>With trailing</Button>
              <Button loading>Loading</Button>
              <Button disabled>Disabled</Button>
            </div>
          </Card>

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <Card title="Icon button">
              <div className="flex items-center gap-3">
                <IconButton icon={Printer} label="Print" />
                <IconButton icon={Printer} label="Print" variant="outline" />
                <IconButton icon={Wrench} label="Settings" size="lg" />
              </div>
            </Card>
            <Card title="Spinner">
              <div className="flex items-center gap-4 text-ink">
                <Spinner />
                <Spinner size={24} />
              </div>
            </Card>
          </div>
        </TabPanel>

        <TabPanel value="forms">
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Input, select, date">
              <div className="flex flex-col gap-4">
                <Input label="Customer name" required placeholder="Vipul Mehta" />
                <Input label="Amount" money prefix="₹" placeholder="150000.00" />
                <Input label="Email" type="email" error="Enter a valid email address." />
                <Select label="System type" options={[{ value: 'ON_GRID', label: 'On-Grid' }, { value: 'OFF_GRID', label: 'Off-Grid' }]} />
                <DateInput label="Scheduled on" />
              </div>
            </Card>
            <Card title="Choice controls">
              <div className="flex flex-col gap-4">
                <Textarea label="Notes" rows={3} maxLength={200} />
                <Checkbox label="Wants the PM Surya Ghar subsidy" checked={checked} onChange={(e) => setChecked(e.target.checked)} />
                <RadioGroup
                  label="System type"
                  name="systype"
                  value={radio}
                  onChange={setRadio}
                  options={[{ value: 'on-grid', label: 'On-Grid' }, { value: 'off-grid', label: 'Off-Grid' }]}
                />
                <Switch label="Notify the installation crew" hint="Sends a bell notification on save." checked={switchOn} onChange={setSwitchOn} />
              </div>
            </Card>
          </div>

          <Card className="mt-6" title="File dropzone">
            <FileDropzone files={files} onAdd={(fs) => setFiles((prev) => [...prev, ...fs])} onRemove={(_f, i) => setFiles((prev) => prev.filter((_, j) => j !== i))} />
          </Card>
        </TabPanel>

        <TabPanel value="data">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Revenue this month" value="₹8.4L" delta={12.4} deltaLabel="vs last month" />
            <StatCard label="Projects installed" value="7" delta={-5.0} deltaLabel="vs last month" />
            <StatCard label="Pipeline value" value="₹14.2L" delta={0} deltaLabel="vs last month" />
            <StatCard label="Open tickets" value="3" delta={-25.0} deltaLabel="vs last week" />
          </div>

          <Card className="mt-6" title="Data table" padded={false}>
            <DataTable
              columns={[
                { key: 'code', label: 'Project', primary: true, render: (r) => <span className="font-mono text-ink">{r.code}</span> },
                { key: 'customer', label: 'Customer' },
                { key: 'status', label: 'Status', render: (r) => <StatusBadge enumName="ProjectStatus" value={r.status} /> },
                { key: 'amount', label: 'Amount', align: 'right', numeric: true, render: (r) => `₹${Number(r.amount).toLocaleString('en-IN')}` },
              ]}
              rows={rows}
              onRowClick={() => toast.success('Row click wired')}
            />
            <Pagination page={page} pageSize={20} total={128} onPageChange={setPage} />
          </Card>

          <Card className="mt-6" title="Status badges">
            <div className="flex flex-wrap gap-2">
              {['AWAITING_ADVANCE', 'CONFIRMED', 'PACKING', 'DISPATCHED', 'DELIVERED', 'INSTALLING', 'INSTALLED', 'CLOSED', 'CANCELLED'].map((s) => (
                <StatusBadge key={s} enumName="ProjectStatus" value={s} />
              ))}
            </div>
          </Card>

          <Card className="mt-6" title="Stepper">
            <Stepper steps={stepsForProjectStatus('DISPATCHED')} />
          </Card>

          <Card className="mt-6" title="Timeline">
            <Timeline
              items={[
                { at: new Date(Date.now() - 86400000 * 3).toISOString(), title: 'Order confirmed', actor: 'Priya Desai', state: 'done' },
                { at: new Date(Date.now() - 86400000 * 2).toISOString(), title: 'Dispatched', actor: 'Jignesh Patel', detail: 'TS 09 UB 4412 · Mallesh Goud', state: 'done' },
                { at: new Date().toISOString(), title: 'Delivered', state: 'current' },
                { at: null, title: 'Installation', state: 'pending' },
              ]}
            />
          </Card>
        </TabPanel>

        <TabPanel value="overlays">
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setModalOpen(true)}>Open modal</Button>
            <Button variant="outline" onClick={() => setDrawerOpen(true)}>Open drawer</Button>
            <Button variant="danger" onClick={() => setConfirmOpen(true)}>Confirm</Button>
          </div>

          <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Record payment" description="Money is recorded, not processed." footer={<><Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => setModalOpen(false)}>Save</Button></>}>
            <div className="flex flex-col gap-3">
              <Input label="Amount" money prefix="₹" />
              <Select label="Mode" options={[{ value: 'UPI', label: 'UPI' }, { value: 'BANK_TRANSFER', label: 'Bank transfer' }]} />
            </div>
          </Modal>

          <Drawer open={drawerOpen} onClose={() => setDrawerOpen(false)} title="Project PRJ-2026-0007" subtitle="Vipul Mehta · 3 kW On-Grid" footer={<Button variant="outline" onClick={() => setDrawerOpen(false)}>Close</Button>}>
            <div className="flex flex-col gap-3 text-body text-ink">
              <p className="text-small text-muted">A drawer carries detail without hiding the list behind it.</p>
              <Avatar name="Vipul Mehta" size="lg" />
            </div>
          </Drawer>

          <ConfirmDialog
            open={confirmOpen}
            onClose={() => setConfirmOpen(false)}
            onConfirm={() => {
              setConfirmOpen(false);
              toast.success('Confirmed');
            }}
            title="Cancel project PRJ-2026-0012?"
            message="Reserved stock returns to inventory and the installation job is removed. This cannot be undone."
            confirmLabel="Cancel project"
            variant="danger"
          />
        </TabPanel>

        <TabPanel value="feedback">
          <div className="grid gap-6 md:grid-cols-2">
            <Card title="Skeleton loaders">
              <Skeleton rows={3} />
              <div className="mt-4">
                <Skeleton variant="table" rows={3} />
              </div>
            </Card>
            <Card title="Empty state">
              <EmptyState
                icon={Package}
                title="No dispatches ready to pack"
                description="Pick lists appear here as soon as an order is confirmed."
                action={<Button>Confirm an order</Button>}
              />
            </Card>
            <Card title="Error state">
              <ErrorState title="Could not load dispatches" message="The server did not reply in time. Check the server is running on port 5000." onRetry={() => toast('Retrying...')} />
            </Card>
            <Card title="Search and filters">
              <SearchInput placeholder="Search by name, phone, serial or project code" onChange={() => {}} />
              <div className="mt-3">
                <FilterBar active={2} onClear={() => toast('Filters cleared')}>
                  <Select label="Status" options={[{ value: '', label: 'Any' }]} />
                  <DateInput label="From" />
                </FilterBar>
              </div>
            </Card>
          </div>

          <Card className="mt-6" title="Toasts">
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={() => toast.success('Order confirmed.')}>Success</Button>
              <Button variant="outline" onClick={() => toast.error('Serial INV-SG5K-2024-00318 is already on project PRJ-2026-0003.')}>Error</Button>
              <Button variant="outline" onClick={() => toast('Dispatch moved to packing.')}>Default</Button>
            </div>
          </Card>
        </TabPanel>
      </Tabs>
    </div>
  );
}
