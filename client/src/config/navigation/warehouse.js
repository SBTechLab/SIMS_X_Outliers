import {
  LayoutDashboard,
  Package2,
  Boxes,
  Truck,
  CalendarDays,
  ShoppingCart,
  Barcode,
} from 'lucide-react';

export const warehouseNav = [
  { group: 'Overview', items: [{ to: '/warehouse', label: 'Dashboard', icon: LayoutDashboard }] },
  {
    group: 'Catalogue',
    items: [
      { to: '/warehouse/products', label: 'Products', icon: Package2 },
      { to: '/warehouse/inventory', label: 'Inventory', icon: Boxes },
      { to: '/warehouse/purchases', label: 'Purchases', icon: ShoppingCart },
      { to: '/warehouse/serials', label: 'Serials', icon: Barcode },
    ],
  },
  {
    group: 'Operations',
    items: [
      { to: '/warehouse/dispatches', label: 'Dispatches', icon: Truck },
      { to: '/warehouse/installations', label: 'Install schedule', icon: CalendarDays },
    ],
  },
];
