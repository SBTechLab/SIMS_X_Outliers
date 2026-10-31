import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Check, Scan } from 'lucide-react';
import { PageHeader, Card, StatusBadge, Button, Skeleton, EmptyState, ErrorState } from '@/components/ui';
import { formatINR, formatDate } from '@/lib/format.js';
import { useDispatch, useStartPacking, useScanSerial, useMarkReady, useDispatchGoods, useRecordDelivery } from '../hooks.js';
import { cn } from '@/lib/cn.js';

function LineRow({ line }) {
  const isSerialized = line.product?.isSerialized;
  const required = parseFloat(line.requiredQty);
  const packed = isSerialized ? parseFloat(line.scannedQty) : parseFloat(line.packedQty);
  const done = packed >= required;

  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-line last:border-0', done && 'opacity-70')}>
      <div>
        <span className="font-medium">{line.product?.name}</span>
        <span className="text-small text-muted ml-2">{isSerialized ? 'Serialized' : 'Bulk'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn('tabular-nums', done ? 'text-leaf font-medium' : 'text-ink')}>
          {packed} / {required}
        </span>
        {done && <Check size={14} className="text-leaf" />}
      </div>
    </div>
  );
}

export function DispatchDetailPage() {
  const { id } = useParams();
  const { data: dispatch, isLoading, isError, error, refetch } = useDispatch(id);
  const startPacking = useStartPacking();
  const scanSerial = useScanSerial();
  const markReady = useMarkReady();
  const dispatchGoods = useDispatchGoods();
  const recordDelivery = useRecordDelivery();

  const [scanInput, setScanInput] = useState('');
  const [vehicleNo, setVehicleNo] = useState('');
  const [driverName, setDriverName] = useState('');

  if (isLoading) return <Skeleton className="h-96 w-full mt-6" />;
  if (isError) return <ErrorState message={error.message} onRetry={refetch} />;

  const d = dispatch ?? {};
  const lines = d.lines ?? [];
  const scannedSerials = d.serialUnits ?? [];
  const project = d.project ?? {};

  const handleScan = () => {
    if (!scanInput.trim()) return;
    scanSerial.mutate({ dispatchId: id, serialNumber: scanInput.trim() }, {
      onSuccess: () => setScanInput(''),
    });
  };

  return (
    <div className="flex flex-col gap-6">
      <Link to="/warehouse/dispatches" className="inline-flex items-center gap-1 text-small text-muted hover:text-ink">
        <ArrowLeft size={14} /> Back to dispatches
      </Link>

      <PageHeader
        breadcrumb={[{ to: '/warehouse', label: 'Warehouse' }, { to: '/warehouse/dispatches', label: 'Dispatches' }, { label: d.number }]}
        title={d.number ?? 'Dispatch'}
        subtitle={`${project.code ?? ''} · ${project.customer?.name ?? ''}`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-4"><p className="text-small text-muted">Status</p><div className="mt-1"><StatusBadge enumName="DispatchStatus" value={d.status} /></div></Card>
        <Card className="p-4"><p className="text-small text-muted">Customer</p><p className="mt-1 font-medium">{project.customer?.name ?? '—'}</p><p className="text-small text-muted">{project.customer?.city}</p></Card>
        <Card className="p-4"><p className="text-small text-muted">Project</p><p className="mt-1 font-mono font-medium">{project.code ?? '—'}</p></Card>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 flex-wrap">
        {d.status === 'PENDING' && (
          <Button onClick={() => startPacking.mutate(id)} loading={startPacking.isPending}>Start packing</Button>
        )}
        {['PACKING'].includes(d.status) && (
          <Button onClick={() => markReady.mutate(id)} loading={markReady.isPending}>Mark ready to ship</Button>
        )}
        {d.status === 'READY' && (
          <div className="flex items-end gap-2 flex-wrap">
            <div>
              <label className="text-small text-muted">Vehicle no.</label>
              <input className="border border-line rounded-md px-3 py-2 text-body block mt-1" value={vehicleNo} onChange={e => setVehicleNo(e.target.value)} placeholder="GJ01AB1234" />
            </div>
            <div>
              <label className="text-small text-muted">Driver name</label>
              <input className="border border-line rounded-md px-3 py-2 text-body block mt-1" value={driverName} onChange={e => setDriverName(e.target.value)} placeholder="Ramesh Kumar" />
            </div>
            <Button
              onClick={() => dispatchGoods.mutate({ id, vehicleNo, driverName })}
              loading={dispatchGoods.isPending}
              disabled={!vehicleNo || !driverName}
            >
              Dispatch
            </Button>
          </div>
        )}
        {d.status === 'DISPATCHED' && (
          <Button onClick={() => recordDelivery.mutate({ id })} loading={recordDelivery.isPending}>Record delivery</Button>
        )}
      </div>

      {/* Pick list */}
      <Card className="p-5">
        <h3 className="font-semibold text-ink mb-3">Pick list ({lines.length} line{lines.length !== 1 ? 's' : ''})</h3>
        {lines.length === 0 ? <EmptyState title="No lines" description="Lines are generated from the dispatch." /> : (
          <div>{lines.map(l => <LineRow key={l.id} line={l} />)}</div>
        )}
      </Card>

      {/* Scan area for packing state */}
      {['PACKING', 'READY'].includes(d.status) && (
        <Card className="p-5">
          <h3 className="font-semibold text-ink mb-3">Scan serialized units</h3>
          <div className="flex gap-2">
            <input
              className="border border-line rounded-md px-3 py-2 text-body flex-1 font-mono"
              value={scanInput}
              onChange={e => setScanInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleScan()}
              placeholder="Scan or type serial number"
              autoFocus
            />
            <Button onClick={handleScan} loading={scanSerial.isPending}>
              <Scan size={16} className="mr-1" /> Scan
            </Button>
          </div>
          <div className="mt-3">
            <p className="text-small text-muted mb-2">Scanned ({scannedSerials.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {scannedSerials.map(s => (
                <span key={s.id} className="font-mono text-small bg-leaf/10 text-leaf px-2 py-0.5 rounded">
                  {s.serialNumber}
                </span>
              ))}
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
