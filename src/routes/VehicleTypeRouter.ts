import { Router } from "express";
import { verifyToken } from "../middlewares/Authentication";
import VehicleTypeController from "../controllers/VehicleTypeController";

const vehicleTypeRouter = Router();
const controller = new VehicleTypeController();

vehicleTypeRouter.post("/", verifyToken, controller.createVehicleType.bind(controller));
vehicleTypeRouter.put("/:id", verifyToken, controller.updateVehicleType.bind(controller));
vehicleTypeRouter.delete("/:id", verifyToken, controller.deleteVehicleType.bind(controller));
vehicleTypeRouter.get("/:id", verifyToken, controller.getVehicleType.bind(controller));
vehicleTypeRouter.get("/", verifyToken, controller.findVehicleTypes.bind(controller));

export default vehicleTypeRouter;
