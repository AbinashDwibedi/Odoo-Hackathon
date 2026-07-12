import { NextFunction, Request, response, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { unauthorizedError } from "../../utils/responsehandler.js";
import console from "console";

interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}

export const authValidation = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return unauthorizedError(res, "Authorization header missing or malformed");
    }

    const token = authHeader.split(" ")[1];
    const secret = process.env.JWT_SECRET;

    if (!secret) {
      throw new Error("JWT_SECRET not set in environment variables");
    }

    const decoded = jwt.verify(token, secret) as JwtPayload;

    req.user = decoded; 

    return next();
  } catch (error) {
    const err = error as Error;
    return unauthorizedError(res, err.message || "Invalid or expired token");
  }
};



