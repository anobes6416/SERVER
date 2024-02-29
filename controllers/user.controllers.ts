require('dotenv').config();
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.models";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import jwt, { Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";

interface IRegistrationBody {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

export const registerationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        //get data from the request body
        const { name, email, password } = req.body;
        const isEmailExist = await userModel.findOne({ email });
        if (isEmailExist) {
            return next(new ErrorHandler("This Email Is Already Exists", 400));
        }

        const user: IRegistrationBody = {
            name,
            email,
            password,
        };

        const activationToken = createActivatonToken(user);

        const activationCode = activationToken.activationCode;
        
        const data = {user:{name:user.name}, activationCode};
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation_mail.ejs"))
        //send response with status code
        res.status(201).json({
            success: true,
            message: "User Created Successfully",
            data: user,
        });
    } catch (error: any) {
        return next(new ErrorHandler(error.message, 400));
    }
});

interface IActivationToken {
    token: string;
    activationCode: string;
}

export const createActivatonToken = (user: any): IActivationToken => {
    const activationCode = Math.floor(1000 + Math.random() * 9000).toString();

    const token = jwt.sign({
        user, activationCode
    }, 
    process.env.ACTIVATION_SECRET as Secret,
    {
        expiresIn: "5m"
    });

    return { token, activationCode };
};