import { code, daysFromNow, money, serial } from './helpers.js';

export const SUPPLIERS = [
  { key: 'solaris', name: 'Solaris Modules India Pvt Ltd', phone: '04027601188', gstin: '36AACCS7781K1Z8' },
  { key: 'voltedge', name: 'VoltEdge Power Systems', phone: '04023551290', gstin: '36AAECV4410M1ZQ' },
  { key: 'balance', name: 'Deccan Electrical Supplies', phone: '04024661744', gstin: '36AAHFD9032L1ZR' },
];

/**
 * Serial number prefixes per serialized SKU, so a stock list reads like real stickers
 * and support can recognise a product from the serial alone over the phone.
 */
const SERIAL_PREFIX = {
  'PNL-MONO-540': 'PNL540',
  'PNL-MONO-440': 'PNL440',
  'PNL-BIFA-580': 'PNL580',
  'INV-OG-1K': 'INV-OG1K',
  'INV-OG-2K': 'INV-OG2K',
  'INV-OG-3K': 'INV-OG3K',
  'INV-OG-4K': 'INV-OG4K',
  'INV-OG-5K': 'INV-OG5K',
  'INV-HY-3K': 'INV-HY3K',
  'INV-HY-5K': 'INV-HY5K',
  'BAT-TUB-150': 'BAT150',
  'BAT-TUB-200': 'BAT200',
  'BAT-LI-100': 'BATLI',
  'CC-MPPT-50': 'CC50',
  'CC-MPPT-30': 'CC30',
};

/**
 * Purchase lines. Quantities are chosen so that after the seeded projects consume their
 * kit, roughly 150 serial units remain IN_STOCK — enough for the warehouse screens to
 * look like a real stockroom and for the demo dispatch to be scannable.
 */
const PURCHASES = [
  {
    supplier: 'solaris',
    invoiceRef: 'SMI/26-27/4471',
    daysAgo: 96,
    batch: '2608',
    items: [
      { sku: 'PNL-MONO-540', quantity: 90, unitCost: 9750 },
      { sku: 'PNL-MONO-440', quantity: 24, unitCost: 8050 },
    ],
  },
  {
    supplier: 'solaris',
    invoiceRef: 'SMI/26-27/4698',
    daysAgo: 41,
    batch: '2615',
    items: [
      { sku: 'PNL-MONO-540', quantity: 60, unitCost: 9880 },
      { sku: 'PNL-BIFA-580', quantity: 12, unitCost: 11400 },
    ],
  },
  {
    supplier: 'voltedge',
    invoiceRef: 'VEP/26-27/0912',
    daysAgo: 88,
    batch: '2609',
    items: [
      { sku: 'INV-OG-1K', quantity: 4, unitCost: 14400 },
      { sku: 'INV-OG-2K', quantity: 6, unitCost: 20900 },
      { sku: 'INV-OG-3K', quantity: 10, unitCost: 28400 },
      { sku: 'INV-OG-4K', quantity: 5, unitCost: 35100 },
      { sku: 'INV-OG-5K', quantity: 4, unitCost: 41800 },
    ],
  },
  {
    supplier: 'voltedge',
    invoiceRef: 'VEP/26-27/1184',
    daysAgo: 33,
    batch: '2616',
    items: [
      { sku: 'INV-HY-3K', quantity: 4, unitCost: 44300 },
      { sku: 'INV-HY-5K', quantity: 3, unitCost: 61800 },
      { sku: 'CC-MPPT-50', quantity: 8, unitCost: 11750 },
      { sku: 'CC-MPPT-30', quantity: 6, unitCost: 7350 },
    ],
  },
  {
    supplier: 'balance',
    invoiceRef: 'DES/26-27/2207',
    daysAgo: 27,
    batch: '2617',
    items: [
      { sku: 'BAT-TUB-150', quantity: 18, unitCost: 13150 },
      { sku: 'BAT-TUB-200', quantity: 8, unitCost: 17350 },
      { sku: 'BAT-LI-100', quantity: 2, unitCost: 95500 },
    ],
  },
  {
    supplier: 'balance',
    invoiceRef: 'DES/26-27/2318',
    daysAgo: 19,
    batch: '2618',
    // Non-serialized balance of system. stockQty on the products already reflects this,
    // so the purchase exists for the cost trail (BR-13) rather than to add stock twice.
    items: [
      { sku: 'MNT-GI-KW', quantity: 24, unitCost: 4150 },
      { sku: 'DCB-STD-2IN', quantity: 20, unitCost: 2380 },
      { sku: 'ACB-STD-1P', quantity: 20, unitCost: 2080 },
      { sku: 'CBL-DC-4SQ', quantity: 900, unitCost: 47 },
      { sku: 'CBL-AC-4SQ', quantity: 600, unitCost: 51 },
      { sku: 'ERT-KIT-STD', quantity: 20, unitCost: 2760 },
      { sku: 'CON-MC4-PR', quantity: 240, unitCost: 84 },
    ],
  },
];

/**
 * Creates suppliers, purchases and every SerialUnit in stock.
 *
 * Why: the warranty trail begins here (D-06). Each serial carries its own unitCost, so
 *      project profit is exact rather than averaged (BR-13).
 * Flow: create suppliers -> for each purchase, create the Purchase with its items in one
 *       call, then create SerialUnit rows for every serialized line.
 * Example:
 *   const { suppliers, serialsBySku } = await seedProcurement(prisma, products, warehouseUser)
 *   // → serialsBySku["INV-OG-3K"] = [{ id, serialNumber: "INV-OG3K-2609-00001" }, ...]
 * Throws: nothing of its own.
 */
export async function seedProcurement(prisma, products, createdBy) {
  const suppliers = {};
  for (const s of SUPPLIERS) {
    suppliers[s.key] = await prisma.supplier.create({
      data: { name: s.name, phone: s.phone, gstin: s.gstin },
    });
  }

  /** Running counter per prefix so serial numbers never repeat across purchases. */
  const counters = {};
  const serialsBySku = {};
  const purchases = [];

  for (const [index, p] of PURCHASES.entries()) {
    const total = p.items.reduce((acc, i) => acc + i.quantity * i.unitCost, 0);

    const purchase = await prisma.purchase.create({
      data: {
        number: code('PO', index + 1),
        supplierId: suppliers[p.supplier].id,
        invoiceRef: p.invoiceRef,
        purchasedAt: daysFromNow(-p.daysAgo, 11, 0),
        total: money(total),
        createdById: createdBy.id,
        items: {
          create: p.items.map((i) => ({
            productId: products[i.sku].id,
            quantity: money(i.quantity),
            unitCost: money(i.unitCost),
          })),
        },
      },
      include: { items: true },
    });

    purchases.push(purchase);

    for (const line of purchase.items) {
      const product = Object.values(products).find((pr) => pr.id === line.productId);
      if (!product.isSerialized) continue;

      const prefix = SERIAL_PREFIX[product.sku];
      counters[prefix] = counters[prefix] ?? 0;

      const rows = [];
      for (let n = 0; n < Number(line.quantity); n += 1) {
        counters[prefix] += 1;
        rows.push({
          serialNumber: serial(prefix, p.batch, counters[prefix]),
          productId: product.id,
          purchaseItemId: line.id,
          unitCost: line.unitCost,
          status: 'IN_STOCK',
        });
      }

      await prisma.serialUnit.createMany({ data: rows });

      serialsBySku[product.sku] = serialsBySku[product.sku] ?? [];
      const created = await prisma.serialUnit.findMany({
        where: { serialNumber: { in: rows.map((r) => r.serialNumber) } },
        select: { id: true, serialNumber: true, productId: true, unitCost: true },
        orderBy: { serialNumber: 'asc' },
      });
      serialsBySku[product.sku].push(...created);
    }
  }

  return { suppliers, purchases, serialsBySku };
}

/**
 * Hands out the next free serials for a SKU and marks them taken.
 *
 * Why: the project stages consume stock, and two projects must never be given the same
 *      serial — that is BR-08, and a seed that broke it would make the demo look wrong.
 * Example:
 *   const [inverter] = take(serialsBySku, "INV-OG-3K", 1)
 * Throws: Error when stock runs out, which means a purchase quantity above is too low.
 */
export function take(serialsBySku, sku, count) {
  const pool = serialsBySku[sku] ?? [];
  if (pool.length < count) {
    throw new Error(`Seed stock exhausted for ${sku}: needed ${count}, have ${pool.length}`);
  }
  return pool.splice(0, count);
}
