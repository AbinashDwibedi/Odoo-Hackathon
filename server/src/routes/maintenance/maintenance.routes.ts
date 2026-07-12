import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import {
  createMaintenance,
  getMaintenanceLogs,
  getMaintenanceLogById,
  completeMaintenance,
} from "../../controller/maintenance/maintenance.controller.js";

const maintenanceRouter = Router();

maintenanceRouter.post("/", asyncHandler(createMaintenance));
maintenanceRouter.get("/", asyncHandler(getMaintenanceLogs));
maintenanceRouter.get("/:id", asyncHandler(getMaintenanceLogById));
maintenanceRouter.patch("/:id/complete", asyncHandler(completeMaintenance));

export default maintenanceRouter;
