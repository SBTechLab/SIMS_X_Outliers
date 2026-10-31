import { LayoutDashboard, Search, Wrench, Shield, Users } from 'lucide-react';

export const supportNav = [
  { group: 'Overview', items: [{ to: '/support', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'Work',
    items: [
      { to: '/support/lookup', label: 'Lookup', icon: Search },
      { to: '/support/tickets', label: 'Tickets', icon: Wrench },
      { to: '/support/warranties', label: 'Warranties', icon: Shield },
      { to: '/support/customers', label: 'Customers', icon: Users },
    ],
  },
];
