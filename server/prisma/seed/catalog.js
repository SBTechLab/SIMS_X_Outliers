import { money } from './helpers.js';

/**
 * ~30 products across every category.
 *
 * Serialized (BR-07): PANEL, INVERTER, BATTERY, CHARGE_CONTROLLER.
 * warrantyMonths: panel 240, inverter / battery / charge controller 24, everything else 12 —
 * the duration always comes from the product (BR-09), never from code.
 * Prices are realistic for Hyderabad in 2026: a 540 Wp panel lands at ~Rs 9,800 and sells
 * at ~Rs 13,500.
 */
export const PRODUCTS = [
  // --- Panels (serialized, 240-month warranty) ---
  { sku: 'PNL-MONO-540', name: 'Mono PERC 540 Wp Panel', category: 'PANEL', brand: 'Solaris', unit: 'PCS', isSerialized: true, warrantyMonths: 240, costPrice: 9800, sellPrice: 13500, reorderLevel: 20, specs: { wattage: 540, cells: 144, technology: 'Mono PERC', efficiency: '21.2%' } },
  { sku: 'PNL-MONO-440', name: 'Mono PERC 440 Wp Panel', category: 'PANEL', brand: 'Solaris', unit: 'PCS', isSerialized: true, warrantyMonths: 240, costPrice: 8100, sellPrice: 11200, reorderLevel: 20, specs: { wattage: 440, cells: 120, technology: 'Mono PERC', efficiency: '20.4%' } },
  { sku: 'PNL-BIFA-580', name: 'Bifacial 580 Wp Panel', category: 'PANEL', brand: 'Solaris', unit: 'PCS', isSerialized: true, warrantyMonths: 240, costPrice: 11400, sellPrice: 15600, reorderLevel: 10, specs: { wattage: 580, technology: 'Bifacial Mono PERC', efficiency: '21.8%' } },

  // --- Inverters (serialized, 24-month warranty) ---
  { sku: 'INV-OG-1K', name: '1 kW On-Grid String Inverter', category: 'INVERTER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 14500, sellPrice: 19800, reorderLevel: 4, specs: { capacityKw: 1, phase: 'Single', mppt: 1 } },
  { sku: 'INV-OG-2K', name: '2 kW On-Grid String Inverter', category: 'INVERTER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 21000, sellPrice: 28500, reorderLevel: 4, specs: { capacityKw: 2, phase: 'Single', mppt: 1 } },
  { sku: 'INV-OG-3K', name: '3 kW On-Grid String Inverter', category: 'INVERTER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 28500, sellPrice: 38500, reorderLevel: 5, specs: { capacityKw: 3, phase: 'Single', mppt: 2 } },
  { sku: 'INV-OG-4K', name: '4 kW On-Grid String Inverter', category: 'INVERTER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 35200, sellPrice: 47500, reorderLevel: 3, specs: { capacityKw: 4, phase: 'Single', mppt: 2 } },
  { sku: 'INV-OG-5K', name: '5 kW On-Grid String Inverter', category: 'INVERTER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 42000, sellPrice: 56500, reorderLevel: 3, specs: { capacityKw: 5, phase: 'Three', mppt: 2 } },
  { sku: 'INV-HY-3K', name: '3 kW Hybrid Inverter', category: 'INVERTER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 44500, sellPrice: 59800, reorderLevel: 3, specs: { capacityKw: 3, type: 'Hybrid', batteryVoltage: 48 } },
  { sku: 'INV-HY-5K', name: '5 kW Hybrid Inverter', category: 'INVERTER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 62000, sellPrice: 82500, reorderLevel: 2, specs: { capacityKw: 5, type: 'Hybrid', batteryVoltage: 48 } },

  // --- Batteries (serialized, 24-month warranty) ---
  { sku: 'BAT-TUB-150', name: '150 Ah Tubular Battery 12V', category: 'BATTERY', brand: 'PowerCell', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 13200, sellPrice: 17800, reorderLevel: 8, specs: { ah: 150, voltage: 12, type: 'Tubular lead-acid' } },
  { sku: 'BAT-TUB-200', name: '200 Ah Tubular Battery 12V', category: 'BATTERY', brand: 'PowerCell', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 17400, sellPrice: 23500, reorderLevel: 6, specs: { ah: 200, voltage: 12, type: 'Tubular lead-acid' } },
  { sku: 'BAT-LI-100', name: '100 Ah Lithium Battery 48V', category: 'BATTERY', brand: 'PowerCell', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 96000, sellPrice: 128000, reorderLevel: 2, specs: { ah: 100, voltage: 48, type: 'LiFePO4' } },

  // --- Charge controllers (serialized, 24-month warranty) ---
  { sku: 'CC-MPPT-50', name: 'MPPT Charge Controller 48V 50A', category: 'CHARGE_CONTROLLER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 11800, sellPrice: 16200, reorderLevel: 5, specs: { voltage: 48, current: 50, type: 'MPPT' } },
  { sku: 'CC-MPPT-30', name: 'MPPT Charge Controller 24V 30A', category: 'CHARGE_CONTROLLER', brand: 'VoltEdge', unit: 'PCS', isSerialized: true, warrantyMonths: 24, costPrice: 7400, sellPrice: 10500, reorderLevel: 5, specs: { voltage: 24, current: 30, type: 'MPPT' } },

  // --- Mounting (non-serialized, 12-month warranty) ---
  { sku: 'MNT-GI-KW', name: 'GI Mounting Structure per kW', category: 'MOUNTING_STRUCTURE', brand: 'SteelFab', unit: 'SET', isSerialized: false, warrantyMonths: 12, costPrice: 4200, sellPrice: 6200, reorderLevel: 10, stockQty: 48, specs: { material: 'Galvanised iron', windLoad: '150 km/h' } },
  { sku: 'MNT-ELEV-4FT', name: 'Elevated Structure 4 ft per kW', category: 'MOUNTING_STRUCTURE', brand: 'SteelFab', unit: 'SET', isSerialized: false, warrantyMonths: 12, costPrice: 6800, sellPrice: 9600, reorderLevel: 5, stockQty: 14 },
  { sku: 'MNT-CLAMP-MID', name: 'Mid Clamp Set', category: 'MOUNTING_STRUCTURE', brand: 'SteelFab', unit: 'SET', isSerialized: false, warrantyMonths: 12, costPrice: 95, sellPrice: 160, reorderLevel: 100, stockQty: 620 },

  // --- Boxes ---
  { sku: 'DCB-STD-2IN', name: 'DC Distribution Box', category: 'DC_BOX', brand: 'ElectroSafe', unit: 'PCS', isSerialized: false, warrantyMonths: 12, costPrice: 2400, sellPrice: 3500, reorderLevel: 10, stockQty: 36, specs: { inputs: 2, protection: 'SPD + fuse' } },
  { sku: 'ACB-STD-1P', name: 'AC Distribution Box', category: 'AC_BOX', brand: 'ElectroSafe', unit: 'PCS', isSerialized: false, warrantyMonths: 12, costPrice: 2100, sellPrice: 3100, reorderLevel: 10, stockQty: 34, specs: { phase: 'Single', mcb: '32A' } },
  { sku: 'ACB-STD-3P', name: 'AC Distribution Box Three Phase', category: 'AC_BOX', brand: 'ElectroSafe', unit: 'PCS', isSerialized: false, warrantyMonths: 12, costPrice: 3600, sellPrice: 5200, reorderLevel: 5, stockQty: 11 },

  // --- Cable (by the metre) ---
  { sku: 'CBL-DC-4SQ', name: '4 sq mm DC Cable (m)', category: 'CABLE', brand: 'CoreWire', unit: 'METER', isSerialized: false, warrantyMonths: 12, costPrice: 48, sellPrice: 72, reorderLevel: 200, stockQty: 1850 },
  { sku: 'CBL-DC-6SQ', name: '6 sq mm DC Cable (m)', category: 'CABLE', brand: 'CoreWire', unit: 'METER', isSerialized: false, warrantyMonths: 12, costPrice: 66, sellPrice: 98, reorderLevel: 150, stockQty: 740 },
  { sku: 'CBL-AC-4SQ', name: '4 sq mm AC Cable (m)', category: 'CABLE', brand: 'CoreWire', unit: 'METER', isSerialized: false, warrantyMonths: 12, costPrice: 52, sellPrice: 78, reorderLevel: 200, stockQty: 1220 },

  // --- Earthing, connectors, accessories ---
  { sku: 'ERT-KIT-STD', name: 'Earthing Kit', category: 'EARTHING', brand: 'GroundPro', unit: 'SET', isSerialized: false, warrantyMonths: 12, costPrice: 2800, sellPrice: 4100, reorderLevel: 10, stockQty: 42, specs: { electrode: 'Copper bonded 2 m', includes: 'Backfill compound' } },
  { sku: 'ERT-LA-STD', name: 'Lightning Arrester', category: 'EARTHING', brand: 'GroundPro', unit: 'PCS', isSerialized: false, warrantyMonths: 12, costPrice: 1850, sellPrice: 2700, reorderLevel: 10, stockQty: 28 },
  { sku: 'CON-MC4-PR', name: 'MC4 Connector Pair', category: 'CONNECTOR', brand: 'CoreWire', unit: 'PCS', isSerialized: false, warrantyMonths: 12, costPrice: 85, sellPrice: 140, reorderLevel: 50, stockQty: 410 },
  { sku: 'CON-CT-STD', name: 'Cable Tie and Gland Set', category: 'ACCESSORY', brand: 'CoreWire', unit: 'SET', isSerialized: false, warrantyMonths: 12, costPrice: 420, sellPrice: 650, reorderLevel: 20, stockQty: 96 },
  { sku: 'ACC-METER-NET', name: 'Net Meter Interface Kit', category: 'ACCESSORY', brand: 'ElectroSafe', unit: 'SET', isSerialized: false, warrantyMonths: 12, costPrice: 3200, sellPrice: 4600, reorderLevel: 5, stockQty: 9 },

  // --- Services (never stocked, never serialized) ---
  { sku: 'SRV-INSTALL-KW', name: 'Installation and Commissioning per kW', category: 'SERVICE', unit: 'SET', isSerialized: false, warrantyMonths: 12, costPrice: 2200, sellPrice: 3800, reorderLevel: 0, stockQty: 0 },
  { sku: 'SRV-VISIT', name: 'Service Visit', category: 'SERVICE', unit: 'PCS', isSerialized: false, warrantyMonths: 12, costPrice: 300, sellPrice: 500, reorderLevel: 0, stockQty: 0 },
  { sku: 'SRV-LABOUR-HR', name: 'Technician Labour (hour)', category: 'SERVICE', unit: 'HOUR', isSerialized: false, warrantyMonths: 12, costPrice: 300, sellPrice: 450, reorderLevel: 0, stockQty: 0 },
];

/**
 * Builds the bill of materials for a kit of a given capacity.
 *
 * Why: BR-04 — expanding a kit must fill a quote with every part, so the BOM has to be
 *      complete and has to scale with capacity. Off-Grid is On-Grid plus batteries and a
 *      charge controller.
 * Flow: pick the panel count for the capacity, the matching inverter, then the balance of
 *       system that scales per kW.
 */
function bom(capacityKw, systemType) {
  // 540 Wp panels, rounded up to cover the capacity.
  const panels = Math.ceil((capacityKw * 1000) / 540);
  const inverterSku = systemType === 'OFF_GRID'
    ? capacityKw <= 3 ? 'INV-HY-3K' : 'INV-HY-5K'
    : `INV-OG-${capacityKw}K`;

  const items = [
    { sku: 'PNL-MONO-540', quantity: panels, notes: `${capacityKw} kW array` },
    { sku: inverterSku, quantity: 1 },
    { sku: 'MNT-GI-KW', quantity: capacityKw },
    { sku: 'MNT-CLAMP-MID', quantity: panels * 2 },
    { sku: 'DCB-STD-2IN', quantity: 1 },
    { sku: capacityKw >= 5 ? 'ACB-STD-3P' : 'ACB-STD-1P', quantity: 1 },
    { sku: 'CBL-DC-4SQ', quantity: capacityKw * 30, notes: 'Roof to inverter' },
    { sku: 'CBL-AC-4SQ', quantity: capacityKw * 12, notes: 'Inverter to meter' },
    { sku: 'ERT-KIT-STD', quantity: 1 },
    { sku: 'ERT-LA-STD', quantity: 1 },
    { sku: 'CON-MC4-PR', quantity: panels + 2 },
    { sku: 'CON-CT-STD', quantity: 1 },
    { sku: 'SRV-INSTALL-KW', quantity: capacityKw },
  ];

  if (systemType === 'ON_GRID') {
    items.push({ sku: 'ACC-METER-NET', quantity: 1, notes: 'Net metering' });
  } else {
    // Battery bank sized at roughly 150 Ah per kW, plus the controller the hybrid needs.
    items.push({ sku: 'BAT-TUB-150', quantity: Math.max(2, capacityKw * 2) });
    items.push({ sku: capacityKw <= 2 ? 'CC-MPPT-30' : 'CC-MPPT-50', quantity: 1 });
  }

  return items;
}

/** 10 kit templates: 1–5 kW in both On-Grid and Off-Grid. */
export const KIT_TEMPLATES = [1, 2, 3, 4, 5].flatMap((kw) => [
  {
    name: `${kw} kW On-Grid`,
    systemType: 'ON_GRID',
    capacityKw: kw,
    description: `Grid-tied rooftop system for about ${kw * 120} units a month. Net metering ready, subsidy eligible.`,
    basePrice: kw * 48000,
    items: bom(kw, 'ON_GRID'),
  },
  {
    name: `${kw} kW Off-Grid`,
    systemType: 'OFF_GRID',
    capacityKw: kw,
    description: `Battery-backed rooftop system with ${Math.max(2, kw * 2)} x 150 Ah storage for outage-prone areas.`,
    basePrice: kw * 48000 + Math.max(2, kw * 2) * 17800 + 16200,
    items: bom(kw, 'OFF_GRID'),
  },
]);

/**
 * Creates every product and kit template with its full bill of materials.
 *
 * Flow: createMany products -> load them back keyed by sku -> create each template and its
 *       KitTemplateItem rows.
 * Example:
 *   const { products, kits } = await seedCatalog(prisma)
 *   // → products["INV-OG-3K"].id, kits["3 kW On-Grid"].id
 * Throws: nothing of its own; an unknown sku in a BOM would surface as a Prisma error.
 */
export async function seedCatalog(prisma) {
  await prisma.product.createMany({
    data: PRODUCTS.map((p) => ({
      sku: p.sku,
      name: p.name,
      category: p.category,
      brand: p.brand ?? null,
      specs: p.specs ?? null,
      unit: p.unit,
      isSerialized: p.isSerialized,
      warrantyMonths: p.warrantyMonths,
      costPrice: money(p.costPrice),
      sellPrice: money(p.sellPrice),
      taxPercent: '18.00',
      reorderLevel: p.reorderLevel ?? 0,
      stockQty: p.stockQty ?? 0,
    })),
  });

  const rows = await prisma.product.findMany();
  const products = Object.fromEntries(rows.map((p) => [p.sku, p]));

  const kits = {};
  for (const kit of KIT_TEMPLATES) {
    kits[kit.name] = await prisma.kitTemplate.create({
      data: {
        name: kit.name,
        systemType: kit.systemType,
        capacityKw: money(kit.capacityKw),
        description: kit.description,
        basePrice: money(kit.basePrice),
        items: {
          create: kit.items.map((item) => ({
            productId: products[item.sku].id,
            quantity: money(item.quantity),
            notes: item.notes ?? null,
          })),
        },
      },
    });
  }

  return { products, kits };
}
