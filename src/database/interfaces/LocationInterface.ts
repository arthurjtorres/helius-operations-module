import { LocationTypeEnum } from "../models/enums/LocationTypeEnum";

export default interface LocationInterface {
  locationId?: string;
  locationName: string;
  locationCeturbCode: string;
  locationGlobusCode?: string;
  locationType: LocationTypeEnum;
  locationAcronym?: string;

  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}


