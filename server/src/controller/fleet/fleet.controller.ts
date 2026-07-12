import { Request, Response } from "express";
import { prisma } from "../../db/db.js";
import {
  createSuccess,
  createFailedError,
  sendSuccess,
  validationError,
} from "../../utils/responsehandler.js";
import { VehicleStatus, VehicleType, DriverStatus, LicenseCategory } from "@prisma/client";

// ─────────────────────────────────────────────
// VEHICLES
// ─────────────────────────────────────────────

/**
 * GET /api/v1/fleet/vehicles
 * Query Params: ?status=AVAILABLE&type=VAN&search=GJ01
 */
export const getVehicles = async (req: Request, res: Response) => {
  const { status, type, search } = req.query;

  const where: any = {};

  if (status) {
    const upperStatus = (status as string).toUpperCase();
    if (!Object.values(VehicleStatus).includes(upperStatus as VehicleStatus)) {
      return validationError(res, `Invalid status. Allowed: ${Object.values(VehicleStatus).join(", ")}`);
    }
    where.status = upperStatus as VehicleStatus;
  }

  if (type) {
    const upperType = (type as string).toUpperCase();
    if (!Object.values(VehicleType).includes(upperType as VehicleType)) {
      return validationError(res, `Invalid type. Allowed: ${Object.values(VehicleType).join(", ")}`);
    }
    where.type = upperType as VehicleType;
  }

  if (search) {
    where.OR = [
      { registrationNumber: { contains: search as string, mode: "insensitive" } },
      { name: { contains: search as string, mode: "insensitive" } },
    ];
  }

  const vehicles = await prisma.vehicle.findMany({
    where,
    select: {
      id: true,
      registrationNumber: true,
      name: true,
      model: true,
      type: true,
      maxLoadCapacity: true,
      status: true,
      odometer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  const data = vehicles.map((v) => ({
    id: v.id,
    registrationNumber: v.registrationNumber,
    nameModel: v.model ? `${v.name} ${v.model}` : v.name,
    type: v.type,
    capacity: v.maxLoadCapacity,
    status: v.status,
    odometer: v.odometer,
  }));

  return sendSuccess(res, "Vehicles fetched successfully", { data, count: data.length });
};

/**
 * POST /api/v1/fleet/vehicles
 * Body: { registrationNumber, nameModel, type, maxLoadCapacity, acquisitionCost, odometer }
 * Role: Fleet Manager
 */
export const createVehicle = async (req: Request, res: Response) => {
  const { registrationNumber, nameModel, type, maxLoadCapacity, acquisitionCost, odometer } = req.body;

  if (!registrationNumber || !nameModel || !type || maxLoadCapacity === undefined || acquisitionCost === undefined) {
    return validationError(res, "registrationNumber, nameModel, type, maxLoadCapacity, and acquisitionCost are required");
  }

  const upperType = (type as string).toUpperCase();
  if (!Object.values(VehicleType).includes(upperType as VehicleType)) {
    return validationError(res, `Invalid type. Allowed: ${Object.values(VehicleType).join(", ")}`);
  }

  const existing = await prisma.vehicle.findUnique({ where: { registrationNumber } });
  if (existing) {
    return validationError(res, `Vehicle with registration number '${registrationNumber}' already exists`);
  }

  const vehicle = await prisma.vehicle.create({
    data: {
      registrationNumber,
      name: nameModel,
      type: upperType as VehicleType,
      maxLoadCapacity: Number(maxLoadCapacity),
      acquisitionCost: Number(acquisitionCost),
      odometer: odometer !== undefined ? Number(odometer) : 0,
    },
  });

  if (!vehicle) {
    return createFailedError(res, null, "Failed to create vehicle");
  }

  return createSuccess(res, vehicle, "Vehicle created successfully");
};

// ─────────────────────────────────────────────
// DRIVERS
// ─────────────────────────────────────────────

/**
 * GET /api/v1/fleet/drivers
 * Query Params: ?status=AVAILABLE&category=LMV
 */
export const getDrivers = async (req: Request, res: Response) => {
  const { status, category } = req.query;

  const where: any = {};

  if (status) {
    const upperStatus = (status as string).toUpperCase();
    if (!Object.values(DriverStatus).includes(upperStatus as DriverStatus)) {
      return validationError(res, `Invalid status. Allowed: ${Object.values(DriverStatus).join(", ")}`);
    }
    where.status = upperStatus as DriverStatus;
  }

  if (category) {
    const upperCategory = (category as string).toUpperCase();
    if (!Object.values(LicenseCategory).includes(upperCategory as LicenseCategory)) {
      return validationError(res, `Invalid license category. Allowed: ${Object.values(LicenseCategory).join(", ")}`);
    }
    where.licenseCategory = upperCategory as LicenseCategory;
  }

  const drivers = await prisma.driver.findMany({
    where,
    select: {
      id: true,
      name: true,
      licenseNumber: true,
      licenseCategory: true,
      licenseExpiry: true,
      contactNumber: true,
      status: true,
      safetyScore: true,
      tripCompletionRate: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return sendSuccess(res, "Drivers fetched successfully", { data: drivers, count: drivers.length });
};

/**
 * POST /api/v1/fleet/drivers
 * Body: { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber }
 * Role: Safety Officer
 */
export const createDriver = async (req: Request, res: Response) => {
  const { name, licenseNumber, licenseCategory, licenseExpiry, contactNumber } = req.body;

  if (!name || !licenseNumber || !licenseCategory || !licenseExpiry || !contactNumber) {
    return validationError(res, "name, licenseNumber, licenseCategory, licenseExpiry, and contactNumber are required");
  }

  const upperCategory = (licenseCategory as string).toUpperCase();
  if (!Object.values(LicenseCategory).includes(upperCategory as LicenseCategory)) {
    return validationError(res, `Invalid licenseCategory. Allowed: ${Object.values(LicenseCategory).join(", ")}`);
  }

  const existing = await prisma.driver.findUnique({ where: { licenseNumber } });
  if (existing) {
    return validationError(res, `Driver with license number '${licenseNumber}' already exists`);
  }

  const driver = await prisma.driver.create({
    data: {
      name,
      licenseNumber,
      licenseCategory: upperCategory as LicenseCategory,
      licenseExpiry: new Date(licenseExpiry),
      contactNumber,
    },
  });

  if (!driver) {
    return createFailedError(res, null, "Failed to create driver");
  }

  return createSuccess(res, driver, "Driver created successfully");
};
