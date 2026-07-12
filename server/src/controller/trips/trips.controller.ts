import { Request, Response } from "express";
import { prisma } from "../../db/db.js";
import {
  createSuccess,
  sendSuccess,
  sendError,
  validationError,
  notFoundError,
} from "../../utils/responsehandler.js";
import { TripStatus, VehicleStatus, DriverStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────
// POST /api/v1/trips
// Role: Dispatcher — creates a DRAFT trip
// ─────────────────────────────────────────────────────────────
export const createTrip = async (req: Request, res: Response) => {
  const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance } = req.body;

  if (!source || !destination || !vehicleId || !driverId || cargoWeight === undefined || plannedDistance === undefined) {
    return validationError(res, "source, destination, vehicleId, driverId, cargoWeight, and plannedDistance are required");
  }

  // Verify vehicle exists and is available
  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
  if (!vehicle) return notFoundError(res, `Vehicle ${vehicleId} not found`);
  if (vehicle.status !== VehicleStatus.AVAILABLE) {
    return sendError(res, `Vehicle is not available (current status: ${vehicle.status})`, undefined, 409);
  }

  // Verify driver exists and is available
  const driver = await prisma.driver.findUnique({ where: { id: Number(driverId) } });
  if (!driver) return notFoundError(res, `Driver ${driverId} not found`);
  if (driver.status !== DriverStatus.AVAILABLE) {
    return sendError(res, `Driver is not available (current status: ${driver.status})`, undefined, 409);
  }

  const trip = await prisma.trip.create({
    data: {
      source,
      destination,
      vehicleId: Number(vehicleId),
      driverId: Number(driverId),
      cargoWeight: Number(cargoWeight),
      plannedDistance: Number(plannedDistance),
      status: TripStatus.DRAFT,
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
      driver:  { select: { id: true, name: true, licenseNumber: true } },
    },
  });

  return createSuccess(res, trip, "Trip created successfully");
};

// ─────────────────────────────────────────────────────────────
// GET /api/v1/trips
// Query: ?status=DISPATCHED&dateRange=today
// ─────────────────────────────────────────────────────────────
export const getTrips = async (req: Request, res: Response) => {
  const { status, dateRange } = req.query;

  const where: any = {};

  if (status) {
    const upperStatus = (status as string).toUpperCase();
    if (!Object.values(TripStatus).includes(upperStatus as TripStatus)) {
      return validationError(res, `Invalid status. Allowed: ${Object.values(TripStatus).join(", ")}`);
    }
    where.status = upperStatus as TripStatus;
  }

  if (dateRange === "today") {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end   = new Date(); end.setHours(23, 59, 59, 999);
    where.createdAt = { gte: start, lte: end };
  }

  const trips = await prisma.trip.findMany({
    where,
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true, type: true } },
      driver:  { select: { id: true, name: true, contactNumber: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return sendSuccess(res, "Trips fetched successfully", { data: trips, count: trips.length });
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/trips/:id/dispatch
// Transitions DRAFT → DISPATCHED  (atomic transaction)
// ─────────────────────────────────────────────────────────────
export const dispatchTrip = async (req: Request, res: Response) => {
  const tripId = Number(req.params.id);

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return notFoundError(res, `Trip ${tripId} not found`);
  if (trip.status !== TripStatus.DRAFT) {
    return sendError(res, `Only DRAFT trips can be dispatched (current: ${trip.status})`, undefined, 409);
  }

  const [updatedTrip] = await prisma.$transaction([
    prisma.trip.update({
      where: { id: tripId },
      data: { status: TripStatus.DISPATCHED, dispatchedAt: new Date() },
      include: {
        vehicle: { select: { id: true, registrationNumber: true, name: true } },
        driver:  { select: { id: true, name: true } },
      },
    }),
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data:  { status: VehicleStatus.ON_TRIP },
    }),
    prisma.driver.update({
      where: { id: trip.driverId },
      data:  { status: DriverStatus.ON_TRIP },
    }),
  ]);

  return sendSuccess(res, "Trip dispatched successfully", updatedTrip);
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/trips/:id/complete
// Body: { finalOdometer, tollExpense?, fuelExpense?: { liters, cost } }
// ─────────────────────────────────────────────────────────────
export const completeTrip = async (req: Request, res: Response) => {
  const tripId = Number(req.params.id);
  const { finalOdometer, tollExpense, fuelExpense } = req.body;

  if (finalOdometer === undefined) {
    return validationError(res, "finalOdometer is required");
  }

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return notFoundError(res, `Trip ${tripId} not found`);
  if (trip.status !== TripStatus.DISPATCHED) {
    return sendError(res, `Only DISPATCHED trips can be completed (current: ${trip.status})`, undefined, 409);
  }

  const vehicle = await prisma.vehicle.findUnique({ where: { id: trip.vehicleId } });
  if (!vehicle) return notFoundError(res, "Associated vehicle not found");

  const actualDistance = Math.max(0, Number(finalOdometer) - vehicle.odometer);
  const fuelConsumed   = fuelExpense?.liters ? Number(fuelExpense.liters) : null;
  const now            = new Date();

  // Build atomic transaction operations
  const ops: any[] = [
    // 1. Mark trip completed
    prisma.trip.update({
      where: { id: tripId },
      data: {
        status: TripStatus.COMPLETED,
        completedAt: now,
        actualDistance,
        fuelConsumed,
      },
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        driver:  { select: { id: true, name: true } },
      },
    }),
    // 2. Revert vehicle → AVAILABLE, update odometer
    prisma.vehicle.update({
      where: { id: trip.vehicleId },
      data:  { status: VehicleStatus.AVAILABLE, odometer: Number(finalOdometer) },
    }),
    // 3. Revert driver → AVAILABLE
    prisma.driver.update({
      where: { id: trip.driverId },
      data:  { status: DriverStatus.AVAILABLE },
    }),
  ];

  // 4. Auto-generate fuel expense record
  if (fuelExpense?.cost) {
    ops.push(prisma.expense.create({
      data: {
        type: "FUEL",
        amount: Number(fuelExpense.cost),
        liters: fuelExpense.liters ? Number(fuelExpense.liters) : null,
        date: now,
        description: `Auto-generated fuel expense for trip #${tripId}`,
        vehicleId: trip.vehicleId,
        tripId,
      },
    }));
  }

  // 5. Auto-generate toll expense record
  if (tollExpense) {
    ops.push(prisma.expense.create({
      data: {
        type: "TOLL",
        amount: Number(tollExpense),
        date: now,
        description: `Auto-generated toll expense for trip #${tripId}`,
        vehicleId: trip.vehicleId,
        tripId,
      },
    }));
  }

  const [updatedTrip] = await prisma.$transaction(ops);

  return sendSuccess(res, "Trip completed successfully", updatedTrip);
};

// ─────────────────────────────────────────────────────────────
// PATCH /api/v1/trips/:id/cancel
// Aborts a DRAFT or DISPATCHED trip
// ─────────────────────────────────────────────────────────────
export const cancelTrip = async (req: Request, res: Response) => {
  const tripId = Number(req.params.id);

  const trip = await prisma.trip.findUnique({ where: { id: tripId } });
  if (!trip) return notFoundError(res, `Trip ${tripId} not found`);
  const cancellable: TripStatus[] = [TripStatus.DRAFT, TripStatus.DISPATCHED];
  if (!cancellable.includes(trip.status)) {
    return sendError(res, `Only DRAFT or DISPATCHED trips can be cancelled (current: ${trip.status})`, undefined, 409);
  }

  const ops: any[] = [
    prisma.trip.update({
      where: { id: tripId },
      data:  { status: TripStatus.CANCELLED },
      include: {
        vehicle: { select: { id: true, registrationNumber: true } },
        driver:  { select: { id: true, name: true } },
      },
    }),
  ];

  // Only revert statuses if trip was dispatched (vehicle/driver are ON_TRIP)
  if (trip.status === TripStatus.DISPATCHED) {
    ops.push(
      prisma.vehicle.update({ where: { id: trip.vehicleId }, data: { status: VehicleStatus.AVAILABLE } }),
      prisma.driver.update({  where: { id: trip.driverId  }, data: { status: DriverStatus.AVAILABLE  } }),
    );
  }

  const [updatedTrip] = await prisma.$transaction(ops);

  return sendSuccess(res, "Trip cancelled successfully", updatedTrip);
};
