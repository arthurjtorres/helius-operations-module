import { Router } from "express";
import { verifyToken } from "../middlewares/Authentication";
import { checkPermission } from "../middlewares/CheckPermission";
import { PermissionEnum } from "../database/models/enums/PermissionEnum";
import BusTimetableController from "../controllers/BusTimetableController";

const busTimetableRouter = Router();
const controller = new BusTimetableController();

busTimetableRouter.post("/", verifyToken, checkPermission("HORARIOS", PermissionEnum.CREATE), controller.createBusTimetable.bind(controller));
busTimetableRouter.put("/:id", verifyToken, checkPermission("HORARIOS", PermissionEnum.UPDATE), controller.updateBusTimetable.bind(controller));
busTimetableRouter.delete("/:id", verifyToken, checkPermission("HORARIOS", PermissionEnum.DELETE), controller.deleteBusTimetable.bind(controller));
busTimetableRouter.patch("/:id/reactivate", verifyToken, checkPermission("HORARIOS", PermissionEnum.UPDATE), controller.reactivateBusTimetable.bind(controller));
busTimetableRouter.get("/:id", verifyToken, checkPermission("HORARIOS", PermissionEnum.READ), controller.getBusTimetable.bind(controller));
busTimetableRouter.get("/", verifyToken, checkPermission("HORARIOS", PermissionEnum.READ), controller.findBusTimetables.bind(controller));

export default busTimetableRouter;
