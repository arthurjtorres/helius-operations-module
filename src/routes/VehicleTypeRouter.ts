import { Router } from "express";
import VehicleTypeController from "../controllers/VehicleTypeController";

const vehicleTypeRouter = Router();
const controller = new VehicleTypeController();

vehicleTypeRouter.post("/", controller.createVehicleType.bind(controller));
vehicleTypeRouter.put("/:id", controller.updateVehicleType.bind(controller));
vehicleTypeRouter.delete("/:id", controller.deleteVehicleType.bind(controller));
vehicleTypeRouter.get("/:id", controller.getVehicleType.bind(controller));
vehicleTypeRouter.get("/", controller.findVehicleTypes.bind(controller));

export default vehicleTypeRouter;
