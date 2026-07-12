import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import { getDashboard } from "../../controller/analytics/analytics.controller.js";
import { authValidation } from "../../middlewares/authMiddleware/auth.middleware.js";

const analyticsRouter = Router();

// GET /api/v1/analytics/dashboard — any authenticated user
analyticsRouter.get("/dashboard", authValidation, asyncHandler(getDashboard));

export default analyticsRouter;
