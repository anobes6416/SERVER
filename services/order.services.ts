import { NextFunction, response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import OrderModel from "../models/order.Model";
import { Response } from "express";


// create new order
export const newOrder=CatchAsyncError(async (data: any, next: NextFunction, res:Response) => {
    const order = await OrderModel.create(data);

    response.status(201).json({
        success: true,
        order,
    })
});

//get all orders 
export const getAllOrdersService=async (res: Response) => {
    const orders=await OrderModel.find().sort({ createdAt: -1 });
    
    res.status(200).json({
        success: true,
        orders,
    });
};

