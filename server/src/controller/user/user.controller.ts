import { Response,Request } from "express"
import { prisma } from "../../db/db.js"
import { createFailedError, createSuccess, sendError } from "../../utils/responsehandler.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";




const MAX_FAILED_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000; 


export const signUp = async (req: Request, res: Response) => {
  const { email, password, role } = req.body;
  console.log(req.body)

  const isUserExist = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (isUserExist) {
    return sendError(res, "User already exists");
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashedPassword,
      role,
    },
  });

  if (!user) {
    return createFailedError(res, "Failed to create user");
  }

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "30d",
    }
  );

  createSuccess(
    res,
    {
      user,
      token,
    },
    "User created successfully"
  );
};



export const signIn = async (req: Request, res: Response) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendError(res, "Email and password are required");
  }

  const user = await prisma.user.findUnique({
    where: {
      email,
    },
  });

  if (!user) {
    return sendError(res, "Invalid email or password");
  }


  if (
    user.isLocked &&
    user.lockUntil &&
    new Date(user.lockUntil) > new Date()
  ) {
    return sendError(
      res,
      `Account is locked. Try again after ${user.lockUntil.toLocaleString()}`
    );
  }


  if (
    user.isLocked &&
    user.lockUntil &&
    new Date(user.lockUntil) <= new Date()
  ) {
    await prisma.user.update({
      where: { id: user.id },
      data: {
        isLocked: false,
        lockUntil: null,
        failedLoginAttempts: 0,
      },
    });
  }

  const isPasswordCorrect = await bcrypt.compare(
    password,
    user.passwordHash
  );

  if (!isPasswordCorrect) {
    const failedAttempts = user.failedLoginAttempts + 1;

    if (failedAttempts >= MAX_FAILED_ATTEMPTS) {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: failedAttempts,
          isLocked: true,
          lockUntil: new Date(Date.now() + LOCK_TIME),
        },
      });

      return sendError(
        res,
        "Account locked due to multiple failed login attempts. Try again in 15 minutes."
      );
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: failedAttempts,
      },
    });

    return sendError(res, "Invalid email or password");
  }


  await prisma.user.update({
    where: { id: user.id },
    data: {
      failedLoginAttempts: 0,
      isLocked: false,
      lockUntil: null,
    },
  });

  const token = jwt.sign(
    {
      userId: user.id,
      email: user.email,
      role: user.role,
    },
    process.env.JWT_SECRET!,
    {
      expiresIn: "30d",
    }
  );

  createSuccess(
    res,
    {
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role,
        image: user.image,
      },
    },
    "Login successful"
  );
};