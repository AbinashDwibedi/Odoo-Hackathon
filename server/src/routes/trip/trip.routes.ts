import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import {
  createTrip,
  getTrips,
  getTripById,
  updateTrip,
  dispatchTrip,
  completeTrip,
  cancelTrip,
} from "../../controller/trip/trip.controller.js";

import { authValidation } from "../../middlewares/authMiddleware/auth.middleware.js";
import { dispatcherAuthValidation } from "../../middlewares/authMiddleware/roleBased.auth.middleware.js";

const tripRouter = Router();

tripRouter.post("/", dispatcherAuthValidation, asyncHandler(createTrip));
tripRouter.get("/", authValidation, asyncHandler(getTrips));
tripRouter.get("/:id", authValidation, asyncHandler(getTripById));
tripRouter.put("/:id", dispatcherAuthValidation, asyncHandler(updateTrip));
tripRouter.patch("/:id/dispatch", dispatcherAuthValidation, asyncHandler(dispatchTrip));
tripRouter.patch("/:id/complete", dispatcherAuthValidation, asyncHandler(completeTrip));
tripRouter.patch("/:id/cancel", dispatcherAuthValidation, asyncHandler(cancelTrip));

export default tripRouter;
