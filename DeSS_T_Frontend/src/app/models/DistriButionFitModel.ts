
export interface FitItem {
  Station: string;
  Time_Range: string;
  Distribution: string;
  ArgumentList: string;
}

export interface DataFitResponse {
  DataFitResponse: FitItem[];
}

/** สร้าง `ArgumentList` จากอาร์เรย์ตัวเลข หรือจากสตริงที่มีอยู่ */
export function makeArgumentList(args: number[] | string): string {
  if (typeof args === "string") return args;
  return args.join(",");
}

/** ช่วยสร้าง FitItem */
export function makeFitItem(
  station: string,
  timeRange: string,
  distribution: string,
  args: number[] | string
): FitItem {
  return {
    Station: station,
    Time_Range: timeRange,
    Distribution: distribution,
    ArgumentList: makeArgumentList(args),
  };
}

/** ตรวจสอบรูปร่างของ DataFitResponse อย่างง่าย */
export function isDataFitResponse(obj: any): obj is DataFitResponse {
  return (
    obj != null &&
    Array.isArray(obj.DataFitResponse) &&
    obj.DataFitResponse.every(
      (it: any) =>
        typeof it.Station === "string" &&
        typeof it.Time_Range === "string" &&
        typeof it.Distribution === "string" &&
        typeof it.ArgumentList === "string"
    )
  );
}
