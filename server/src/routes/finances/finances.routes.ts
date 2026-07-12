import { Router } from "express";
import { asyncHandler } from "../../utils/asynchandler.js";
import { getExpenses, createExpense } from "../../controller/finances/finances.controller.js";
import { fanancialAuthValidation } from "../../middlewares/authMiddleware/roleBased.auth.middleware.js";
import { authValidation } from "../../middlewares/authMiddleware/auth.middleware.js";

const financesRouter = Router();

// GET  /api/v1/finances/expenses  — Financial Analyst only
// POST /api/v1/finances/expenses  — any authenticated user (log ad-hoc expense)
financesRouter.get("/expenses", fanancialAuthValidation, asyncHandler(getExpenses));
financesRouter.post("/expenses", authValidation, asyncHandler(createExpense));

export default financesRouter;
