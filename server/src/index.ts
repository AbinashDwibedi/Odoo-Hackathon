import dotenv from "dotenv";
dotenv.config()



import express from "express";
import userRouter from "./routes/user/user.routes.js";
import fleetRouter from "./routes/fleet/fleet.routes.js";
import financesRouter from "./routes/finances/finances.routes.js";
import analyticsRouter from "./routes/analytics/analytics.routes.js";
const app = express();

app.use(express.json())

app.get("/",(req, res)=>{
    res.status(200).json({
        message: "Welcome to Odoo api test",
    });
})

app.use("/api/v1/user", userRouter)
app.use("/api/v1/fleet", fleetRouter)
app.use("/api/v1/finances", financesRouter)
app.use("/api/v1/analytics", analyticsRouter)


app.listen(process.env.PORT,()=>{
    console.log(`Server Is Running At http://localhost:${process.env.PORT}`)
})