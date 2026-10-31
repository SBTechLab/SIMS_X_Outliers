import { useState, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Key, Copy, Check, ShieldAlert, Edit, UserCheck, UserX } from 'lucide-react';
import {
  PageHeader,
  DataTable,
  Button,
  StatusBadge,
  Drawer,
  Modal,
  Input,
  Select,
  ConfirmDialog,
  SearchInput,
  FilterBar,
} from '@/components/ui';
import {
  useUsers,
  useCreateUser,
  useUpdateUser,
  useUpdateUserStatus,
  useResetPassword,
} from '../hooks.js';
import { formatDateTime, formatINR } from '@/lib/format.js';
import { ROLES } from '@/lib/constants.js';
import { useAuth } from '@/app/providers.jsx';

const userSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid email required'),
  phone: z.string().optional().or(z.literal('')),
  role: z.enum([
    'SUPER_ADMIN',
    'DIRECTOR',
    'SALES_EXECUTIVE',
    'SURVEY_TECHNICIAN',
    'CUSTOMER',
    'WAREHOUSE_MANAGER',
    'INSTALLATION_TECHNICIAN',
    'SUPPORT_EXECUTIVE',
  ]),
  password: z.string().min(8, 'Minimum 8 characters').optional().or(z.literal('')),
  hourlyRate: z.coerce.number().min(0).optional(),
});

export function UsersPage() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Reset password modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [tempPassword, setTempPassword] = useState('');
  const [copied, setCopied] = useState(false);

  // Status toggle confirmation
  const [confirmDialog, setConfirmDialog] = useState({ open: false, user: null });

  const queryParams = {
    q: search || undefined,
    role: roleFilter || undefined,
    isActive: statusFilter === '' ? undefined : statusFilter === 'true',
    page,
    pageSize: 15,
  };

  const { data, isLoading } = useUsers(queryParams);
  const createUserMutation = useCreateUser();
  const updateUserMutation = useUpdateUser();
  const updateStatusMutation = useUpdateUserStatus();
  const resetPasswordMutation = useResetPassword();

  const users = data?.data || [];
  const meta = data?.meta || { page: 1, pageSize: 15, total: 0 };

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      role: 'SALES_EXECUTIVE',
      password: '',
      hourlyRate: 0,
    },
  });

  const selectedRole = watch('role');
  const isTechnician =
    selectedRole === 'SURVEY_TECHNICIAN' || selectedRole === 'INSTALLATION_TECHNICIAN';

  const handleOpenCreate = () => {
    setEditingUser(null);
    reset({
      name: '',
      email: '',
      phone: '',
      role: 'SALES_EXECUTIVE',
      password: 'Demo@1234',
      hourlyRate: 0,
    });
    setDrawerOpen(true);
  };

  const handleOpenEdit = (u) => {
    setEditingUser(u);
    reset({
      name: u.name,
      email: u.email,
      phone: u.phone || '',
      role: u.role,
      password: '',
      hourlyRate: u.hourlyRate ? Number(u.hourlyRate) : 0,
    });
    setDrawerOpen(true);
  };

  const onSubmit = (formData) => {
    if (editingUser) {
      updateUserMutation.mutate(
        {
          id: editingUser.id,
          data: {
            name: formData.name,
            email: formData.email,
            phone: formData.phone || null,
            role: formData.role,
            hourlyRate: isTechnician ? Number(formData.hourlyRate) : null,
          },
        },
        {
          onSuccess: () => setDrawerOpen(false),
        },
      );
    } else {
      createUserMutation.mutate(
        {
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          role: formData.role,
          password: formData.password || 'Demo@1234',
          hourlyRate: isTechnician ? Number(formData.hourlyRate) : null,
        },
        {
          onSuccess: () => setDrawerOpen(false),
        },
      );
    }
  };

  const handleToggleStatus = (targetUser) => {
    setConfirmDialog({
      open: true,
      user: targetUser,
    });
  };

  const confirmStatusChange = () => {
    if (!confirmDialog.user) return;
    const target = confirmDialog.user;
    updateStatusMutation.mutate(
      { id: target.id, isActive: !target.isActive },
      {
        onSettled: () => setConfirmDialog({ open: false, user: null }),
      },
    );
  };

  const handleResetPassword = (targetUser) => {
    resetPasswordMutation.mutate(
      { id: targetUser.id },
      {
        onSuccess: (res) => {
          setTempPassword(res.data?.temporaryPassword || 'Password reset');
          setCopied(false);
          setResetModalOpen(true);
        },
      },
    );
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(tempPassword);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const columns = useMemo(
    () => [
      {
        header: 'User',
        accessor: 'name',
        cell: (row) => (
          <div>
            <div className="font-semibold text-ink">{row.name}</div>
            <div className="text-xs text-muted">{row.email}</div>
          </div>
        ),
      },
      {
        header: 'Phone',
        accessor: 'phone',
        cell: (row) => <span className="font-mono text-xs">{row.phone || '—'}</span>,
      },
      {
        header: 'Role',
        accessor: 'role',
        cell: (row) => <StatusBadge status={row.role} />,
      },
      {
        header: 'Rate',
        accessor: 'hourlyRate',
        cell: (row) =>
          row.hourlyRate ? (
            <span className="font-mono text-xs">{formatINR(row.hourlyRate)}/hr</span>
          ) : (
            <span className="text-muted text-xs">—</span>
          ),
      },
      {
        header: 'Status',
        accessor: 'isActive',
        cell: (row) => (
          <span
            className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
              row.isActive ? 'bg-leaf/10 text-leaf' : 'bg-alert/10 text-alert'
            }`}
          >
            {row.isActive ? 'Active' : 'Inactive'}
          </span>
        ),
      },
      {
        header: 'Last Login',
        accessor: 'lastLoginAt',
        cell: (row) => (
          <span className="text-xs text-muted">
            {row.lastLoginAt ? formatDateTime(row.lastLoginAt) : 'Never'}
          </span>
        ),
      },
      {
        header: 'Actions',
        className: 'text-right',
        cell: (row) => (
          <div className="flex items-center justify-end gap-1.5">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleOpenEdit(row)}
              title="Edit user"
            >
              <Edit className="w-3.5 h-3.5 text-muted hover:text-ink" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleResetPassword(row)}
              title="Reset temporary password"
            >
              <Key className="w-3.5 h-3.5 text-muted hover:text-sun" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleToggleStatus(row)}
              disabled={currentUser?.id === row.id && row.isActive}
              title={row.isActive ? 'Deactivate account' : 'Activate account'}
            >
              {row.isActive ? (
                <UserX className="w-3.5 h-3.5 text-alert" />
              ) : (
                <UserCheck className="w-3.5 h-3.5 text-leaf" />
              )}
            </Button>
          </div>
        ),
      },
    ],
    [currentUser],
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        subtitle="Staff accounts, roles, access controls, technician rates and password security."
        actions={
          <Button variant="primary" onClick={handleOpenCreate}>
            <Plus className="w-4 h-4 mr-1.5" />
            Add User
          </Button>
        }
      />

      <FilterBar>
        <div className="flex-1 max-w-sm">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search name, email, phone..."
          />
        </div>

        <Select
          value={roleFilter}
          onChange={(e) => {
            setRoleFilter(e.target.value);
            setPage(1);
          }}
          className="w-48"
        >
          <option value="">All Roles</option>
          <option value="SUPER_ADMIN">Super Admin</option>
          <option value="DIRECTOR">Director</option>
          <option value="SALES_EXECUTIVE">Sales Executive</option>
          <option value="SURVEY_TECHNICIAN">Survey Technician</option>
          <option value="WAREHOUSE_MANAGER">Warehouse Manager</option>
          <option value="INSTALLATION_TECHNICIAN">Installation Tech</option>
          <option value="SUPPORT_EXECUTIVE">Support Executive</option>
          <option value="CUSTOMER">Customer</option>
        </Select>

        <Select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="w-36"
        >
          <option value="">All Statuses</option>
          <option value="true">Active</option>
          <option value="false">Inactive</option>
        </Select>
      </FilterBar>

      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        emptyMessage="No users found matching your filters."
        pagination={{
          page: meta.page,
          pageSize: meta.pageSize,
          total: meta.total,
          onPageChange: (p) => setPage(p),
        }}
      />

      {/* Drawer for Create / Edit */}
      <Drawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        title={editingUser ? `Edit ${editingUser.name}` : 'Create Staff Account'}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-ink mb-1">Full Name</label>
            <Input {...register('name')} placeholder="e.g. Ramesh Kumar" error={errors.name?.message} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Email Address</label>
            <Input
              type="email"
              {...register('email')}
              placeholder="e.g. ramesh@sunpower.in"
              error={errors.email?.message}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">Phone Number (Optional)</label>
            <Input {...register('phone')} placeholder="+91 98480 12345" error={errors.phone?.message} />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink mb-1">System Role</label>
            <Select {...register('role')} error={errors.role?.message}>
              <option value="SUPER_ADMIN">SUPER_ADMIN</option>
              <option value="DIRECTOR">DIRECTOR</option>
              <option value="SALES_EXECUTIVE">SALES_EXECUTIVE</option>
              <option value="SURVEY_TECHNICIAN">SURVEY_TECHNICIAN</option>
              <option value="WAREHOUSE_MANAGER">WAREHOUSE_MANAGER</option>
              <option value="INSTALLATION_TECHNICIAN">INSTALLATION_TECHNICIAN</option>
              <option value="SUPPORT_EXECUTIVE">SUPPORT_EXECUTIVE</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </Select>
          </div>

          {isTechnician && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1">
                Technician Hourly Rate (INR)
              </label>
              <Input
                type="number"
                step="10"
                {...register('hourlyRate')}
                placeholder="e.g. 300"
                error={errors.hourlyRate?.message}
              />
              <span className="text-[11px] text-muted">Used for monthly payout calculations.</span>
            </div>
          )}

          {!editingUser && (
            <div>
              <label className="block text-xs font-medium text-ink mb-1">Initial Password</label>
              <Input
                type="text"
                {...register('password')}
                placeholder="Default: Demo@1234"
                error={errors.password?.message}
              />
            </div>
          )}

          <div className="pt-4 flex justify-end gap-2 border-t border-line">
            <Button type="button" variant="outline" onClick={() => setDrawerOpen(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createUserMutation.isPending || updateUserMutation.isPending}
            >
              {editingUser ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Password Reset Modal */}
      <Modal
        open={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Temporary Password Generated"
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            The user's password has been reset. Provide this temporary password to the user. It will not be shown again.
          </p>

          <div className="flex items-center justify-between p-3 bg-paper border border-line rounded font-mono text-sm">
            <span className="text-ink font-semibold">{tempPassword}</span>
            <Button variant="ghost" size="sm" onClick={handleCopyPassword} className="h-8">
              {copied ? (
                <Check className="w-4 h-4 text-leaf mr-1" />
              ) : (
                <Copy className="w-4 h-4 text-muted mr-1" />
              )}
              {copied ? 'Copied' : 'Copy'}
            </Button>
          </div>

          <div className="flex justify-end pt-2">
            <Button variant="primary" onClick={() => setResetModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      {/* Deactivate/Activate Confirm Dialog */}
      <ConfirmDialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, user: null })}
        onConfirm={confirmStatusChange}
        title={confirmDialog.user?.isActive ? 'Deactivate Account' : 'Activate Account'}
        description={
          confirmDialog.user?.isActive
            ? `Are you sure you want to deactivate ${confirmDialog.user?.name}'s account? They will no longer be able to log in or receive assigned work.`
            : `Are you sure you want to re-activate ${confirmDialog.user?.name}'s account?`
        }
        confirmText={confirmDialog.user?.isActive ? 'Deactivate' : 'Activate'}
        variant={confirmDialog.user?.isActive ? 'danger' : 'primary'}
      />
    </div>
  );
}

