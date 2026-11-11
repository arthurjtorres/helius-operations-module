import { Router } from "express";
import { verifyToken, allowServiceToken } from "../middlewares/Authentication";
import { checkPermission } from "../middlewares/CheckPermission";
import { PermissionEnum } from "../database/models/enums/PermissionEnum";
import VehicleController from "../controllers/VehicleController";

const vehicleRouter = Router();
const controller = new VehicleController();

vehicleRouter.post("/", verifyToken, checkPermission("VEICULOS", PermissionEnum.CREATE), controller.createVehicle.bind(controller));
vehicleRouter.put("/:id", verifyToken, checkPermission("VEICULOS", PermissionEnum.UPDATE), controller.updateVehicle.bind(controller));
vehicleRouter.delete("/:id", verifyToken, checkPermission("VEICULOS", PermissionEnum.DELETE), controller.deleteVehicle.bind(controller));
vehicleRouter.patch("/:id/reactivate", verifyToken, checkPermission("VEICULOS", PermissionEnum.UPDATE), controller.reactivateVehicle.bind(controller));
// Consulta por IDs via POST: usuário com VEICULOS:READ ou token de serviço (T09)
vehicleRouter.post("/lookup", allowServiceToken, verifyToken, checkPermission("VEICULOS", PermissionEnum.READ), controller.lookupVehicles.bind(controller));
vehicleRouter.get("/:id", verifyToken, checkPermission("VEICULOS", PermissionEnum.READ), controller.getVehicle.bind(controller));
vehicleRouter.get("/", verifyToken, checkPermission("VEICULOS", PermissionEnum.READ), controller.findVehicles.bind(controller));
vehicleRouter.post("/bulk", allowServiceToken, verifyToken, checkPermission("VEICULOS", PermissionEnum.CREATE), controller.getVehiclesByIds.bind(controller));

export default vehicleRouter;
