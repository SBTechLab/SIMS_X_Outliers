import {
  LayoutDashboard,
  TrendingUp,
  AlertTriangle,
  Wrench,
  FileText,
  BadgePercent,
  Wallet,
  Receipt,
} from 'lucide-react';

/**
 * Director sidebar. Everything the owner needs for the month-end review.
 */
export const directorNav = [
  { group: 'Overview', items: [{ to: '/director', label: 'Overview', icon: LayoutDashboard }] },
  {
    group: 'Reports',
    items: [
      { to: '/director/profitability', label: 'Profitability', icon: TrendingUp },
      { to: '/director/unfinished', label: 'Unfinished work', icon: AlertTriangle },
      { to: '/director/service', label: 'Service', icon: Wrench },
    ],
  },
  {
    group: 'Finance',
    items: [
      { to: '/director/invoices', label: 'Invoices', icon: FileText },
      { to: '/director/subsidies', label: 'Subsidies', icon: BadgePercent },
      { to: '/director/expenses', label: 'Expenses', icon: Receipt },
      { to: '/director/payouts', label: 'Technician payouts', icon: Wallet },
    ],
  },
];
