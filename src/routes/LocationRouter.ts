import { Router } from "express";
import { verifyToken } from "../middlewares/Authentication";
import LocationController from "../controllers/LocationController";

const locationRouter = Router();
const controller = new LocationController();

locationRouter.post("/", verifyToken, controller.createLocation.bind(controller));
locationRouter.put("/:id", verifyToken, controller.updateLocation.bind(controller));
locationRouter.delete("/:id", verifyToken, controller.deleteLocation.bind(controller));
locationRouter.get("/:id", verifyToken, controller.getLocation.bind(controller));
locationRouter.get("/", verifyToken, controller.findLocations.bind(controller));

export default locationRouter;
