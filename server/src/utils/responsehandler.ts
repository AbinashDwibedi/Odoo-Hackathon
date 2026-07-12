import { error } from "console";
import { response, Response } from "express";

interface ApiResponse<T = unknown> {
  success: boolean;
  message: string;
  data?: T;
  error?: any;
}

export const sendSuccess = <T>(
  res: Response,
  message: string,
  data?: T,
  statusCode = 200
) => {
  const response: ApiResponse<T> = {
    success: true,
    message,
    ...(data !== undefined && { data }),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  error?: any,
  statusCode = 500
) => {
  const response: ApiResponse = {
    success: false,
    message,
    ...(error && { error }),
  };
  return res.status(statusCode).json(response);
};


export const searchSuccess = <T>(
  res: Response,
  data: T,
  message = "Results found"
) => sendSuccess(res, message, data, 200);


export const createSuccess = <T>(
  res: Response,
  data: T,
  message = "Created successfully"
) => sendSuccess(res, message, data, 201);


export const notFoundError = (res: Response, message = "Resource not found") =>
  sendError(res, message, undefined, 404);


export const validationError = (
  res: Response,
  message = "Validation failed",
  error?: any
) => sendError(res, message, error, 400);


export const unauthorizedError = (
  res: Response,
  message = "Unauthorized access"
) => sendError(res, message, undefined, 401);


export const createFailedError = <T>(
  res: Response,
  data: T,
  message = "Failed to create"
) => sendError(res, message, undefined, 400);


export const updateFailed = <T>(
  res: Response,
  message: string
) => sendError(res,message,undefined,400)


export const updateSuccess = <T>(
  res: Response,
  data: T,
  message: string
)=> sendSuccess(res,message,data,201)