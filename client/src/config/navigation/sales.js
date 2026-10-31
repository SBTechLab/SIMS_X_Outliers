import { Inbox, ClipboardCheck, FileText, Users, Receipt, FolderKanban } from 'lucide-react';

export const salesNav = [
  { group: 'Pipeline', items: [{ to: '/sales/leads', label: 'Leads', icon: Inbox }] },
  {
    group: 'Work',
    items: [
      { to: '/sales/surveys', label: 'Surveys', icon: ClipboardCheck },
      { to: '/sales/quotes', label: 'Quotes', icon: FileText },
      { to: '/sales/projects', label: 'Projects', icon: FolderKanban },
      { to: '/sales/payments', label: 'Payments', icon: Receipt },
      { to: '/sales/customers', label: 'Customers', icon: Users },
    ],
  },
];
