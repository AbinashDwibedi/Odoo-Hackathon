import { Response,Request } from "express"
import { prisma } from "../../db/db.js"
import { createFailedError, createSuccess, sendError } from "../../utils/responsehandler.js";
import jwt from 'jsonwebtoken';
import bcrypt from "bcryptjs";

export const signUp = async (req: Request, res: Response) => {
  const { name, email } = req.body;

//   const hashedPassword = bcrypt.hashSync(password, 10);


  const isUserExist = await prisma.user.findFirst({
    where: {
      email
    }
  });
  console.log(isUserExist)
  if (isUserExist) return sendError(res, "User already exists");

  const user = await prisma.user.create({
    data: {
      name,
      email,
    //   password: hashedPassword,
 
    }
  });
  const token = jwt.sign({ userId: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET!, {
    expiresIn: "30days"
  });


  if (!user) return createFailedError(res, "Failed to cerate user");
  createSuccess(res, { user, token: token }, "User created successfully");

}