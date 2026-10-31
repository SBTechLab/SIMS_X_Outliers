/**
 * Turns ?page and ?pageSize into Prisma skip/take plus the meta block.
 *
 * Why: every list endpoint returns the same { page, pageSize, total } meta (RULES.md section 6),
 *      and pageSize is capped so a list cannot be used to dump the database.
 * Flow: read the validated query, clamp it, return skip/take and a meta builder.
 * Example:
 *   const { skip, take, meta } = paginate(req.query);
 *   const [rows, total] = await prisma.$transaction([
 *     prisma.lead.findMany({ where, skip, take }),
 *     prisma.lead.count({ where }),
 *   ]);
 *   return ok(res, rows, meta(total));
 * Throws: nothing — zod has already validated and defaulted the query.
 */
export const MAX_PAGE_SIZE = 100;
export const DEFAULT_PAGE_SIZE = 20;

export function paginate(query = {}) {
  const page = Math.max(1, Number(query.page) || 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, Number(query.pageSize) || DEFAULT_PAGE_SIZE),
  );

  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
    page,
    pageSize,
    meta: (total) => ({ page, pageSize, total }),
  };
}
