import express from "express";
import { addAnwser, addQuestion, addReplyToReview, addReview, editCourse, getAllCourse, getCourseByUser, getSingleCourse, uploadCourse } from "../controllers/course.controllers";
import { authorizeRoles, isAuthenticated } from "../middleware/auth";
const courseRouter = express.Router();

courseRouter.post(
    "/create-course",
    isAuthenticated,
    authorizeRoles("admin"),
    uploadCourse
);

courseRouter.put(
    "/edit-course/:id",
    isAuthenticated,
    authorizeRoles("admin"),
    editCourse
);

courseRouter.get(
    "/get-course/:id",
    getSingleCourse
);

courseRouter.get(
    "/get-courses/:id",
        getAllCourse
);

courseRouter.get(
    "/get-course-content/:id",
    isAuthenticated,
        getCourseByUser
);

courseRouter.put(
    "/add-question/:id",
    isAuthenticated,
        addQuestion
);

courseRouter.put(
    "/add-answer/:id",
    isAuthenticated,
        addAnwser
);

courseRouter.put(
    "/add-review/:id",
    isAuthenticated,
        addReview
);

courseRouter.put(
    "/add-reply/:id",
    isAuthenticated,
    authorizeRoles("admin"),
    addReplyToReview
);

export default courseRouter;