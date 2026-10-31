import { ok, created } from '../../core/response.js';
import { createExpense, listExpenses } from './expenses.service.js';

export async function createExpenseCtrl(req, res) {
  const expense = await createExpense(req.body, req.user);
  return created(res, expense);
}

export async function listExpensesCtrl(req, res) {
  const result = await listExpenses(req.query);
  return ok(res, result.data, result.meta);
}
