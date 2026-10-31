import { Users, Package2, ShieldCheck, History, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader, StatCard, Card, StatusBadge, Button, Skeleton } from '@/components/ui';
import { useUsers, useKitTemplates, useAuditLogs } from '../hooks.js';
import { formatDate, formatDateTime } from '@/lib/format.js';

export function AdminDashboardPage() {
  const { data: usersData, isLoading: loadingUsers } = useUsers({ pageSize: 100 });
  const { data: kitTemplatesData, isLoading: loadingKits } = useKitTemplates();
  const { data: auditData, isLoading: loadingAudit } = useAuditLogs({ pageSize: 8 });

  const users = usersData?.data || [];
  const activeUsers = users.filter((u) => u.isActive);
  const kitTemplates = kitTemplatesData?.data || [];
  const auditLogs = auditData?.data || [];

  const rolesCount = users.reduce((acc, u) => {
    acc[u.role] = (acc[u.role] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <PageHeader
        title="Super Admin Dashboard"
        subtitle="System administration, role configuration, kit templates, and audit security trail."
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {loadingUsers ? (
          <>
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </>
        ) : (
          <>
            <StatCard
              label="Active Accounts"
              value={activeUsers.length}
              subtext={`${users.length - activeUsers.length} deactivated`}
              icon={Users}
            />
            <StatCard
              label="Platform Roles"
              value={Object.keys(rolesCount).length}
              subtext="8 locked system roles"
              icon={ShieldCheck}
            />
          </>
        )}

        {loadingKits ? (
          <Skeleton className="h-28 rounded-lg" />
        ) : (
          <StatCard
            label="Kit Templates"
            value={kitTemplates.length}
            subtext={`${kitTemplates.filter((k) => k.isActive).length} active for quotes`}
            icon={Package2}
          />
        )}

        {loadingAudit ? (
          <Skeleton className="h-28 rounded-lg" />
        ) : (
          <StatCard
            label="Total Audit Events"
            value={auditData?.meta?.total ?? auditLogs.length}
            subtext="Immutable ledger"
            icon={History}
          />
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* User Distribution by Role */}
        <Card className="p-5 lg:col-span-1 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink text-base">Users by Role</h3>
            <Link to="/admin/users" className="text-xs font-medium text-sun hover:underline">
              Manage
            </Link>
          </div>
          <div className="space-y-2.5">
            {[
              'SUPER_ADMIN',
              'DIRECTOR',
              'SALES_EXECUTIVE',
              'SURVEY_TECHNICIAN',
              'WAREHOUSE_MANAGER',
              'INSTALLATION_TECHNICIAN',
              'SUPPORT_EXECUTIVE',
              'CUSTOMER',
            ].map((role) => (
              <div key={role} className="flex items-center justify-between text-xs py-1 border-b border-line/40 last:border-none">
                <StatusBadge status={role} />
                <span className="font-mono font-medium text-ink">
                  {users.filter((u) => u.role === role && u.isActive).length} active
                </span>
              </div>
            ))}
          </div>
        </Card>

        {/* Recent Audit Activities */}
        <Card className="p-5 lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-ink text-base">Recent Audit Trail</h3>
            <Link to="/admin/audit" className="text-xs font-medium text-sun hover:underline flex items-center gap-1">
              Full log <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {loadingAudit ? (
            <div className="space-y-2">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
          ) : auditLogs.length === 0 ? (
            <div className="text-sm text-muted py-6 text-center">No audit records recorded yet.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-line text-muted uppercase tracking-wider text-[11px]">
                    <th className="pb-2 font-medium">Timestamp</th>
                    <th className="pb-2 font-medium">Action</th>
                    <th className="pb-2 font-medium">User</th>
                    <th className="pb-2 font-medium">Entity</th>
                    <th className="pb-2 font-medium">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/40">
                  {auditLogs.slice(0, 8).map((log) => (
                    <tr key={log.id} className="hover:bg-paper/50">
                      <td className="py-2.5 text-muted font-mono">{formatDateTime(log.createdAt)}</td>
                      <td className="py-2.5 font-medium text-ink">{log.action}</td>
                      <td className="py-2.5 text-muted">{log.user?.name || 'System'}</td>
                      <td className="py-2.5">
                        <span className="font-mono text-muted">{log.entityType || '—'}</span>
                      </td>
                      <td className="py-2.5 text-muted font-mono">{log.ip || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

