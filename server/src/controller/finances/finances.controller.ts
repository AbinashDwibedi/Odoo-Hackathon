import { Request, Response } from "express";
import { prisma } from "../../db/db.js";
import {
  sendSuccess,
  createSuccess,
  validationError,
  notFoundError,
} from "../../utils/responsehandler.js";
import { ExpenseType } from "@prisma/client";
export const getExpenses = async (req: Request, res: Response) => {
  const { vehicleId, type, startDate, endDate } = req.query;

  const where: any = {};

  if (vehicleId) {
    const id = parseInt(vehicleId as string);
    if (isNaN(id)) return validationError(res, "vehicleId must be a valid number");
    where.vehicleId = id;
  }

  if (type) {
    const upperType = (type as string).toUpperCase();
    if (!Object.values(ExpenseType).includes(upperType as ExpenseType)) {
      return validationError(
        res,
        `Invalid type. Allowed: ${Object.values(ExpenseType).join(", ")}`
      );
    }
    where.type = upperType as ExpenseType;
  }

  if (startDate || endDate) {
    where.date = {};
    if (startDate) {
      const start = new Date(startDate as string);
      if (isNaN(start.getTime())) return validationError(res, "Invalid startDate format");
      where.date.gte = start;
    }
    if (endDate) {
      const end = new Date(endDate as string);
      if (isNaN(end.getTime())) return validationError(res, "Invalid endDate format");
      // Include the full end day
      end.setHours(23, 59, 59, 999);
      where.date.lte = end;
    }
  }

  const expenses = await prisma.expense.findMany({
    where,
    include: {
      vehicle: {
        select: { id: true, registrationNumber: true, name: true },
      },
      trip: {
        select: { id: true, tripId: true, source: true, destination: true },
      },
    },
    orderBy: { date: "desc" },
  });

  // Aggregate total for the filtered set
  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  return sendSuccess(res, "Expenses fetched successfully", {
    data: expenses,
    count: expenses.length,
    totalAmount: parseFloat(total.toFixed(2)),
  });
};

export const createExpense = async (req: Request, res: Response) => {
  const { vehicleId, type, amount, date, description, liters, tripId } = req.body;

  if (!vehicleId || !type || amount === undefined || !date) {
    return validationError(res, "vehicleId, type, amount, and date are required");
  }

  const upperType = (type as string).toUpperCase();
  if (!Object.values(ExpenseType).includes(upperType as ExpenseType)) {
    return validationError(
      res,
      `Invalid type. Allowed: ${Object.values(ExpenseType).join(", ")}`
    );
  }

  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount <= 0) {
    return validationError(res, "amount must be a positive number");
  }

  const expenseDate = new Date(date);
  if (isNaN(expenseDate.getTime())) {
    return validationError(res, "Invalid date format");
  }

  // ── Verify vehicle exists ──
  const vehicle = await prisma.vehicle.findUnique({ where: { id: Number(vehicleId) } });
  if (!vehicle) return notFoundError(res, `Vehicle with id ${vehicleId} not found`);

  // ── Optionally verify trip exists ──
  if (tripId) {
    const trip = await prisma.trip.findUnique({ where: { id: Number(tripId) } });
    if (!trip) return notFoundError(res, `Trip with id ${tripId} not found`);
  }

  const expense = await prisma.expense.create({
    data: {
      vehicleId: Number(vehicleId),
      type: upperType as ExpenseType,
      amount: parsedAmount,
      date: expenseDate,
      description: description ?? null,
      liters: liters !== undefined ? parseFloat(liters) : null,
      tripId: tripId ? Number(tripId) : null,
    },
    include: {
      vehicle: { select: { id: true, registrationNumber: true, name: true } },
    },
  });

  return createSuccess(res, expense, "Expense logged successfully");
};
