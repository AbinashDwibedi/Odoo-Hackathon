import { Request, Response } from "express";
import { prisma } from "../../db/db.js";
import {
  sendSuccess,
  sendError,
  createSuccess,
  notFoundError,
  validationError,
  updateSuccess,
} from "../../utils/responsehandler.js";
import { MaintenanceStatus, VehicleStatus } from "@prisma/client";

// Helper to map user status ('Active', 'Completed') to DB enum
const mapToDbStatus = (status: string): MaintenanceStatus => {
  const norm = status.toLowerCase();
  if (norm === "active") return MaintenanceStatus.IN_PROGRESS;
  if (norm === "completed") return MaintenanceStatus.COMPLETED;
  
  // Also support direct DB enum strings
  const uppercase = status.toUpperCase();
  if (Object.values(MaintenanceStatus).includes(uppercase as MaintenanceStatus)) {
    return uppercase as MaintenanceStatus;
  }
  throw new Error(`Invalid maintenance status: ${status}. Expected 'Active' or 'Completed'`);
};

// Helper to map DB enum back to user status format
const mapToUserStatus = (status: MaintenanceStatus): string => {
  if (status === MaintenanceStatus.IN_PROGRESS || status === MaintenanceStatus.SCHEDULED) {
    return "Active";
  }
  if (status === MaintenanceStatus.COMPLETED) {
    return "Completed";
  }
  return status; // CANCELLED etc.
};

/**
 * Helper to safely parse floats
 */
function Float(val: any): number {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/**
 * Create a new Maintenance Log
 */
export const createMaintenance = async (req: Request, res: Response) => {
  try {
    const { vehicleId, serviceType, cost, date, status, description, partsUsed, mechanic } = req.body;

    if (!vehicleId || !serviceType || cost === undefined || !date) {
      return validationError(res, "Missing required fields: vehicleId, serviceType, cost, date");
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: Number(vehicleId) },
    });
    if (!vehicle) {
      return notFoundError(res, `Vehicle with ID ${vehicleId} not found`);
    }

    // Map user status (default is 'Active')
    let dbStatus: MaintenanceStatus = MaintenanceStatus.IN_PROGRESS;
    if (status) {
      try {
        dbStatus = mapToDbStatus(status);
      } catch (err: any) {
        return validationError(res, err.message);
      }
    }

    const startDate = new Date(date);
    const endDate = dbStatus === MaintenanceStatus.COMPLETED ? new Date() : null;

    const maintenanceLog = await prisma.$transaction(async (tx) => {
      const log = await tx.maintenanceLog.create({
        data: {
          vehicleId: Number(vehicleId),
          serviceType,
          cost: Float(cost),
          startDate,
          endDate,
          status: dbStatus,
          description,
          partsUsed: partsUsed || null,
          mechanic,
        },
      });

      // Update vehicle status
      if (dbStatus === MaintenanceStatus.IN_PROGRESS) {
        await tx.vehicle.update({
          where: { id: Number(vehicleId) },
          data: { status: VehicleStatus.IN_SHOP },
        });
      } else if (dbStatus === MaintenanceStatus.COMPLETED) {
        // If created as completed, ensure vehicle status is AVAILABLE (or remains AVAILABLE)
        await tx.vehicle.update({
          where: { id: Number(vehicleId) },
          data: { status: VehicleStatus.AVAILABLE },
        });
      }

      return log;
    });

    const userFriendlyResponse = {
      ...maintenanceLog,
      status: mapToUserStatus(maintenanceLog.status),
    };

    return createSuccess(res, userFriendlyResponse, "Maintenance log created successfully");
  } catch (error: any) {
    return sendError(res, "Error creating maintenance log", error.message);
  }
};

/**
 * Get all Maintenance Logs
 */
export const getMaintenanceLogs = async (req: Request, res: Response) => {
  try {
    const { vehicleId, status } = req.query;

    const where: any = {};
    if (vehicleId) {
      where.vehicleId = Number(vehicleId);
    }
    if (status) {
      try {
        where.status = mapToDbStatus(status as string);
      } catch (err) {
        where.status = status;
      }
    }

    const logs = await prisma.maintenanceLog.findMany({
      where,
      include: {
        vehicle: true,
      },
      orderBy: { startDate: "desc" },
    });

    const userFriendlyLogs = logs.map((log) => ({
      ...log,
      status: mapToUserStatus(log.status),
    }));

    return sendSuccess(res, "Maintenance logs retrieved successfully", userFriendlyLogs);
  } catch (error: any) {
    return sendError(res, "Error retrieving maintenance logs", error.message);
  }
};

/**
 * Get Maintenance Log by ID
 */
export const getMaintenanceLogById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const log = await prisma.maintenanceLog.findUnique({
      where: { id: Number(id) },
      include: {
        vehicle: true,
      },
    });

    if (!log) {
      return notFoundError(res, `Maintenance log with ID ${id} not found`);
    }

    const userFriendlyLog = {
      ...log,
      status: mapToUserStatus(log.status),
    };

    return sendSuccess(res, "Maintenance log retrieved successfully", userFriendlyLog);
  } catch (error: any) {
    return sendError(res, "Error retrieving maintenance log", error.message);
  }
};

/**
 * Complete an Active Maintenance Log
 */
export const completeMaintenance = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { cost, partsUsed, mechanic, endDate } = req.body;

    const log = await prisma.maintenanceLog.findUnique({
      where: { id: Number(id) },
    });

    if (!log) {
      return notFoundError(res, `Maintenance log with ID ${id} not found`);
    }

    if (log.status === MaintenanceStatus.COMPLETED) {
      return validationError(res, "Maintenance log is already completed");
    }

    const finalEndDate = endDate ? new Date(endDate) : new Date();

    const updatedLog = await prisma.$transaction(async (tx) => {
      const updated = await tx.maintenanceLog.update({
        where: { id: Number(id) },
        data: {
          status: MaintenanceStatus.COMPLETED,
          endDate: finalEndDate,
          cost: cost !== undefined ? Float(cost) : log.cost,
          partsUsed: partsUsed !== undefined ? partsUsed : log.partsUsed,
          mechanic: mechanic !== undefined ? mechanic : log.mechanic,
        },
      });

      // Update vehicle status back to AVAILABLE
      await tx.vehicle.update({
        where: { id: log.vehicleId },
        data: { status: VehicleStatus.AVAILABLE },
      });

      return updated;
    });

    const userFriendlyResponse = {
      ...updatedLog,
      status: mapToUserStatus(updatedLog.status),
    };

    return updateSuccess(res, userFriendlyResponse, "Maintenance log completed successfully");
  } catch (error: any) {
    return sendError(res, "Error completing maintenance log", error.message);
  }
};
