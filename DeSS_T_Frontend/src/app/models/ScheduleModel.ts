export interface PaserScheduleData {
  ScheduleDataID: string;
  RoutePathID: string;
  ScheduleList: string;
}

export interface PaserSchedule {
  ScheduleData: PaserScheduleData[];
}
