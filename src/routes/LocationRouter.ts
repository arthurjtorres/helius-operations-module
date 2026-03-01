import { Router } from "express";
import LocationController from "../controllers/LocationController";

const locationRouter = Router();
const controller = new LocationController();

locationRouter.post("/", controller.createLocation.bind(controller));
locationRouter.put("/:id", controller.updateLocation.bind(controller));
locationRouter.delete("/:id", controller.deleteLocation.bind(controller));
locationRouter.get("/:id", controller.getLocation.bind(controller));
locationRouter.get("/", controller.findLocations.bind(controller));

export default locationRouter;
