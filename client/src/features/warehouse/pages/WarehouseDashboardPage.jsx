import { Link } from 'react-router-dom';
import { Package2, Boxes, Truck, CalendarDays, AlertTriangle } from 'lucide-react';
import { PageHeader, Card, Skeleton, ErrorState } from '@/components/ui';
import { useLowStock, useDispatches, useInstallations } from '../hooks.js';

function StatCard({ title, value, link, icon: Icon, warn }) {
  return (
    <Link to={link} className="block">
      <Card className="p-5 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-small text-muted mb-1">{title}</p>
            <p className={`text-3xl font-bold tabular-nums ${warn ? 'text-alert' : 'text-ink'}`}>{value}</p>
          </div>
          <Icon size={20} className="text-muted mt-1" />
        </div>
      </Card>
    </Link>
  );
}

export function WarehouseDashboardPage() {
  const lowStock = useLowStock();
  const dispatches = useDispatches({ status: 'PENDING', pageSize: 100 });
  const installs = useInstallations({ status: 'SCHEDULED', pageSize: 100 });

  const isLoading = lowStock.isLoading || dispatches.isLoading || installs.isLoading;

  if (isLoading) return <Skeleton className="h-64 w-full mt-6" />;

  const pendingDispatches = Array.isArray(dispatches.data) ? dispatches.data.length : 0;
  const scheduledJobs = Array.isArray(installs.data) ? installs.data.length : 0;
  const lowStockCount = Array.isArray(lowStock.data) ? lowStock.data.length : 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        breadcrumb={[{ label: 'Warehouse' }]}
        title="Warehouse"
        subtitle="Dispatches to pack, low stock alerts, and installation schedule."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Pending dispatches" value={pendingDispatches} link="/warehouse/dispatches" icon={Truck} />
        <StatCard title="Scheduled installs" value={scheduledJobs} link="/warehouse/installations" icon={CalendarDays} />
        <StatCard title="Low stock items" value={lowStockCount} link="/warehouse/inventory" icon={Boxes} warn={lowStockCount > 0} />
        <StatCard title="Products" value="Catalogue" link="/warehouse/products" icon={Package2} />
      </div>

      {lowStockCount > 0 && (
        <Card className="p-5 border-alert/30">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={16} className="text-alert" />
            <h3 className="font-semibold text-ink">Low stock</h3>
          </div>
          <div className="flex flex-col gap-2">
            {(lowStock.data ?? []).slice(0, 5).map((p) => (
              <div key={p.id} className="flex items-center justify-between text-body">
                <span>{p.name}</span>
                <span className="text-alert font-medium">{p.availableQty} {p.unit.toLowerCase()} (min {p.reorderLevel})</span>
              </div>
            ))}
            {lowStockCount > 5 && (
              <Link to="/warehouse/inventory" className="text-small text-sun hover:underline">
                View all {lowStockCount} low-stock items
              </Link>
            )}
          </div>
        </Card>
      )}
    </div>
  );
}
