import { NextFunction, response } from "express";
import { CatchAsyncError } from "../middleware/catchAsyncError";
import OrderModel from "../models/order.Model";


// create new order
export const newOrder=CatchAsyncError(async (data: any, next: NextFunction, res:Response) => {
    const order = await OrderModel.create(data);

    response.status(201).json({
        success: true,
        order,
    })

});
