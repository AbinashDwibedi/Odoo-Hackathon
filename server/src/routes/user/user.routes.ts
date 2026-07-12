import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import { signUp } from "../../controller/user/user.controller.js";
const userRouter = Router();


userRouter.post("/signup", asyncHandler(signUp))


export default userRouter