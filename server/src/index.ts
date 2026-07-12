import dotenv from "dotenv";
dotenv.config()



import express from "express";
import userRouter from "./routes/user/user.routes.js";
const app = express();

app.use(express.json())

app.get("/",(req, res)=>{
    res.status(200).json({
        message: "Welcome to Odoo api test",
    });
})

app.use("/api/v1/user",userRouter)


app.listen(process.env.PORT,()=>{
    console.log(`Server Is Running At http://localhost:${process.env.PORT}`)
})