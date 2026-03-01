import { Router } from "express";
import vehicleTypeRouter from "./VehicleTypeRouter";
import locationRouter from "./LocationRouter";
import busTimetableRouter from "./BusTimetableRouter";
import vehicleRouter from "./VehicleRouter";

const router = Router();

router.use("/vehicle-type", vehicleTypeRouter);
router.use("/vehicle", vehicleRouter);
router.use("/location",locationRouter);
router.use("/bus-timetable",busTimetableRouter);

export default router;