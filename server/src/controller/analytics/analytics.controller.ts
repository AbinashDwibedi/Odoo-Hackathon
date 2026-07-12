import { Request, Response } from "express";
import { prisma } from "../../db/db.js";
import { sendSuccess } from "../../utils/responsehandler.js";

export const getDashboard = async (_req: Request, res: Response) => {
  const [
    vehicleCounts,
    maintenanceCount,
    activeTrips,
    expenseAggregate,
    fuelExpenses,
    tripsWithFuel,
  ] = await Promise.all([
    prisma.vehicle.groupBy({
      by: ["status"],
      _count: { id: true },
    }),
    prisma.vehicle.count({ where: { status: "IN_SHOP" } }),

    prisma.trip.count({ where: { status: "DISPATCHED" } }),

    prisma.expense.aggregate({ _sum: { amount: true } }),

    prisma.expense.aggregate({
      where: { type: "FUEL", liters: { not: null } },
      _sum: { liters: true, amount: true },
    }),

    prisma.trip.aggregate({
      where: { status: "COMPLETED", actualDistance: { not: null } },
      _sum: { actualDistance: true, fuelConsumed: true },
    }),
  ]);

  const totalVehicles = vehicleCounts.reduce((sum, g) => sum + g._count.id, 0);
  const availableVehicles =
    vehicleCounts.find((g) => g.status === "AVAILABLE")?._count.id ?? 0;
  const activeVehicles =
    vehicleCounts.find((g) => g.status === "ON_TRIP")?._count.id ?? 0;

  const fleetUtilizationPercent =
    totalVehicles > 0
      ? parseFloat(((activeVehicles / totalVehicles) * 100).toFixed(1))
      : 0;

  let averageFuelEfficiency = 0;

  const tripDistance = tripsWithFuel._sum.actualDistance ?? 0;
  const tripFuel = tripsWithFuel._sum.fuelConsumed ?? 0;

  if (tripFuel > 0 && tripDistance > 0) {
    averageFuelEfficiency = parseFloat((tripDistance / tripFuel).toFixed(2));
  } else if (
    (fuelExpenses._sum.liters ?? 0) > 0 &&
    tripDistance > 0
  ) {
    averageFuelEfficiency = parseFloat(
      (tripDistance / fuelExpenses._sum.liters!).toFixed(2)
    );
  }

  return sendSuccess(res, "Dashboard data fetched successfully", {
    kpis: {
      totalVehicles,
      activeVehicles,
      availableVehicles,
      vehiclesInMaintenance: maintenanceCount,
      activeTrips,
      fleetUtilizationPercent,
    },
    financials: {
      totalOperationalCost: parseFloat(
        (expenseAggregate._sum.amount ?? 0).toFixed(2)
      ),
      averageFuelEfficiency,
    },
  });
};
