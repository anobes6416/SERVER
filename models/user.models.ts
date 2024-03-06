require('dotenv').config();
import mongoose, {Document, Model, Schema} from "mongoose";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

const emailRegexPattern: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;   

export interface IUser extends Document{
    name: string;
    email: string;
    password: string;
    avatar : {
        public_id:string;
        url:string;
    },
    role: string;
    isVerified: boolean;
    courses:Array<{courseId:string}>;
    comparePassword: (password:string) => Promise<boolean>;
    SignAccessToken:()=> string;
    SignRefreshToken:()=> string;
}

const userSchema: Schema<IUser> = new mongoose.Schema(
    {
    name:{
        type:String,
        required: [true, "please enter your name"]
    },
    email:{ 
        type: String, 
        unique: true,
        validate: {
            validator: function(value:string) {
                return emailRegexPattern.test(value);
             },
            message: 'Please provide a valid Email',
        },
        required: [true, "please enter your email"]
    },
    password:{
        type: String, 
        minLength: [6, "please enter your password"],
        required: [true, "please enter your password"],
        select: false,
    },
    avatar:{
        public_id: String,
        url: String
    },
    role:{
        type: String,  
        default: "user"
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    courses:[
        {
            courseId:String,
        }
    ],
    },
    {timestamps:true}
    );

    // hashing password before saving
    userSchema.pre<IUser>('save', async function (next) {
      if (!this.isModified('password')) {
         next();
      }
      this.password = await bcrypt.hash(this.password, 10);
      next()
  });

//sign access token
userSchema.methods.SignAccessToken = function(){
    return jwt.sign({id: this._id,}, process.env.ACCESS_TOKEN || '',{
        expiresIn:"5m",
    });
};

//sign refresh token
userSchema.methods.SignRefreshToken = function(){
    return jwt.sign({id: this._id,}, process.env.REFRESH_TOKEN || '',{
        expiresIn:"3d",
    });
}

  //compare password
userSchema.methods.comparePassword=async function(
    enteredPassword: string
    ):Promise<boolean>{
    return await bcrypt.compare(enteredPassword, this.password);
};

const userModel:Model<IUser> = mongoose.model("User", userSchema);

export default userModel;    