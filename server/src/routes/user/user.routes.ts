import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import { signIn, signUp } from "../../controller/user/user.controller.js";
const userRouter = Router();


userRouter.post("/signup", asyncHandler(signUp));
userRouter.post("/signin", asyncHandler(signIn));


export default userRouter