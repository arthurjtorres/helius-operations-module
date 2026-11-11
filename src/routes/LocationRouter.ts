import { Router } from "express";
import { verifyToken } from "../middlewares/Authentication";
import { checkPermission } from "../middlewares/CheckPermission";
import { PermissionEnum } from "../database/models/enums/PermissionEnum";
import LocationController from "../controllers/LocationController";

const locationRouter = Router();
const controller = new LocationController();

locationRouter.post("/", verifyToken, checkPermission("LOCALIZACOES", PermissionEnum.CREATE), controller.createLocation.bind(controller));
locationRouter.put("/:id", verifyToken, checkPermission("LOCALIZACOES", PermissionEnum.UPDATE), controller.updateLocation.bind(controller));
locationRouter.delete("/:id", verifyToken, checkPermission("LOCALIZACOES", PermissionEnum.DELETE), controller.deleteLocation.bind(controller));
locationRouter.patch("/:id/reactivate", verifyToken, checkPermission("LOCALIZACOES", PermissionEnum.UPDATE), controller.reactivateLocation.bind(controller));
locationRouter.get("/:id", verifyToken, checkPermission("LOCALIZACOES", PermissionEnum.READ), controller.getLocation.bind(controller));
locationRouter.get("/", verifyToken, checkPermission("LOCALIZACOES", PermissionEnum.READ), controller.findLocations.bind(controller));

export default locationRouter;
