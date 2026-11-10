import { Router } from "express";
import { verifyToken } from "../middlewares/Authentication";
import VehicleController from "../controllers/VehicleController";

const vehicleRouter = Router();
const controller = new VehicleController();

vehicleRouter.post("/", verifyToken, controller.createVehicle.bind(controller));
vehicleRouter.put("/:id", verifyToken, controller.updateVehicle.bind(controller));
vehicleRouter.delete("/:id", verifyToken, controller.deleteVehicle.bind(controller));
vehicleRouter.patch("/:id/reactivate", verifyToken, controller.reactivateVehicle.bind(controller));
vehicleRouter.get("/:id", verifyToken, controller.getVehicle.bind(controller));
vehicleRouter.get("/", verifyToken, controller.findVehicles.bind(controller));
vehicleRouter.post("/bulk", verifyToken, controller.getVehiclesByIds.bind(controller));

export default vehicleRouter;
