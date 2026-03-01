import { Router } from "express";
import VehicleController from "../controllers/VehicleController";

const vehicleRouter = Router();
const controller = new VehicleController();

vehicleRouter.post("/", controller.createVehicle.bind(controller));
vehicleRouter.put("/:id", controller.updateVehicle.bind(controller));
vehicleRouter.delete("/:id", controller.deleteVehicle.bind(controller));
vehicleRouter.get("/:id", controller.getVehicle.bind(controller));
vehicleRouter.get("/", controller.findVehicles.bind(controller));
vehicleRouter.post("/bulk", controller.getVehiclesByIds.bind(controller));

export default vehicleRouter;
