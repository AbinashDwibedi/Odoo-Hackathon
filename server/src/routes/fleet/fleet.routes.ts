import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import {
  getVehicles,
  createVehicle,
  getDrivers,
  createDriver,
} from "../../controller/fleet/fleet.controller.js";

const fleetRouter = Router();

// ─── Vehicles ───────────────────────────────
// GET  /api/v1/fleet/vehicles  — list/filter vehicles
// POST /api/v1/fleet/vehicles  — create a new vehicle (Fleet Manager)
fleetRouter.get("/vehicles", asyncHandler(getVehicles));
fleetRouter.post("/vehicles", asyncHandler(createVehicle));

// ─── Drivers ────────────────────────────────
// GET  /api/v1/fleet/drivers   — list/filter drivers
// POST /api/v1/fleet/drivers   — create a new driver (Safety Officer)
fleetRouter.get("/drivers", asyncHandler(getDrivers));
fleetRouter.post("/drivers", asyncHandler(createDriver));

export default fleetRouter;
