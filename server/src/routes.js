import { Router } from 'express';
import { asyncHandler } from './core/asyncHandler.js';
import { checkDatabase } from './core/prisma.js';

// --- Member A: platform, finance, reports ---
import authRoutes from './modules/auth/auth.routes.js';
import usersRoutes from './modules/users/users.routes.js';
import settingsRoutes from './modules/settings/settings.routes.js';
import kitTemplatesRoutes from './modules/kit-templates/kit-templates.routes.js';
import auditRoutes from './modules/audit/audit.routes.js';
import notificationsRoutes from './modules/notifications/notifications.routes.js';
import invoicesRoutes from './modules/invoices/invoices.routes.js';
import subsidiesRoutes from './modules/subsidies/subsidies.routes.js';
import expensesRoutes from './modules/expenses/expenses.routes.js';
import payoutsRoutes from './modules/payouts/payouts.routes.js';
import reportsRoutes from './modules/reports/reports.routes.js';
import searchRoutes from './modules/search/search.routes.js';

// --- Member B: sales, survey, customer, public site ---
import publicRoutes from './modules/public/public.routes.js';
import leadsRoutes from './modules/leads/leads.routes.js';
import surveysRoutes from './modules/surveys/surveys.routes.js';
import quotesRoutes from './modules/quotes/quotes.routes.js';
import projectsRoutes from './modules/projects/projects.routes.js';
import paymentsRoutes from './modules/payments/payments.routes.js';
import customersRoutes from './modules/customers/customers.routes.js';
import meRoutes from './modules/me/me.routes.js';

// --- Member C: warehouse, installation, support ---
import productsRoutes from './modules/products/products.routes.js';
import inventoryRoutes from './modules/inventory/inventory.routes.js';
import purchasesRoutes from './modules/purchases/purchases.routes.js';
import serialsRoutes from './modules/serials/serials.routes.js';
import dispatchesRoutes from './modules/dispatches/dispatches.routes.js';
import warrantiesRoutes from './modules/warranties/warranties.routes.js';
import installationsRoutes from './modules/installations/installations.routes.js';
import ticketsRoutes from './modules/tickets/tickets.routes.js';
import supportRoutes from './modules/support/support.routes.js';

/**
 * SHARED FILE (docs/AGENTS.md section 5).
 *
 * Additive changes only. Add your mount inside your own member's fence; never rename,
 * reorder or delete another member's lines. On a rebase conflict here, keep BOTH sides.
 */
const router = Router();

/** Liveness plus a real database check — used by the smoke script and the client boot. */
router.get(
  '/health',
  asyncHandler(async (req, res) => {
    const dbUp = await checkDatabase();
    return res.status(dbUp ? 200 : 503).json({
      success: dbUp,
      data: {
        status: dbUp ? 'ok' : 'degraded',
        db: dbUp ? 'up' : 'down',
        uptime: Math.round(process.uptime()),
        version: '0.1.0',
        time: new Date().toISOString(),
      },
    });
  }),
);

// --- Member A: platform, finance, reports ---
router.use('/auth', authRoutes);
router.use('/users', usersRoutes);
router.use('/settings', settingsRoutes);
router.use('/kit-templates', kitTemplatesRoutes);
router.use('/audit-logs', auditRoutes);
router.use('/notifications', notificationsRoutes);
router.use('/invoices', invoicesRoutes);
router.use('/subsidies', subsidiesRoutes);
router.use('/expenses', expensesRoutes);
router.use('/payouts', payoutsRoutes);
router.use('/reports', reportsRoutes);
router.use('/search', searchRoutes);

// --- Member B: sales, survey, customer, public site ---
router.use('/public', publicRoutes);
router.use('/leads', leadsRoutes);
router.use('/surveys', surveysRoutes);
router.use('/quotes', quotesRoutes);
router.use('/projects', projectsRoutes);
router.use('/payments', paymentsRoutes);
router.use('/customers', customersRoutes);
router.use('/me', meRoutes);

// --- Member C: warehouse, installation, support ---
router.use('/products', productsRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/purchases', purchasesRoutes);
// Suppliers are owned by the purchases module — one service, two paths.
router.use('/suppliers', purchasesRoutes);
router.use('/serials', serialsRoutes);
router.use('/dispatches', dispatchesRoutes);
router.use('/warranties', warrantiesRoutes);
router.use('/installations', installationsRoutes);
router.use('/tickets', ticketsRoutes);
router.use('/support', supportRoutes);

export default router;
