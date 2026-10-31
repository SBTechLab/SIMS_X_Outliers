import { Router } from 'express';
import { requireAuth } from '../../middlewares/requireAuth.js';
import { requireRole } from '../../middlewares/requireRole.js';
import { validate } from '../../middlewares/validate.js';
import { asyncHandler } from '../../core/asyncHandler.js';
import * as ctrl from './expenses.controller.js';
import * as v from './expenses.validation.js';

const router = Router();

router.use(requireAuth, requireRole('SUPER_ADMIN', 'DIRECTOR', 'WAREHOUSE_MANAGER', 'SUPPORT_EXECUTIVE', 'SALES_EXECUTIVE'));

router.get('/', validate({ query: v.listQuery }), asyncHandler(ctrl.listExpensesCtrl));
router.post('/', validate({ body: v.createExpense }), asyncHandler(ctrl.createExpenseCtrl));

export default router;
