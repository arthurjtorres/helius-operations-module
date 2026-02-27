export default interface BusTimetableInterface {
  busTimetableId?: string;
  timetableName: string;
  timetableCode: string;
  kml?: string;
  startDate?: Date;
  endDate?: Date;
  fkBusTimetableLocationStartId: string;
  fkBusTimetableLocationEndId: string;

  createdAt: Date;
  createdBy: string;
  updatedAt?: Date;
  updatedBy?: string;
}

