import { useState, useEffect } from "react";
import {
  AlightingFitFromXlsx,
  InterarrivalFitFromXlsx,
} from "../../utility/api/distribution_fit";
import MapViewer from "./MapViewer";
import GuestScenario from "./GuestScenario";
import type { StationDetail } from "../models/Network";
import type { Configuration } from "../models/Configuration";
import type { NetworkModel } from "../models/Network";
import { isDataFitResponse } from "../models/DistriButionFitModel";

export default function GuestConfiguration() {
  // ------------------------ File Upload States ------------------------
  const [alightingFile, setAlightingFile] = useState<File | null>(null);
  const [alightingResult, setAlightingResult] = useState<unknown>(null);
  const [loadingA, setLoadingA] = useState(false);

  // Interarrival file states (mirror of Alighting)
  const [interarrivalFile, setInterarrivalFile] = useState<File | null>(null);
  const [interarrivalResult, setInterarrivalResult] = useState<unknown>(null);
  const [loadingI, setLoadingI] = useState(false);

  // track which file type was last selected ('alighting' | 'interarrival')
  const [lastSelected, setLastSelected] = useState<
    "alighting" | "interarrival" | null
  >(null);

  // when submit succeeds we store the built Configuration here and render GuestScenario
  const [submittedConfig, setSubmittedConfig] = useState<Configuration | null>(
    null
  );

  // ------------------------ Map States ------------------------
  const [mapMode, setMapMode] = useState<"area" | "manual">("manual");
  const [areaCode, setAreaCode] = useState("");
  const [minLat, setMinLat] = useState(13.72);
  const [maxLat, setMaxLat] = useState(13.75);
  const [minLon, setMinLon] = useState(100.5);
  const [maxLon, setMaxLon] = useState(100.53);

  const [mapBounds, setMapBounds] = useState<
    | { minLat: number; maxLat: number; minLon: number; maxLon: number }
    | undefined
  >(undefined);

  const [mapConfirmed, setMapConfirmed] = useState(false);

  const [stationDetails, setStationDetails] = useState<StationDetail[] | null>(
    null
  );
  const [startHour, setStartHour] = useState<number>(8);
  const [endHour, setEndHour] = useState<number>(9);

  const resetConfirmation = () => {
    if (mapConfirmed) {
      setMapConfirmed(false);
      setMapBounds(undefined);
      setStationDetails(null);
    }
  };

  useEffect(() => {
    resetConfirmation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaCode, mapMode, minLat, maxLat, minLon, maxLon]);

  // ------------------------ File Submit ------------------------
  const submitAlighting = async () => {
    if (!alightingFile) return alert("กรุณาเลือกไฟล์ Alighting Data");

    try {
      setLoadingA(true);
      const output = await AlightingFitFromXlsx(alightingFile);
      setAlightingResult(output);
      return output;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("เกิดข้อผิดพลาด: " + msg);
    } finally {
      setLoadingA(false);
    }
  };

  const submitInterarrival = async () => {
    if (!interarrivalFile) return alert("กรุณาเลือกไฟล์ Interarrival Data");

    try {
      setLoadingI(true);
      const output = await InterarrivalFitFromXlsx(interarrivalFile);
      setInterarrivalResult(output);
      return output;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("เกิดข้อผิดพลาด: " + msg);
    } finally {
      setLoadingI(false);
    }
  };

  // unified submit: submit both Alighting and Interarrival if present,
  // then build Configuration and show GuestScenario
  const submitSelected = async () => {
    if (!mapConfirmed) return alert("กรุณากด Confirm Map ก่อน");
    if (!alightingFile && !interarrivalFile)
      return alert("กรุณาเลือกไฟล์ Alighting หรือ Interarrival ก่อนกด Submit");

    let alightRes: any = alightingResult;
    let interRes: any = interarrivalResult;

    try {
      // If files provided, submit each. They manage their own loading states.
      if (alightingFile) {
        const outA = await submitAlighting();
        if (outA) alightRes = outA;
      }

      if (interarrivalFile) {
        const outI = await submitInterarrival();
        if (outI) interRes = outI;
      }

      const network: NetworkModel = {
        Network_model: "guest_network",
        Station_detail: stationDetails ?? [],
        StationPair: [],
      };

      const alightingDist = isDataFitResponse(alightRes)
        ? alightRes
        : { DataFitResponse: [] };
      const interarrivalDist = isDataFitResponse(interRes)
        ? interRes
        : { DataFitResponse: [] };

      const cfg: Configuration = {
        Network_model: network,
        Alighting_Distribution: alightingDist,
        Interarrival_Distribution: interarrivalDist,
      };

      setSubmittedConfig(cfg);
      return cfg;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("ส่งข้อมูลไม่สำเร็จ: " + msg);
    }
  };

  // ------------------------ Map Save ------------------------
  const handleConfirmMap = async () => {
    if (mapMode === "area") {
      if (areaCode.trim() === "") return alert("กรุณากรอก Area Code");

      try {
        const mapApi = await import("../../utility/api/mapApi");
        const bb = await mapApi.fetchAreaBounds(areaCode);

        // Fetch bus stops within the administrative area (use area query to avoid extra outside stops)
        const busStopsData = await mapApi.fetchBusStopsInArea(areaCode);

        // Build NetworkGraph with bus stops (StationDetail format)
        const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
          StationID: String(stop.id),
          StationName: stop.tags?.name || `Bus Stop ${stop.id}`,
          location: { type: "Point", coordinates: [stop.lon, stop.lat] },
          Lat: String(stop.lat),
          Lon: String(stop.lon),
        }));

        setMapBounds({
          minLat: bb.minlat,
          maxLat: bb.maxlat,
          minLon: bb.minlon,
          maxLon: bb.maxlon,
        });
        setStationDetails(stationDetails);
        setMapConfirmed(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(msg ?? "โหลด area code ไม่สำเร็จ");
      }

      return;
    }

    // manual lat/lon mode
    setMapBounds({ minLat, maxLat, minLon, maxLon });

    // For manual mode, also fetch bus stops and create NetworkGraph
    try {
      const mapApi = await import("../../utility/api/mapApi");
      const busStopsData = await mapApi.fetchBusStops([
        [minLat, minLon],
        [maxLat, maxLon],
      ]);

      const stationDetails: StationDetail[] = busStopsData.map((stop) => ({
        StationID: String(stop.id),
        StationName: stop.tags?.name || `Bus Stop ${stop.id}`,
        location: { type: "Point", coordinates: [stop.lon, stop.lat] },
        Lat: String(stop.lat),
        Lon: String(stop.lon),
      }));

      setStationDetails(stationDetails);
    } catch (err: unknown) {
      console.error("Failed to fetch bus stops for manual bounds:", err);
    }

    setMapConfirmed(true);
  };

  // ----------------------------------------------------------------------
  // สร้างไฟล์ Excel template โดยมีแต่ละชีทตาม `stationDetails`
  const downloadTemplate = async () => {
    if (!stationDetails || stationDetails.length === 0) {
      return alert("ไม่มี station details ให้สร้าง template");
    }
    // use numeric startHour/endHour (integers 0-24)
    const s = Math.floor(Number(startHour));
    const e = Math.floor(Number(endHour));
    if (!Number.isFinite(s) || !Number.isFinite(e))
      return alert("กรุณาใส่เลขชั่วโมงที่ถูกต้อง (0-24)");
    if (s < 0 || s > 23 || e < 1 || e > 24)
      return alert("ชั่วโมงต้องอยู่ระหว่าง 0 ถึง 24 (start 0-23, end 1-24)");
    if (e <= s) return alert("เวลาปิดต้องมากกว่าเวลาเปิด");

    const segments: string[] = [];
    for (let h = s; h < e; h++) {
      const label = `${String(h).padStart(2, "0")}:00-${String(h).padStart(
        2,
        "0"
      )}:59`;
      segments.push(label);
    }

    try {
      const ExcelJS = await import("exceljs");
      const wb = new ExcelJS.Workbook();

      const usedNames = new Set<string>();
      stationDetails.forEach((s, idx) => {
        // sanitize raw name (remove invalid chars)
        const raw = s.StationName ?? `Station-${s.StationID ?? idx + 1}`;
        const cleaned = raw.replace(/[\\\/\*\?\:\[\]]/g, "");
        const base = (cleaned || `Sheet${idx + 1}`).slice(0, 31);

        let safe = base;
        // if already used, try to make unique by appending StationID or a counter
        if (usedNames.has(safe)) {
          const idSuffix = s.StationID ? `-${s.StationID}` : undefined;
          if (idSuffix) {
            const maxBase = Math.max(0, 31 - idSuffix.length);
            safe = (base.slice(0, maxBase) + idSuffix).slice(0, 31);
          }
        }

        let counter = 1;
        while (usedNames.has(safe)) {
          const suffix = `(${counter})`;
          const maxBase = Math.max(0, 31 - suffix.length);
          safe = (base.slice(0, maxBase) + suffix).slice(0, 31);
          counter++;
        }

        usedNames.add(safe);
        const ws = wb.addWorksheet(safe);
        const headerRow = [...segments];
        ws.addRow(headerRow);
      });

      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "template_station_list.xlsx";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("สร้างไฟล์ไม่ได้: " + msg);
    }
  };

  if (submittedConfig) {
    return (
      <GuestScenario
        configuration={submittedConfig}
        onBack={() => setSubmittedConfig(null)}
      />
    );
  }

  return (
    <main className="p-6">
      <h2 className="text-2xl font-bold mb-4">Guest Configuration</h2>

      <div className="flex gap-6">
        {/* Left: Map (reduced size) */}
        <div className="w-2/3 border rounded-lg overflow-hidden">
          <div className="w-full h-full">
            <MapViewer
              minLat={mapBounds?.minLat}
              maxLat={mapBounds?.maxLat}
              minLon={mapBounds?.minLon}
              maxLon={mapBounds?.maxLon}
              areaCode={mapMode === "area" ? areaCode : undefined}
              externalBusStops={
                stationDetails
                  ? stationDetails.map((s) => ({
                      id: Number(s.StationID),
                      position: [Number(s.Lat), Number(s.Lon)] as [
                        number,
                        number
                      ],
                      name: s.StationName,
                    }))
                  : undefined
              }
            />
          </div>
        </div>

        {/* Right: stacked controls */}
        <aside className="w-1/3 flex flex-col gap-4">
          <section className="border rounded-lg p-4 space-y-3">
            <h3 className="font-bold text-lg">Map Area Configuration</h3>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-pressed={mapMode === "area"}
                  onClick={() => setMapMode("area")}
                  className={`px-3 py-2 rounded-lg text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    mapMode === "area"
                      ? "bg-amber-600 text-white "
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200  "
                  }`}
                >
                  Area Code
                </button>

                <button
                  type="button"
                  aria-pressed={mapMode === "manual"}
                  onClick={() => setMapMode("manual")}
                  className={`px-3 py-2 rounded-md text-sm font-medium focus:outline-none focus:ring-2 focus:ring-amber-400 ${
                    mapMode === "manual"
                      ? "bg-amber-600 text-white"
                      : "bg-gray-100 text-gray-800 hover:bg-gray-200"
                  }`}
                >
                  ใช้ Lat / Lon
                </button>
              </div>
            </div>

            {mapMode === "area" ? (
              <input
                type="text"
                placeholder="กรอก area id เช่น 3600062421"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value)}
                className="border p-2 w-full rounded"
              />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  step="0.0001"
                  value={minLat}
                  onChange={(e) => setMinLat(parseFloat(e.target.value))}
                  className="border p-2 rounded"
                  placeholder="minLat"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={maxLat}
                  onChange={(e) => setMaxLat(parseFloat(e.target.value))}
                  className="border p-2 rounded"
                  placeholder="maxLat"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={minLon}
                  onChange={(e) => setMinLon(parseFloat(e.target.value))}
                  className="border p-2 rounded"
                  placeholder="minLon"
                />
                <input
                  type="number"
                  step="0.0001"
                  value={maxLon}
                  onChange={(e) => setMaxLon(parseFloat(e.target.value))}
                  className="border p-2 rounded"
                  placeholder="maxLon"
                />
              </div>
            )}

            <div className="flex justify-end">
              <button
                onClick={handleConfirmMap}
                className="bg-amber-600 text-white px-4 py-2 rounded hover:bg-amber-700"
              >
                Confirm Map
              </button>
            </div>
          </section>

          <section className="border rounded-lg p-4 flex-1 flex flex-col">
            <div className="mb-2">
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={startHour}
                  onChange={(e) => setStartHour(Number(e.target.value))}
                  className="border p-2 rounded w-20"
                />
                <p>:00</p>
                <span className="text-sm">to</span>
                <input
                  type="number"
                  min={0}
                  max={24}
                  value={endHour}
                  onChange={(e) => setEndHour(Number(e.target.value))}
                  className="border p-2 rounded w-20"
                />
                <p>:00</p>
              </div>
              <div>
                <span className="ml-2 text-sm block mt-2">
                  <button
                    type="button"
                    onClick={downloadTemplate}
                    disabled={!mapConfirmed || !stationDetails}
                    className={`p-0 m-0 bg-transparent border-0 text-blue-600 underline ${
                      !mapConfirmed || !stationDetails
                        ? "opacity-50 cursor-not-allowed"
                        : "hover:text-blue-800"
                    }`}
                  >
                    Click here
                  </button>
                  <span className="ml-1">to download the .xlsx template</span>
                </span>
              </div>
              {!mapConfirmed && (
                <span className="text-sm text-gray-500 ml-2">
                  (confirm map ก่อน)
                </span>
              )}
            </div>
          </section>

          <section className="border rounded-lg p-4 flex-1 flex flex-col">
            <h3 className="font-bold text-lg mb-2">Alighting Data</h3>

            {/* Large drag-and-drop area for file upload. Disabled until map confirmed. */}
            <input
              id="alight-file"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAlightingFile(f);
                if (f) setLastSelected("alighting");
              }}
              disabled={!mapConfirmed}
            />

            <div
              className={`mt-3 p-6 border-2 rounded ${
                mapConfirmed ? "cursor-pointer" : "cursor-not-allowed"
              } flex flex-col items-center justify-center text-center ${
                mapConfirmed
                  ? "border-dashed border-gray-300 bg-white"
                  : "opacity-60 bg-gray-50"
              } min-h-[80px]`}
              onClick={() =>
                mapConfirmed &&
                (
                  document.getElementById(
                    "alight-file"
                  ) as HTMLInputElement | null
                )?.click()
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!mapConfirmed) return;
                const f = e.dataTransfer?.files?.[0];
                if (f) {
                  setAlightingFile(f);
                  setLastSelected("alighting");
                }
              }}
            >
              {/* <p className="text-lg text-gray-800 font-semibold mt-3">
                {mapConfirmed
                  ? "คลิกหรือวางไฟล์ที่นี่ (.xlsx)"
                  : "กด Confirm Map ก่อนอัปโหลดไฟล์"}
              </p> */}

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!mapConfirmed) return;
                  (
                    document.getElementById(
                      "alight-file"
                    ) as HTMLInputElement | null
                  )?.click();
                }}
                disabled={!mapConfirmed}
                className={`mt-4 px-4 py-2 rounded text-white ${
                  mapConfirmed
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {mapConfirmed ? "Choose file" : "Confirm map ก่อนเลือกไฟล์"}
              </button>
            </div>

            {alightingFile && (
              <p className="text-green-600">ไฟล์: {alightingFile.name}</p>
            )}
            <h3 className="font-bold text-lg mb-2 mt-4">Interarrival Data</h3>

            <input
              id="inter-file"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setInterarrivalFile(f);
                if (f) setLastSelected("interarrival");
              }}
              disabled={!mapConfirmed}
            />

            <div
              className={`mt-3 p-6 border-2 rounded ${
                mapConfirmed ? "cursor-pointer" : "cursor-not-allowed"
              } flex flex-col items-center justify-center text-center ${
                mapConfirmed
                  ? "border-dashed border-gray-300 bg-white"
                  : "opacity-60 bg-gray-50"
              } min-h-[80px]`}
              onClick={() =>
                mapConfirmed &&
                (
                  document.getElementById(
                    "inter-file"
                  ) as HTMLInputElement | null
                )?.click()
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                if (!mapConfirmed) return;
                const f = e.dataTransfer?.files?.[0];
                if (f) {
                  setInterarrivalFile(f);
                  setLastSelected("interarrival");
                }
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!mapConfirmed) return;
                  (
                    document.getElementById(
                      "inter-file"
                    ) as HTMLInputElement | null
                  )?.click();
                }}
                disabled={!mapConfirmed}
                className={`mt-4 px-4 py-2 rounded text-white ${
                  mapConfirmed
                    ? "bg-blue-600 hover:bg-blue-700"
                    : "bg-gray-400 cursor-not-allowed"
                }`}
              >
                {mapConfirmed ? "Choose file" : "Confirm map ก่อนเลือกไฟล์"}
              </button>
            </div>

            {interarrivalFile && (
              <p className="text-green-600">ไฟล์: {interarrivalFile.name}</p>
            )}
          </section>

          <div className="mt-2">
            <button
              onClick={submitSelected}
              disabled={
                !mapConfirmed ||
                (!alightingFile && !interarrivalFile) ||
                loadingA ||
                loadingI
              }
              className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
            >
              {loadingA || loadingI ? "กำลังประมวลผล..." : "Apply"}
            </button>
          </div>
        </aside>
      </div>

      {/* ปริ้นเล่นๆ stationDetails */}
      {/* {stationDetails && (
        <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h3 className="font-bold text-lg mb-2">
            Debug: Station Details ({stationDetails.length} stops)
          </h3>
          <pre className="bg-white p-3 rounded overflow-auto text-xs">
            {JSON.stringify(stationDetails, null, 2)}
          </pre>
        </div>
      )} */}
    </main>
  );
}
