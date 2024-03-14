require('dotenv').config();
import { Request, Response, NextFunction } from "express";
import userModel, { IUser } from "../models/user.models";
import ErrorHandler from "../utils/ErrorHandler";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import jwt, { JwtPayload, Secret } from "jsonwebtoken";
import ejs from "ejs";
import path from "path";
import sendMail from "../utils/sendMail";
import { accessTokenOptions, refreshTokenOptions, sendToken } from "../utils/jwt";
import { redis } from "../utils/redis";
import exp from "constants";
import { getAllUsersService, getUserById, updateUserRoleService } from "../services/user.services";
import cloudinary from "cloudinary";
import CourseModel from "../models/course.model";

interface IRegistrationBody {
    name: string;
    email: string;
    password: string;
    avatar?: string;
}

export const registrationUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
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
        const html = await ejs.renderFile(path.join(__dirname, "../mails/activation_mail.ejs"), data)

        
        try {
            await sendMail({
                email: user.email,
                subject: "Activate your account",
                template: "activation_mail.ejs",
                data,
            });

            res.status(201).json({
                success: true,
                message: `please check your email: ${user.email} to activate your account`,
                activationToken: activationToken.token,
            });
        } catch (error : any) {
            return next(new ErrorHandler(error.message, 400));
            
        }
        //send response with status code
        
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

//activate user

interface IActivationRequest{
    activation_token:string,
    activation_code:string
}

export const activateUser = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) => {
    try {
        const { activation_token , activation_code } = req.body as IActivationRequest;

        const newUser : {user:IUser; activationCode:string} = jwt.verify(
            activation_token,
            process.env.ACTIVATION_SECRET as string
            ) as {user:IUser; activationCode:string};

                if (newUser.activationCode !== activation_code){
                    return next(new ErrorHandler("Invalid Activation Code",  400));
                }
                
            const {name, email, password } = newUser.user;
            
            const existUser = await userModel.findOne({email});

            if  (existUser) {
                return next(new ErrorHandler("Email already exist", 400))
            }
            const user  = await userModel.create({
                name,
                email,
                password
            });

            res.status(201).json({
                success:true,
            });
            }catch (error: any) {  
                return next(new ErrorHandler(error.message, 400));
             }
         });

//Login User
interface ILoginRequest {
    email: string;
    password: string;
}

export const loginUser = CatchAsyncError(async(req:Request,res:Response , next:NextFunction) => {
    try {

        const {email,password} = req.body as ILoginRequest;

        if(!email || !password) {
            return  next(new ErrorHandler("please enter email and password", 400));
        };

        const user = await userModel.findOne({email}).select("+password");

        if(!user){
            return  next(new ErrorHandler("Invalid email or password", 400));
        }

        const isPasswordMatch = await user.comparePassword(password);
        if(!isPasswordMatch){
            return  next(new ErrorHandler("password is not matched", 400));
        }

        sendToken(user, 200, res);
    } catch (error:any) {
        return next(new ErrorHandler(error.message, 400));
    }
}
);

//logout user
export const logoutUser = CatchAsyncError(
    async(req: Request, res: Response, next:NextFunction) => {
        try {
            res.cookie('access_token', '', {maxAge:1});
            res.cookie('refresh_token', '', {maxAge:1});
            const userId = req.user?.id || "";
            redis.del(userId);
            res.status(200).json({
                success: true,
                message:"Logged out Successfully",
            });
    }
    catch(error:any){
        return next(new ErrorHandler(error.message, 400));
    }
});


//update access token
export const updateAccessToken = CatchAsyncError(async(req:Request,res:Response , next:NextFunction) => {
    try {
        const refresh_token = req.cookies.refresh_token as string;
        const decoded = await jwt.verify(refresh_token,
             process.env.REFRESH_TOKEN_SECRET as string) as JwtPayload;

             const message = "Could not refresh token";
             if(!decoded){
                return next(new ErrorHandler(message, 400));
             }
             const session = await redis.get(decoded.id as string);
             if(!session){
                return next(new ErrorHandler(message, 400));
             }
             const user = JSON.parse(session);
             const accessToken = jwt.sign(
                 { id : user.id},
                 process.env.ACCESS_TOKEN as string,
                 {expiresIn:'5m'}
             );

             const refreshToken = jwt.sign(
                { id : user.id},
                process.env.REFRESH_TOKEN as string,
                {expiresIn:'3d'}
                );
                
        req.user = user;
                res.cookie("access_token", accessToken, accessTokenOptions);
                res.cookie("refresh_token", refreshToken, refreshTokenOptions);
                    res.status(201).json({
                    status:"success",
                    accessToken,
                });
    } catch (error:any) {
        
    }
}
);

//get user info
export const getUserInfo = CatchAsyncError(async(req:Request, res:Response, next:NextFunction) => {     
   try {
    const userId = req.user?._id;
    getUserById(userId,res);
   } catch (error:any) {
    return next(new ErrorHandler(error.message, 400));
   }     
});

//social authentication
interface ISocialAuthBody {
    email:string;
    name:string;
    avatar:string;
}

export const socialAuth = CatchAsyncError(
    async (req:Request, res:Response, next:NextFunction)=>{
        try {
            const {email, name , avatar } = req.body as ISocialAuthBody;
            const user = await userModel.findOne({email});
            if(!user){
                const newUser = await userModel.create({name,email,avatar});
                sendToken(newUser, 200, res);   
            }else{
                sendToken(user, 200, res)
            }
        } catch (error:any) {
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

//update user Info
interface IUpdateUserInfo{
    name?:string;
    email?:string;
}

export const updateUserInfo = CatchAsyncError(
    async (req:Request, res:Response, next:NextFunction)=>{
        try{
        const { name , email } = req.body as IUpdateUserInfo;
        const userId=req.user?._id;
        const user = await userModel.findById(userId);
            
        if(email && user){
            const isEmailExist = await userModel.findOne({email});
            if(isEmailExist ){
                return next(new ErrorHandler("Email is already exist", 400));
            }
            user.email = email;
        }    
        if(name && user){
            user.name = name;
        }
        
        await user?.save();

        await redis.set(userId, JSON.stringify(user));

            res.status(201).json({
                 success:true,  
                 user,
            });
        }
        catch(error:any){
            return next(new ErrorHandler(error.message, 400));
        }
    }
);

//update user  password

interface IUpdatePassword
{
    oldPassword: string;
    newPassword: string;
}

export const updatePassword = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) =>
{
    async (req: Request, res: Response, next: NextFunction) =>
    {
        try
        {
            const { oldPassword, newPassword } = req.body as IUpdatePassword;
    
            const user = await userModel.findById(req.user?._id);

            if (!oldPassword || !newPassword)
            {
                return next(new ErrorHandler("Please enter old and new password", 400));
            }
            if (user?.password === undefined)
            {
                return next(new ErrorHandler("Invalid User", 400))
            }

            const isPasswordMatch = await user?.comparePassword(oldPassword);

            if (!isPasswordMatch)
            {
                return next(new ErrorHandler("Invalid old password", 400))
            }

            user.password = newPassword;

            await user.save();

            res.status(201).json({
                success:true,  
                user,
            });
        }
        catch (error: any)
        {
            return next(new ErrorHandler(error.message, 401))
        }
    }
})

//update profile picture
interface IUpdateProfilePicture
{
 avatar:string       
}

export const updateProfilePicture = CatchAsyncError(async (req: Request, res: Response, next: NextFunction) =>
{
    try {
        
        const { avatar } = req.body;

        const userId = req.user?._id;
        
        const user = await userModel.findById(userId);

        if (avatar && user)
        
        //if user have one avatar
        if (user?.avatar?.public_id)
        {
        
        //first delete the existing or old image
            await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
        } else
        {
            const myCloud = await cloudinary.v2.uploader.upload(avatar, {
                folder: "avatars",
                width: 150,
            });
            user.avatar = {
                public_id: myCloud.public_id,
                url: myCloud.secure_url,
            }
        }
        await user?.save();
        
        await redis.set(userId, JSON.stringify(user));

        res.status(200).json({
            success: true,
            user,
        })

    } catch (error:any) {
        return next(new ErrorHandler(error.message, 400))   
    }
}) 

//get all users ---- only for admin
export const getAllUsers=CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            getAllUsersService(res);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }
    }
);

//update user role ---- only for admin 
export const updateUserRole=CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { id, role }=req.body;
            updateUserRoleService(res,id,role);
        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))
        }
    }
);

//Delete user --- only for admin
export const deleteUser=CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => { 
        try {
            const { id }=req.params;

            const user=await userModel.findById(id);

            if (!user) {
                return next(new ErrorHandler("User not found", 400));
            }

            await user.deleteOne({ id });

            await redis.del(id);

            res.status(201).json({
                success: true,
                message: "user deleted successfully"
            });

        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))      
        }
    });

    //Delete Course --- only for admin
export const deleteCourse=CatchAsyncError(
    async (req: Request, res: Response, next: NextFunction) => { 
        try {
            const { id }=req.params;

            const course=await CourseModel.findById(id);

            if (!course) {
                return next(new ErrorHandler("course not found", 400));
            }

            await course.deleteOne({ id });

            await redis.del(id);

            res.status(201).json({
                success: true,
                message: "Course deleted successfully"
            });

        } catch (error: any) {
            return next(new ErrorHandler(error.message, 400))      
        }
    });