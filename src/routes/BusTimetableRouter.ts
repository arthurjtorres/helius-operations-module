import { Router } from "express";
import BusTimetableController from "../controllers/BusTimetableController";

const busTimetableRouter = Router();
const controller = new BusTimetableController();

busTimetableRouter.post("/", controller.createBusTimetable.bind(controller));
busTimetableRouter.put("/:id", controller.updateBusTimetable.bind(controller));
busTimetableRouter.delete("/:id", controller.deleteBusTimetable.bind(controller));
busTimetableRouter.get("/:id", controller.getBusTimetable.bind(controller));
busTimetableRouter.get("/", controller.findBusTimetables.bind(controller));

export default busTimetableRouter;
