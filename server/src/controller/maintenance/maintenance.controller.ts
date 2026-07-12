import { Request, Response } from "express";
import { prisma } from "../../db/db.js";
import {
  createSuccess,
  sendSuccess,
  sendError,
  validationError,
  notFoundError,
} from "../../utils/responsehandler.js";
import { MaintenanceStatus, VehicleStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// POST /api/v1/maintenance
// Role: Fleet Manager — logs a vehicle into the shop
// Body: { vehicleId, serviceType, cost, date, description?, mechanic? }
// ─────────────────────────────────────────────────────────────
export const createMaintenance = async (req: Request, res: Response) => {
  const { vehicleId, serviceType, cost, date, description, mechanic } = req.body;

  if (!vehicleId || !serviceType || cost === undefined || !date) {
    return validationError(res, "vehicleId, serviceType, cost, and date are required");
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
  if (!vehicle) return notFoundError(res, `Vehicle ${vehicleId} not found`);

  if (vehicle.status === VehicleStatus.ON_TRIP) {
    return sendError(res, "Cannot schedule maintenance for a vehicle currently on a trip", undefined, 409);
  }

  const [maintenanceLog] = await prisma.$transaction([
    // Create the maintenance record
    prisma.maintenanceLog.create({
      data: {
        vehicleId: Number(vehicleId),
        serviceType,
        cost: Number(cost),
        startDate: new Date(date),
        description: description ?? null,
        mechanic: mechanic ?? null,
        status: MaintenanceStatus.IN_PROGRESS,
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, name: true } },
      },
    }),
    // Side effect: put vehicle IN_SHOP
    prisma.vehicle.update({
      where: { id: Number(vehicleId) },
      data:  { status: VehicleStatus.IN_SHOP },
    }),
  ]);

  return createSuccess(res, maintenanceLog, "Maintenance scheduled and vehicle moved to IN_SHOP");
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/maintenance
// Query: ?vehicleId=1&status=IN_PROGRESS
// ─────────────────────────────────────────────────────────────
export const getMaintenanceLogs = async (req: Request, res: Response) => {
  const { vehicleId, status } = req.query;

  const where: any = {};

  if (vehicleId) {
    const id = parseInt(vehicleId as string);
    if (isNaN(id)) return validationError(res, "vehicleId must be a valid number");
    where.vehicleId = id;
  }

  if (status) {
    const upperStatus = (status as string).toUpperCase();
    if (!Object.values(MaintenanceStatus).includes(upperStatus as MaintenanceStatus)) {
      return validationError(res, `Invalid status. Allowed: ${Object.values(MaintenanceStatus).join(", ")}`);
    }
    where.status = upperStatus as MaintenanceStatus;
  }

  const logs = await prisma.maintenanceLog.findMany({
    where,
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true, type: true } },
    },
    orderBy: { startDate: "desc" },
  });

  return sendSuccess(res, "Maintenance logs fetched successfully", { data: logs, count: logs.length });
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/maintenance/:id/complete
// Marks the maintenance done and returns vehicle to AVAILABLE
// ─────────────────────────────────────────────────────────────
export const completeMaintenance = async (req: Request, res: Response) => {
  const maintenanceId = Number(req.params.id);

  const log = await prisma.maintenanceLog.findUnique({ where: { id: maintenanceId } });
  if (!log) return notFoundError(res, `Maintenance record ${maintenanceId} not found`);

  if (log.status === MaintenanceStatus.COMPLETED) {
    return sendError(res, "Maintenance record is already completed", undefined, 409);
  }

  if (log.status === MaintenanceStatus.CANCELLED) {
    return sendError(res, "Cannot complete a cancelled maintenance record", undefined, 409);
  }

  const [updatedLog] = await prisma.$transaction([
    // Mark maintenance completed
    prisma.maintenanceLog.update({
      where: { id: maintenanceId },
      data: {
        status: MaintenanceStatus.COMPLETED,
        endDate: new Date(),
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, name: true } },
      },
    }),
    // Side effect: return vehicle to AVAILABLE
    prisma.vehicle.update({
      where: { id: log.vehicleId },
      data:  { status: VehicleStatus.AVAILABLE },
    }),
  ]);

  return sendSuccess(res, "Maintenance completed and vehicle returned to AVAILABLE", updatedLog);
};
