import { Response,Request } from "express"
import { prisma } from "../../db/db.js"
import { createFailedError, createSuccess, sendError } from "../../utils/responsehandler.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";


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