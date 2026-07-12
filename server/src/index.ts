import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import userRouter from "./routes/user/user.routes.js";
import fleetRouter from "./routes/fleet/fleet.routes.js";
import financesRouter from "./routes/finances/finances.routes.js";
import analyticsRouter from "./routes/analytics/analytics.routes.js";
import tripsRouter from "./routes/trips/trips.routes.js";
import maintenanceRouter from "./routes/maintenance/maintenance.routes.js";

const app = express();

app.use(cors({
  origin: [
    "http://localhost:5173",  // Vite default
    "http://localhost:3000",  // CRA / other
    process.env.FRONTEND_URL ?? "",
  ].filter(Boolean),
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

app.get("/", (_req, res) => {
  res.status(200).json({ message: "Welcome to Odoo Fleet API" });
});

app.use("/api/v1/user",        userRouter);
app.use("/api/v1/fleet",       fleetRouter);
app.use("/api/v1/finances",    financesRouter);
app.use("/api/v1/analytics",   analyticsRouter);
app.use("/api/v1/trips",       tripsRouter);
app.use("/api/v1/maintenance", maintenanceRouter);

app.listen(process.env.PORT, () => {
  console.log(`Server Is Running At http://localhost:${process.env.PORT}`);
});