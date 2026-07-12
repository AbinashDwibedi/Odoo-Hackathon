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
import { TripStatus, VehicleStatus, DriverStatus } from "@prisma/client";

// Helper to map mixed-case status to DB enum
const mapToDbStatus = (status: string): TripStatus => {
  const normalized = status.toUpperCase();
  if (Object.values(TripStatus).includes(normalized as TripStatus)) {
    return normalized as TripStatus;
  }
  throw new Error(`Invalid trip status: ${status}`);
};

/**
 * Create a new Trip (default status: DRAFT)
 */
export const createTrip = async (req: Request, res: Response) => {
  try {
    const {
      tripId,
      source,
      destination,
      vehicleId,
      driverId,
      cargoWeight,
      plannedDistance,
      status,
      notes,
    } = req.body;

    // Validate required fields
    if (!tripId || !source || !destination || !vehicleId || !driverId || cargoWeight === undefined || plannedDistance === undefined) {
      return validationError(res, "Missing required fields: tripId, source, destination, vehicleId, driverId, cargoWeight, plannedDistance");
    }

    // Check if tripId is already taken
    const existingTrip = await prisma.trip.findUnique({
      where: { tripId },
    });
    if (existingTrip) {
      return validationError(res, `Trip with ID '${tripId}' already exists`);
    }

    // Check if vehicle exists
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: Number(vehicleId) },
    });
    if (!vehicle) {
      return notFoundError(res, `Vehicle with ID ${vehicleId} not found`);
    }

    // Check if driver exists
    const driver = await prisma.driver.findUnique({
      where: { id: Number(driverId) },
    });
    if (!driver) {
      return notFoundError(res, `Driver with ID ${driverId} not found`);
    }

    // Determine status (default to DRAFT)
    let tripStatus: TripStatus = TripStatus.DRAFT;
    if (status) {
      try {
        tripStatus = mapToDbStatus(status);
      } catch (err: any) {
        return validationError(res, err.message);
      }
    }

    // If initial status is DISPATCHED, check availability and set vehicle/driver to ON_TRIP
    if (tripStatus === TripStatus.DISPATCHED) {
      if (vehicle.status !== VehicleStatus.AVAILABLE) {
        return validationError(res, `Vehicle ${vehicle.registrationNumber} is not available (current status: ${vehicle.status})`);
      }
      if (driver.status !== DriverStatus.AVAILABLE) {
        return validationError(res, `Driver ${driver.name} is not available (current status: ${driver.status})`);
      }
    }

    const trip = await prisma.$transaction(async (tx) => {
      const newTrip = await tx.trip.create({
        data: {
          tripId,
          source,
          destination,
          cargoWeight: Float(cargoWeight),
          plannedDistance: Float(plannedDistance),
          status: tripStatus,
          vehicleId: Number(vehicleId),
          driverId: Number(driverId),
          notes,
          ...(tripStatus === TripStatus.DISPATCHED ? { dispatchedAt: new Date() } : {}),
        },
      });

      if (tripStatus === TripStatus.DISPATCHED) {
        await tx.vehicle.update({
          where: { id: Number(vehicleId) },
          data: { status: VehicleStatus.ON_TRIP },
        });

        await tx.driver.update({
          where: { id: Number(driverId) },
          data: { status: DriverStatus.ON_TRIP },
        });
      }

      return newTrip;
    });

    return createSuccess(res, trip, "Trip created successfully");
  } catch (error: any) {
    return sendError(res, "Error creating trip", error.message);
  }
};

/**
 * Helper to safely parse floats
 */
function Float(val: any): number {
  const num = parseFloat(val);
  return isNaN(num) ? 0 : num;
}

/**
 * Get all Trips with filtering and pagination
 */
export const getTrips = async (req: Request, res: Response) => {
  try {
    const { status, vehicleId, driverId, page = 1, limit = 10 } = req.query;

    const where: any = {};
    if (status) {
      try {
        where.status = mapToDbStatus(status as string);
      } catch (err) {
        // ignore invalid status filter or return empty
        where.status = status;
      }
    }
    if (vehicleId) {
      where.vehicleId = Number(vehicleId);
    }
    if (driverId) {
      where.driverId = Number(driverId);
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [trips, total] = await Promise.all([
      prisma.trip.findMany({
        where,
        skip,
        take,
        include: {
          vehicle: true,
          driver: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      prisma.trip.count({ where }),
    ]);

    return sendSuccess(res, "Trips retrieved successfully", {
      trips,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error: any) {
    return sendError(res, "Error retrieving trips", error.message);
  }
};

/**
 * Get Trip by ID (using primary key ID or unique tripId string)
 */
export const getTripById = async (req: Request, res: Response) => {
  try {
    const idStr = req.params.id as string;

    // Search by auto-increment ID if it is a number, otherwise by tripId string
    const isNumeric = /^\d+$/.test(idStr);
    const trip = await prisma.trip.findFirst({
      where: isNumeric
        ? {
            OR: [{ id: Number(idStr) }, { tripId: idStr }],
          }
        : { tripId: idStr },
      include: {
        vehicle: true,
        driver: true,
        expenses: true,
      },
    });

    if (!trip) {
      return notFoundError(res, `Trip with ID '${idStr}' not found`);
    }

    return sendSuccess(res, "Trip retrieved successfully", trip);
  } catch (error: any) {
    return sendError(res, "Error retrieving trip", error.message);
  }
};

/**
 * Update Trip details (only permitted for DRAFT or DISPATCHED trips)
 */
export const updateTrip = async (req: Request, res: Response) => {
  try {
    const idStr = req.params.id as string;
    const { source, destination, vehicleId, driverId, cargoWeight, plannedDistance, notes } = req.body;

    const isNumeric = /^\d+$/.test(idStr);
    const trip = await prisma.trip.findFirst({
      where: isNumeric
        ? {
            OR: [{ id: Number(idStr) }, { tripId: idStr }],
          }
        : { tripId: idStr },
    });

    if (!trip) {
      return notFoundError(res, `Trip with ID '${idStr}' not found`);
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      return validationError(res, `Cannot update a trip that is already ${trip.status}`);
    }

    // Build update object
    const updateData: any = {};
    if (source) updateData.source = source;
    if (destination) updateData.destination = destination;
    if (notes !== undefined) updateData.notes = notes;
    if (cargoWeight !== undefined) updateData.cargoWeight = Float(cargoWeight);
    if (plannedDistance !== undefined) updateData.plannedDistance = Float(plannedDistance);

    if (vehicleId) {
      const vehicle = await prisma.vehicle.findUnique({
        where: { id: Number(vehicleId) },
      });
      if (!vehicle) {
        return notFoundError(res, `Vehicle with ID ${vehicleId} not found`);
      }
      // If trip is dispatched, and vehicle is changing, check new vehicle availability
      if (trip.status === TripStatus.DISPATCHED && trip.vehicleId !== Number(vehicleId)) {
        if (vehicle.status !== VehicleStatus.AVAILABLE) {
          return validationError(res, `New vehicle ${vehicle.registrationNumber} is not available (status: ${vehicle.status})`);
        }
      }
      updateData.vehicleId = Number(vehicleId);
    }

    if (driverId) {
      const driver = await prisma.driver.findUnique({
        where: { id: Number(driverId) },
      });
      if (!driver) {
        return notFoundError(res, `Driver with ID ${driverId} not found`);
      }
      // If trip is dispatched, and driver is changing, check new driver availability
      if (trip.status === TripStatus.DISPATCHED && trip.driverId !== Number(driverId)) {
        if (driver.status !== DriverStatus.AVAILABLE) {
          return validationError(res, `New driver ${driver.name} is not available (status: ${driver.status})`);
        }
      }
      updateData.driverId = Number(driverId);
    }

    const updated = await prisma.$transaction(async (tx) => {
      // If trip is dispatched and vehicle/driver are changing, release the old ones
      if (trip.status === TripStatus.DISPATCHED) {
        if (updateData.vehicleId && updateData.vehicleId !== trip.vehicleId) {
          await tx.vehicle.update({
            where: { id: trip.vehicleId },
            data: { status: VehicleStatus.AVAILABLE },
          });
          await tx.vehicle.update({
            where: { id: updateData.vehicleId },
            data: { status: VehicleStatus.ON_TRIP },
          });
        }
        if (updateData.driverId && updateData.driverId !== trip.driverId) {
          await tx.driver.update({
            where: { id: trip.driverId },
            data: { status: DriverStatus.AVAILABLE },
          });
          await tx.driver.update({
            where: { id: updateData.driverId },
            data: { status: DriverStatus.ON_TRIP },
          });
        }
      }

      return tx.trip.update({
        where: { id: trip.id },
        data: updateData,
      });
    });

    return updateSuccess(res, updated, "Trip updated successfully");
  } catch (error: any) {
    return sendError(res, "Error updating trip", error.message);
  }
};

/**
 * Dispatch Trip (Transitions DRAFT -> DISPATCHED)
 */
export const dispatchTrip = async (req: Request, res: Response) => {
  try {
    const idStr = req.params.id as string;

    const isNumeric = /^\d+$/.test(idStr);
    const trip = await prisma.trip.findFirst({
      where: isNumeric
        ? {
            OR: [{ id: Number(idStr) }, { tripId: idStr }],
          }
        : { tripId: idStr },
      include: {
        vehicle: true,
        driver: true,
      },
    });

    if (!trip) {
      return notFoundError(res, `Trip with ID '${idStr}' not found`);
    }

    if (trip.status !== TripStatus.DRAFT) {
      return validationError(res, `Only DRAFT trips can be dispatched. Current status: ${trip.status}`);
    }

    // Verify availability
    if (trip.vehicle.status !== VehicleStatus.AVAILABLE) {
      return validationError(res, `Vehicle ${trip.vehicle.registrationNumber} is not available (current status: ${trip.vehicle.status})`);
    }
    if (trip.driver.status !== DriverStatus.AVAILABLE) {
      return validationError(res, `Driver ${trip.driver.name} is not available (current status: ${trip.driver.status})`);
    }

    const updatedTrip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: TripStatus.DISPATCHED,
          dispatchedAt: new Date(),
        },
      });

      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: { status: VehicleStatus.ON_TRIP },
      });

      await tx.driver.update({
        where: { id: trip.driverId },
        data: { status: DriverStatus.ON_TRIP },
      });

      return t;
    });

    return updateSuccess(res, updatedTrip, "Trip dispatched successfully");
  } catch (error: any) {
    return sendError(res, "Error dispatching trip", error.message);
  }
};

/**
 * Complete Trip (Transitions DISPATCHED -> COMPLETED)
 */
export const completeTrip = async (req: Request, res: Response) => {
  try {
    const idStr = req.params.id as string;
    const { actualDistance, fuelConsumed } = req.body;

    if (actualDistance === undefined) {
      return validationError(res, "Missing actualDistance in request body");
    }

    const isNumeric = /^\d+$/.test(idStr);
    const trip = await prisma.trip.findFirst({
      where: isNumeric
        ? {
            OR: [{ id: Number(idStr) }, { tripId: idStr }],
          }
        : { tripId: idStr },
    });

    if (!trip) {
      return notFoundError(res, `Trip with ID '${idStr}' not found`);
    }

    if (trip.status !== TripStatus.DISPATCHED) {
      return validationError(res, `Only DISPATCHED trips can be completed. Current status: ${trip.status}`);
    }

    const distance = Float(actualDistance);
    const fuel = fuelConsumed !== undefined ? Float(fuelConsumed) : null;

    const updatedTrip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: TripStatus.COMPLETED,
          completedAt: new Date(),
          actualDistance: distance,
          fuelConsumed: fuel,
        },
      });

      // Update vehicle status back to AVAILABLE and increment odometer
      await tx.vehicle.update({
        where: { id: trip.vehicleId },
        data: {
          status: VehicleStatus.AVAILABLE,
          odometer: { increment: distance },
        },
      });

      // Update driver status back to AVAILABLE
      await tx.driver.update({
        where: { id: trip.driverId },
        data: {
          status: DriverStatus.AVAILABLE,
        },
      });

      return t;
    });

    return updateSuccess(res, updatedTrip, "Trip completed successfully");
  } catch (error: any) {
    return sendError(res, "Error completing trip", error.message);
  }
};

/**
 * Cancel Trip (Transitions to CANCELLED)
 */
export const cancelTrip = async (req: Request, res: Response) => {
  try {
    const idStr = req.params.id as string;

    const isNumeric = /^\d+$/.test(idStr);
    const trip = await prisma.trip.findFirst({
      where: isNumeric
        ? {
            OR: [{ id: Number(idStr) }, { tripId: idStr }],
          }
        : { tripId: idStr },
    });

    if (!trip) {
      return notFoundError(res, `Trip with ID '${idStr}' not found`);
    }

    if (trip.status === TripStatus.COMPLETED || trip.status === TripStatus.CANCELLED) {
      return validationError(res, `Trip is already ${trip.status}`);
    }

    const originalStatus = trip.status;

    const updatedTrip = await prisma.$transaction(async (tx) => {
      const t = await tx.trip.update({
        where: { id: trip.id },
        data: {
          status: TripStatus.CANCELLED,
        },
      });

      // If it was already dispatched, release vehicle and driver
      if (originalStatus === TripStatus.DISPATCHED) {
        await tx.vehicle.update({
          where: { id: trip.vehicleId },
          data: { status: VehicleStatus.AVAILABLE },
        });

        await tx.driver.update({
          where: { id: trip.driverId },
          data: { status: DriverStatus.AVAILABLE },
        });
      }

      return t;
    });

    return updateSuccess(res, updatedTrip, "Trip cancelled successfully");
  } catch (error: any) {
    return sendError(res, "Error cancelling trip", error.message);
  }
};
