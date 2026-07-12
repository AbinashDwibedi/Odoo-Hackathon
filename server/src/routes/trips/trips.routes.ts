import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import {
  createTrip,
  getTrips,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from "../../controller/trips/trips.controller.js";
import { authValidation } from "../../middlewares/authMiddleware/auth.middleware.js";
import { dispatcherAuthValidation } from "../../middlewares/authMiddleware/roleBased.auth.middleware.js";

const tripsRouter = Router();

// POST   /api/v1/trips             — Dispatcher only (create draft)
// GET    /api/v1/trips             — Any authenticated user
// PATCH  /api/v1/trips/:id/dispatch  — Any authenticated user (Dispatcher would do this in practice)
// PATCH  /api/v1/trips/:id/complete  — Any authenticated user
// PATCH  /api/v1/trips/:id/cancel    — Any authenticated user

tripsRouter.post("/",               dispatcherAuthValidation, asyncHandler(createTrip));
tripsRouter.get("/",                authValidation,           asyncHandler(getTrips));
tripsRouter.patch("/:id/dispatch",  authValidation,           asyncHandler(dispatchTrip));
tripsRouter.patch("/:id/complete",  authValidation,           asyncHandler(completeTrip));
tripsRouter.patch("/:id/cancel",    authValidation,           asyncHandler(cancelTrip));

export default tripsRouter;
