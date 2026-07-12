import { NextFunction, Request, Response } from "express";
import jwt, { JwtPayload } from "jsonwebtoken";
import { unauthorizedError } from "../../utils/responsehandler.js";
interface AuthenticatedRequest extends Request {
  user?: string | JwtPayload;
}

export const fleetManagerAuthValidation = (
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


    if (!decoded?.role) {
      return unauthorizedError(res, "User role not found in token");
    }

    if (decoded.role !== "FLEET_MANAGER") {
      return unauthorizedError(res, "Access denied: Admins only");
    }

    req.user = decoded;
    return next();
  } catch (error) {
    const err = error as Error;
    return unauthorizedError(res, err.message || "Invalid or expired token");
  }
};


export const dispatcherAuthValidation = (
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


    if (!decoded?.role) {
      return unauthorizedError(res, "User role not found in token");
    }

    if (decoded.role !== "DISPATCHER") {
      return unauthorizedError(res, "Access denied: Admins only");
    }

    req.user = decoded;
    return next();
  } catch (error) {
    const err = error as Error;
    return unauthorizedError(res, err.message || "Invalid or expired token");
  }
};


export const safetyOfficerAuthValidation = (
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


    if (!decoded?.role) {
      return unauthorizedError(res, "User role not found in token");
    }

    if (decoded.role !== "SAFETY_OFFICER") {
      return unauthorizedError(res, "Access denied: Admins only");
    }

    req.user = decoded;
    return next();
  } catch (error) {
    const err = error as Error;
    return unauthorizedError(res, err.message || "Invalid or expired token");
  }
};



export const fanancialAuthValidation = (
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


    if (!decoded?.role) {
      return unauthorizedError(res, "User role not found in token");
    }

    if (decoded.role !== "SAFETY_OFFICER") {
      return unauthorizedError(res, "Access denied: Admins only");
    }

    req.user = decoded;
    return next();
  } catch (error) {
    const err = error as Error;
    return unauthorizedError(res, err.message || "Invalid or expired token");
  }
};


