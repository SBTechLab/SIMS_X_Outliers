import { prisma } from '../../core/prisma.js';
import { AppError } from '../../core/AppError.js';
import { paginate } from '../../core/pagination.js';
import { emitEvent } from '../../core/events.js';
import { notifyRole, notifyUsers } from '../../core/notify.js';

const DISPATCH_INCLUDE = {
  project: {
    select: {
      id: true, code: true, status: true,
      customer: { select: { id: true, name: true, phone: true, city: true } },
    },
  },
  packedBy: { select: { id: true, name: true } },
  lines: {
    include: {
      product: { select: { id: true, sku: true, name: true, category: true, isSerialized: true, unit: true } },
    },
    orderBy: { createdAt: 'asc' },
  },
  serialUnits: {
    select: { id: true, serialNumber: true, status: true, productId: true },
  },
};

/**
 * Lists dispatch records.
 * Why: warehouse list of all deliveries with status.
 * Flow: paginate with project + customer join.
 * Example: await listDispatches({ status: 'PENDING' })
 * Throws: nothing.
 */
export async function listDispatches(query) {
  const { skip, take, meta } = paginate(query);
  const where = {};
  if (query.status) where.status = query.status;

  const [rows, total] = await prisma.$transaction([
    prisma.dispatch.findMany({
      where, skip, take, orderBy: { createdAt: 'desc' },
      include: {
        project: {
          select: {
            id: true, code: true, status: true,
            customer: { select: { id: true, name: true, city: true } },
          },
        },
        _count: { select: { lines: true } },
      },
    }),
    prisma.dispatch.count({ where }),
  ]);
  return { rows, meta: meta(total) };
}

/**
 * Gets one dispatch with full pick-list.
 * Why: packing screen shows all lines and scanned serials.
 * Flow: findUnique with deep includes.
 * Example: await getDispatch("dsp_123")
 * Throws: AppError 404.
 */
export async function getDispatch(id) {
  const dispatch = await prisma.dispatch.findUnique({ where: { id }, include: DISPATCH_INCLUDE });
  if (!dispatch) throw new AppError('Dispatch not found', 404, 'NOT_FOUND');
  return dispatch;
}

/**
 * Starts packing a dispatch (status: PENDING → PACKING).
 * Why: warehouse manager begins the pick-and-pack flow.
 * Flow: verify status is PENDING, update.
 * Example: await startPacking("dsp_123", userId)
 * Throws: AppError 422 if not PENDING.
 */
export async function startPacking(id, userId) {
  const dispatch = await getDispatch(id);
  if (dispatch.status !== 'PENDING') {
    throw new AppError('Dispatch is not in PENDING state', 422, 'INVALID_STATUS');
  }
  const updated = await prisma.dispatch.update({
    where: { id },
    data: { status: 'PACKING', packedById: userId },
    include: DISPATCH_INCLUDE,
  });
  // Update project status
  await prisma.project.update({ where: { id: dispatch.projectId }, data: { status: 'PACKING' } });
  return updated;
}

/**
 * Scans a serial unit into a dispatch line (BR-07, BR-08).
 * Why: the scan validates the serial belongs to this dispatch's product line.
 * Flow: find serial by number, validate product matches a dispatch line, assign to dispatch.
 * Example: await scanSerial("dsp_123", "PANEL-2026-001")
 * Throws: AppError 404 on missing serial, 422 on mismatch or already scanned.
 */
export async function scanSerial(dispatchId, serialNumber) {
  const dispatch = await getDispatch(dispatchId);
  if (!['PACKING', 'READY'].includes(dispatch.status)) {
    throw new AppError('Dispatch is not in a packable state', 422, 'INVALID_STATUS');
  }

  const serial = await prisma.serialUnit.findUnique({ where: { serialNumber } });
  if (!serial) throw new AppError(`Serial ${serialNumber} not found`, 404, 'NOT_FOUND');
  if (serial.status !== 'IN_STOCK') {
    throw new AppError(`Serial ${serialNumber} is not IN_STOCK (current: ${serial.status})`, 422, 'INVALID_STATUS');
  }

  // Check that this serial's product is on a dispatch line
  const line = dispatch.lines.find(l => l.productId === serial.productId);
  if (!line) {
    throw new AppError(`Serial product not found in dispatch pick-list`, 422, 'PRODUCT_MISMATCH');
  }

  // Check not already scanned into this dispatch
  const alreadyScanned = dispatch.serialUnits.find(s => s.id === serial.id);
  if (alreadyScanned) throw new AppError('Serial already scanned in this dispatch', 422, 'DUPLICATE');

  // Assign serial to dispatch and project (BR-08: one project only)
  if (serial.projectId && serial.projectId !== dispatch.projectId) {
    throw new AppError(`Serial ${serialNumber} already belongs to project ${serial.projectId}`, 422, 'ALREADY_ASSIGNED');
  }

  const updated = await prisma.$transaction([
    prisma.serialUnit.update({
      where: { id: serial.id },
      data: {
        status: 'RESERVED',
        dispatchId,
        projectId: dispatch.projectId,
      },
    }),
    prisma.dispatchLine.update({
      where: { id: line.id },
      data: { scannedQty: { increment: 1 } },
    }),
  ]);

  return { serial: updated[0], line: updated[1] };
}

/**
 * Marks packed quantity for a non-serialized dispatch line.
 * Why: cable, connectors etc. are confirmed packed by count, not serial scan.
 * Flow: verify line is non-serialized, set packedQty.
 * Example: await packLine("dsp_123", "line_456", 50)
 * Throws: AppError 422 if serialized.
 */
export async function packLine(dispatchId, lineId, packedQty) {
  const dispatch = await getDispatch(dispatchId);
  if (!['PACKING', 'READY'].includes(dispatch.status)) {
    throw new AppError('Dispatch is not in a packable state', 422, 'INVALID_STATUS');
  }
  const line = dispatch.lines.find(l => l.id === lineId);
  if (!line) throw new AppError('Line not found in dispatch', 404, 'NOT_FOUND');
  if (line.product.isSerialized) {
    throw new AppError('Serialized lines are packed by scanning, not quantity', 422, 'INVALID');
  }
  return prisma.dispatchLine.update({ where: { id: lineId }, data: { packedQty } });
}

/**
 * Marks a dispatch as ready to ship (validates all lines are packed — BR-07).
 * Why: completeness check before the truck leaves.
 * Flow: verify all serialized lines have scannedQty >= requiredQty, all non-serialized have packedQty.
 * Example: await markReady("dsp_123")
 * Throws: AppError 422 if any line is incomplete.
 */
export async function markReady(id) {
  const dispatch = await getDispatch(id);
  if (!['PACKING'].includes(dispatch.status)) {
    throw new AppError('Dispatch must be in PACKING state to mark ready', 422, 'INVALID_STATUS');
  }

  for (const line of dispatch.lines) {
    const required = parseFloat(line.requiredQty);
    if (line.product.isSerialized) {
      if (parseFloat(line.scannedQty) < required) {
        throw new AppError(`${line.product.name}: scanned ${line.scannedQty}/${line.requiredQty}`, 422, 'INCOMPLETE');
      }
    } else {
      if (parseFloat(line.packedQty) < required) {
        throw new AppError(`${line.product.name}: packed ${line.packedQty}/${line.requiredQty}`, 422, 'INCOMPLETE');
      }
    }
  }

  return prisma.dispatch.update({ where: { id }, data: { status: 'READY' }, include: DISPATCH_INCLUDE });
}

/**
 * Dispatches goods — records vehicle and driver, sets status DISPATCHED.
 * Why: the truck is on the road; project status advances to DISPATCHED.
 * Flow: verify READY, set vehicleNo/driverName/driverPhone, emit event.
 * Example: await dispatchGoods("dsp_123", { vehicleNo: 'GJ01AB1234', ... })
 * Throws: AppError 422 if not READY.
 */
export async function dispatchGoods(id, data, userId) {
  const dispatch = await getDispatch(id);
  if (dispatch.status !== 'READY') {
    throw new AppError('Dispatch must be READY before dispatching', 422, 'INVALID_STATUS');
  }

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.dispatch.update({
      where: { id },
      data: {
        status: 'DISPATCHED',
        vehicleNo: data.vehicleNo,
        driverName: data.driverName,
        driverPhone: data.driverPhone,
        dispatchedAt: new Date(),
      },
      include: DISPATCH_INCLUDE,
    });
    await tx.project.update({ where: { id: dispatch.projectId }, data: { status: 'DISPATCHED' } });
    await tx.serialUnit.updateMany({
      where: { dispatchId: id, status: 'RESERVED' },
      data: { status: 'DISPATCHED' },
    });
    return d;
  });

  // Notify customer
  const customer = dispatch.project?.customer;
  if (customer?.userId) {
    await notifyUsers([customer.userId], 'DISPATCH', `Your order is on the way — vehicle ${data.vehicleNo}`, `/portal/projects`);
  }
  emitEvent('dispatch.dispatched', { dispatchId: id, projectId: dispatch.projectId });
  return updated;
}

/**
 * Records delivery and creates warranty rows (BR-09).
 * Why: on delivery, each delivered serial gets a warranty record with
 *      startDate = deliveredAt and endDate = start + product.warrantyMonths.
 * Flow: verify DISPATCHED, set deliveredAt, create warranties in tx, emit event.
 * Example: await recordDelivery("dsp_123", { receivedByName: 'Ramesh', deliveredAt: '...' })
 * Throws: AppError 422 if not DISPATCHED.
 */
export async function recordDelivery(id, data) {
  const dispatch = await getDispatch(id);
  if (dispatch.status !== 'DISPATCHED') {
    throw new AppError('Dispatch must be DISPATCHED before recording delivery', 422, 'INVALID_STATUS');
  }

  const deliveredAt = data.deliveredAt ? new Date(data.deliveredAt) : new Date();

  const updated = await prisma.$transaction(async (tx) => {
    const d = await tx.dispatch.update({
      where: { id },
      data: { status: 'DELIVERED', deliveredAt, receivedByName: data.receivedByName },
      include: DISPATCH_INCLUDE,
    });

    await tx.project.update({
      where: { id: dispatch.projectId },
      data: { status: 'DELIVERED', deliveredAt },
    });

    // Update serial statuses
    await tx.serialUnit.updateMany({
      where: { dispatchId: id, status: 'DISPATCHED' },
      data: { status: 'DELIVERED' },
    });

    // BR-09: create warranty per delivered serial
    const deliveredSerials = await tx.serialUnit.findMany({
      where: { dispatchId: id },
      include: { product: { select: { warrantyMonths: true } } },
    });

    const project = await tx.project.findUnique({ where: { id: dispatch.projectId }, select: { customerId: true } });

    for (const serial of deliveredSerials) {
      const endDate = new Date(deliveredAt);
      endDate.setMonth(endDate.getMonth() + serial.product.warrantyMonths);

      // Idempotent: skip if warranty row already exists
      const existing = await tx.warranty.findUnique({ where: { serialUnitId: serial.id } });
      if (!existing) {
        await tx.warranty.create({
          data: {
            serialUnitId: serial.id,
            customerId: project.customerId,
            projectId: dispatch.projectId,
            startDate: deliveredAt,
            endDate,
          },
        });
      }
    }

    return d;
  });

  emitEvent('dispatch.delivered', { dispatchId: id, projectId: dispatch.projectId });
  return updated;
}
