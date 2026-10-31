import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';

const CUSTOMER_LIST_SELECT = {
  id: true, name: true, phone: true, email: true, city: true, customerType: true, createdAt: true,
  _count: { select: { projects: true, quotes: true } },
};

/**
 * Lists customers with pagination and search.
 *
 * Throws: nothing.
 */
export async function listCustomers(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.city) where.city = { contains: query.city, mode: 'insensitive' };
  if (query.q) {
    where.OR = [
      { name: { contains: query.q, mode: 'insensitive' } },
      { phone: { contains: query.q } },
      { email: { contains: query.q, mode: 'insensitive' } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({ where, select: CUSTOMER_LIST_SELECT, orderBy: { createdAt: 'desc' }, skip, take }),
    prisma.customer.count({ where }),
  ]);

  return { customers: rows, meta: meta(total) };
}

/**
 * Returns a single customer with related projects and quotes.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function getCustomer(id) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      projects: { select: { id: true, code: true, status: true, createdAt: true }, orderBy: { createdAt: 'desc' } },
      quotes: { select: { id: true, number: true, status: true, total: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 5 },
    },
  });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found.');
  return customer;
}

/**
 * Updates customer profile fields.
 *
 * Throws: AppError 404 NOT_FOUND.
 */
export async function updateCustomer(id, data) {
  const customer = await prisma.customer.findUnique({ where: { id }, select: { id: true } });
  if (!customer) throw new AppError(404, 'NOT_FOUND', 'Customer not found.');

  const updated = await prisma.customer.update({
    where: { id },
    data,
    select: { id: true, name: true, phone: true, email: true, city: true, state: true, pincode: true, customerType: true, notes: true, updatedAt: true },
  });
  return updated;
}
