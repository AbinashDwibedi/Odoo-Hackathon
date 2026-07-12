import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import {
  createMaintenance,
  getMaintenanceLogs,
  getMaintenanceLogById,
  completeMaintenance,
} from "../../controller/maintenance/maintenance.controller.js";

import { authValidation } from "../../middlewares/authMiddleware/auth.middleware.js";
import { fleetManagerAuthValidation } from "../../middlewares/authMiddleware/roleBased.auth.middleware.js";

const maintenanceRouter = Router();

maintenanceRouter.post("/", fleetManagerAuthValidation, asyncHandler(createMaintenance));
maintenanceRouter.get("/", authValidation, asyncHandler(getMaintenanceLogs));
maintenanceRouter.get("/:id", authValidation, asyncHandler(getMaintenanceLogById));
maintenanceRouter.patch("/:id/complete", fleetManagerAuthValidation, asyncHandler(completeMaintenance));

export default maintenanceRouter;
