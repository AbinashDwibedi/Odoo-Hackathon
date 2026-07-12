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

const tripRouter = Router();

tripRouter.post("/", asyncHandler(createTrip));
tripRouter.get("/", asyncHandler(getTrips));
tripRouter.get("/:id", asyncHandler(getTripById));
tripRouter.put("/:id", asyncHandler(updateTrip));
tripRouter.patch("/:id/dispatch", asyncHandler(dispatchTrip));
tripRouter.patch("/:id/complete", asyncHandler(completeTrip));
tripRouter.patch("/:id/cancel", asyncHandler(cancelTrip));

export default tripRouter;
