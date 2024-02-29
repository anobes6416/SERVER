import { NextFunction, Request, Response } from "express";
import ErrorHandler from "../utils/ErrorHandler";

export const ErrorMiddleware  = (
        err:any,
        req:Request,
        res:Response,
        next:NextFunction
        )=>{
    err.statusCode = err.statusCode || 500;
    err.message = err.message || 'Internal Server Error';

    //wrong mongodb id error
    if(err.name === 'CastError'){
       const message = 'Resource not found. invalid: ${err.path}';     
       err = new ErrorHandler(message, 400);
    }

    //Duplicate key error
    if(err.code === 110000){
            const message = `Duplicate field value entered in ${Object.keys(err.keyValue)} entered`;  
            err = new ErrorHandler(message, 400);   
    }

    //wrong jwt error
    if(err.name === 'jsonWebTokenError'){
            const message = 'json web token is invalid, try again' ;        
            err = new ErrorHandler(message, 400)
    }
    
   //jwt expired error
    if(err.name === 'TokenExpiredError'){
            const message = 'json web token has expired, try again';       
            err = new ErrorHandler(message, 400)      
    }                           

    res.status(err.statusCode).json({            
        success: false,
        message: err.message
    });                            
};      
