import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import {
  createMaintenance,
  getMaintenanceLogs,
  completeMaintenance,
} from "../../controller/maintenance/maintenance.controller.js";
import { authValidation } from "../../middlewares/authMiddleware/auth.middleware.js";
import { fleetManagerAuthValidation } from "../../middlewares/authMiddleware/roleBased.auth.middleware.js";

const maintenanceRouter = Router();

// POST  /api/v1/maintenance            — Fleet Manager only (log vehicle to shop)
// GET   /api/v1/maintenance            — Any authenticated user
// PATCH /api/v1/maintenance/:id/complete — Any authenticated user (Fleet Manager in practice)

maintenanceRouter.post("/",                 fleetManagerAuthValidation, asyncHandler(createMaintenance));
maintenanceRouter.get("/",                  authValidation,             asyncHandler(getMaintenanceLogs));
maintenanceRouter.patch("/:id/complete",    authValidation,             asyncHandler(completeMaintenance));

export default maintenanceRouter;
