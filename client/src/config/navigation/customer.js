import { Home, FolderKanban, FileText, Receipt, Shield, Wrench, User } from 'lucide-react';

export const customerNav = [
  { to: '/portal', label: 'Overview', icon: Home },
  { to: '/portal/projects', label: 'Projects', icon: FolderKanban },
  { to: '/portal/quotes', label: 'Quotes', icon: FileText },
  { to: '/portal/invoices', label: 'Invoices', icon: Receipt },
  { to: '/portal/systems', label: 'Systems', icon: Shield },
  { to: '/portal/tickets', label: 'Support', icon: Wrench },
  { to: '/portal/profile', label: 'Profile', icon: User },
];
