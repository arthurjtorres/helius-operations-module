import { Router } from "express";
import { verifyToken } from "../middlewares/Authentication";
import { checkPermission } from "../middlewares/CheckPermission";
import { PermissionEnum } from "../database/models/enums/PermissionEnum";
import VehicleTypeController from "../controllers/VehicleTypeController";

const vehicleTypeRouter = Router();
const controller = new VehicleTypeController();

vehicleTypeRouter.post("/", verifyToken, checkPermission("VEICULOS", PermissionEnum.CREATE), controller.createVehicleType.bind(controller));
vehicleTypeRouter.put("/:id", verifyToken, checkPermission("VEICULOS", PermissionEnum.UPDATE), controller.updateVehicleType.bind(controller));
vehicleTypeRouter.delete("/:id", verifyToken, checkPermission("VEICULOS", PermissionEnum.DELETE), controller.deleteVehicleType.bind(controller));
vehicleTypeRouter.patch("/:id/reactivate", verifyToken, checkPermission("VEICULOS", PermissionEnum.UPDATE), controller.reactivateVehicleType.bind(controller));
vehicleTypeRouter.get("/:id", verifyToken, checkPermission("VEICULOS", PermissionEnum.READ), controller.getVehicleType.bind(controller));
vehicleTypeRouter.get("/", verifyToken, checkPermission("VEICULOS", PermissionEnum.READ), controller.findVehicleTypes.bind(controller));

export default vehicleTypeRouter;
