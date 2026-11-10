import { Router } from "express";
import { verifyToken } from "../middlewares/Authentication";
import BusTimetableController from "../controllers/BusTimetableController";

const busTimetableRouter = Router();
const controller = new BusTimetableController();

busTimetableRouter.post("/", verifyToken, controller.createBusTimetable.bind(controller));
busTimetableRouter.put("/:id", verifyToken, controller.updateBusTimetable.bind(controller));
busTimetableRouter.delete("/:id", verifyToken, controller.deleteBusTimetable.bind(controller));
busTimetableRouter.get("/:id", verifyToken, controller.getBusTimetable.bind(controller));
busTimetableRouter.get("/", verifyToken, controller.findBusTimetables.bind(controller));

export default busTimetableRouter;
