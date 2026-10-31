import { useState, useMemo } from 'react';
import { History, Eye, ArrowRight, ShieldCheck, User } from 'lucide-react';
import {
  PageHeader,
  DataTable,
  Button,
  Drawer,
  Select,
  FilterBar,
  DateInput,
  Card,
} from '@/components/ui';
import { useAuditLogs, useUsers } from '../hooks.js';
import { formatDateTime } from '@/lib/format.js';

export function AuditLogPage() {
  const [userFilter, setUserFilter] = useState('');
  const [entityFilter, setEntityFilter] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [page, setPage] = useState(1);

  const [selectedLog, setSelectedLog] = useState(null);

  const { data: usersData } = useUsers({ pageSize: 100 });
  const allUsers = usersData?.data || [];

  const queryParams = {
    userId: userFilter || undefined,
    entityType: entityFilter || undefined,
    action: actionFilter || undefined,
    from: fromDate || undefined,
    to: toDate || undefined,
    page,
    pageSize: 20,
  };

  const { data, isLoading } = useAuditLogs(queryParams);
  const logs = data?.data || [];
  const meta = data?.meta || { page: 1, pageSize: 20, total: 0 };

  const columns = useMemo(
    () => [
      {
        header: 'Timestamp',
        accessor: 'createdAt',
        cell: (row) => (
          <span className="font-mono text-xs text-muted">
            {formatDateTime(row.createdAt)}
          </span>
        ),
      },
      {
        header: 'Action',
        accessor: 'action',
        cell: (row) => (
          <span className="font-semibold text-xs text-ink font-mono bg-paper px-2 py-0.5 rounded border border-line">
            {row.action}
          </span>
        ),
      },
      {
        header: 'Actor',
        accessor: 'user',
        cell: (row) => (
          <div>
            <div className="font-medium text-ink text-xs">{row.user?.name || 'System / Batch'}</div>
            <div className="text-[11px] text-muted">{row.user?.role || 'SYSTEM'}</div>
          </div>
        ),
      },
      {
        header: 'Entity',
        accessor: 'entityType',
        cell: (row) => (
          <div className="text-xs">
            <span className="font-medium text-ink">{row.entityType || '—'}</span>
            {row.entityId && (
              <span className="text-[11px] text-muted block font-mono truncate max-w-[120px]">
                {row.entityId}
              </span>
            )}
          </div>
        ),
      },
      {
        header: 'IP Address',
        accessor: 'ip',
        cell: (row) => <span className="font-mono text-xs text-muted">{row.ip || '—'}</span>,
      },
      {
        header: 'Diff',
        className: 'text-right',
        cell: (row) => (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSelectedLog(row)}
            disabled={!row.before && !row.after}
          >
            <Eye className="w-3.5 h-3.5 mr-1" /> View Changes
          </Button>
        ),
      },
    ],
    [],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Immutable Security Audit Log"
        subtitle="Cryptographically tracked trail of administrative actions, role updates, price overrides and payments (BR-18)."
      />

      <FilterBar>
        <Select
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setPage(1);
          }}
          className="w-48 text-xs"
        >
          <option value="">All Actors</option>
          {allUsers.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} ({u.role})
            </option>
          ))}
        </Select>

        <Select
          value={entityFilter}
          onChange={(e) => {
            setEntityFilter(e.target.value);
            setPage(1);
          }}
          className="w-40 text-xs"
        >
          <option value="">All Entities</option>
          <option value="User">User</option>
          <option value="Setting">Setting</option>
          <option value="KitTemplate">Kit Template</option>
          <option value="Quote">Quote</option>
          <option value="Payment">Payment</option>
          <option value="SerialUnit">Serial Unit</option>
          <option value="Ticket">Ticket</option>
        </Select>

        <Select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setPage(1);
          }}
          className="w-48 text-xs font-mono"
        >
          <option value="">All Actions</option>
          <option value="USER_CREATED">USER_CREATED</option>
          <option value="USER_UPDATED">USER_UPDATED</option>
          <option value="USER_ROLE_CHANGED">USER_ROLE_CHANGED</option>
          <option value="USER_STATUS_CHANGED">USER_STATUS_CHANGED</option>
          <option value="USER_PASSWORD_RESET">USER_PASSWORD_RESET</option>
          <option value="SETTINGS_UPDATED">SETTINGS_UPDATED</option>
          <option value="KIT_TEMPLATE_UPDATED">KIT_TEMPLATE_UPDATED</option>
          <option value="PAYMENT_RECORDED">PAYMENT_RECORDED</option>
        </Select>

        <div className="flex items-center gap-2">
          <DateInput
            value={fromDate}
            onChange={(val) => {
              setFromDate(val);
              setPage(1);
            }}
            placeholder="From date"
            className="w-36 text-xs"
          />
          <span className="text-muted text-xs">to</span>
          <DateInput
            value={toDate}
            onChange={(val) => {
              setToDate(val);
              setPage(1);
            }}
            placeholder="To date"
            className="w-36 text-xs"
          />
        </div>
      </FilterBar>

      <DataTable
        columns={columns}
        data={logs}
        loading={isLoading}
        emptyMessage="No audit log entries matching your criteria."
        pagination={{
          page: meta.page,
          pageSize: meta.pageSize,
          total: meta.total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Two-Column Diff Drawer */}
      <Drawer
        open={Boolean(selectedLog)}
        onClose={() => setSelectedLog(null)}
        title={`Audit Event: ${selectedLog?.action || ''}`}
        className="max-w-2xl"
      >
        {selectedLog && (
          <div className="space-y-6">
            {/* Meta summary strip */}
            <div className="p-3 bg-paper rounded border border-line grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-muted block">Actor:</span>
                <span className="font-medium text-ink">
                  {selectedLog.user?.name || 'System'} ({selectedLog.user?.role || 'SYSTEM'})
                </span>
              </div>
              <div>
                <span className="text-muted block">Timestamp:</span>
                <span className="font-mono text-ink">{formatDateTime(selectedLog.createdAt)}</span>
              </div>
              <div>
                <span className="text-muted block">Target Entity:</span>
                <span className="font-mono text-ink">
                  {selectedLog.entityType} ({selectedLog.entityId || 'Global'})
                </span>
              </div>
              <div>
                <span className="text-muted block">Client IP:</span>
                <span className="font-mono text-ink">{selectedLog.ip || '—'}</span>
              </div>
            </div>

            {/* 2-Column Diff comparison */}
            <div>
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-2">
                State Comparison (Before vs After)
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Before */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-alert flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-alert inline-block" /> State Before
                  </div>
                  <pre className="p-3 bg-paper border border-line rounded text-xs font-mono text-ink overflow-x-auto min-h-40 whitespace-pre-wrap">
                    {selectedLog.before
                      ? JSON.stringify(selectedLog.before, null, 2)
                      : '// No prior state (created)'}
                  </pre>
                </div>

                {/* After */}
                <div className="space-y-1.5">
                  <div className="text-xs font-medium text-leaf flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-leaf inline-block" /> State After
                  </div>
                  <pre className="p-3 bg-paper border border-line rounded text-xs font-mono text-ink overflow-x-auto min-h-40 whitespace-pre-wrap">
                    {selectedLog.after
                      ? JSON.stringify(selectedLog.after, null, 2)
                      : '// No state recorded'}
                  </pre>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4 border-t border-line">
              <Button variant="primary" onClick={() => setSelectedLog(null)}>
                Close
              </Button>
            </div>
          </div>
        )}
      </Drawer>
    </div>
  );
}

