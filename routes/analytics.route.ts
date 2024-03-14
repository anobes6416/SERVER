import express from "express";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
import { getCoursesAnalytics, getOrdersAnalytics, getUsersAnalytics } from "../controllers/analytics.controllers";
const analyticsRouter=express.Router();



analyticsRouter.get(
    "/get-all-users-analytics",
    isAuthenticated,
    authorizeRoles("admin"),      // Only admin can access this route
    getUsersAnalytics           // Call the specific function (controller) for this route
);

analyticsRouter.get(
    "/get-all-orders-analytics",
    isAuthenticated,
    authorizeRoles("admin"),      // Only admin can access this route
    getOrdersAnalytics           // Call the specific function (controller) for this route
);

analyticsRouter.get(
    "/get-all-courses-analytics",
    isAuthenticated,
    authorizeRoles("admin"),      // Only admin can access this route
    getCoursesAnalytics           // Call the specific function (controller) for this route
);


export default analyticsRouter;