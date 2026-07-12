import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import {
  getVehicles,
  createVehicle,
  getDrivers,
  createDriver,
} from "../../controller/fleet/fleet.controller.js";
import { authValidation } from "../../middlewares/authMiddleware/auth.middleware.js";
import {
  fleetManagerAuthValidation,
  safetyOfficerAuthValidation,
} from "../../middlewares/authMiddleware/roleBased.auth.middleware.js";

const fleetRouter = Router();

// ─── Vehicles ───────────────────────────────
// GET  /api/v1/fleet/vehicles  — any authenticated user
// POST /api/v1/fleet/vehicles  — Fleet Manager only
fleetRouter.get("/vehicles", authValidation, asyncHandler(getVehicles));
fleetRouter.post("/vehicles", fleetManagerAuthValidation, asyncHandler(createVehicle));

// ─── Drivers ────────────────────────────────
// GET  /api/v1/fleet/drivers   — any authenticated user
// POST /api/v1/fleet/drivers   — Safety Officer only
fleetRouter.get("/drivers", authValidation, asyncHandler(getDrivers));
fleetRouter.post("/drivers", safetyOfficerAuthValidation, asyncHandler(createDriver));

export default fleetRouter;
