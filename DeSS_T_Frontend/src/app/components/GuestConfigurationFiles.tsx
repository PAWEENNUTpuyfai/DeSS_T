import { useState } from "react";
import {
  AlightingFitFromXlsx,
  InterarrivalFitFromXlsx,
} from "../../utility/api/distribution_fit";
import ConfigurationNav from "./ConfigurationNav";
import type { StationDetail } from "../models/Network";
import type { Configuration } from "../models/Configuration";
import type { NetworkModel } from "../models/Network";
import buildNetworkModelFromStations from "../../utility/api/openRouteService";
import { isDataFitResponse } from "../models/DistriButionFitModel";

interface GuestConfigurationFilesProps {
  stationDetails: StationDetail[];
  mapBounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  onBack: () => void;
  onSubmit: (config: Configuration) => void;
}

export default function GuestConfigurationFiles({
  stationDetails,
  mapBounds,
  onBack,
  onSubmit,
}: GuestConfigurationFilesProps) {
  const [alightingFile, setAlightingFile] = useState<File | null>(null);
  const [alightingResult, setAlightingResult] = useState<unknown>(null);
  const [loadingA, setLoadingA] = useState(false);

  const [interarrivalFile, setInterarrivalFile] = useState<File | null>(null);
  const [interarrivalResult, setInterarrivalResult] = useState<unknown>(null);
  const [loadingI, setLoadingI] = useState(false);

  const [startHour, setStartHour] = useState<number>(8);
  const [endHour, setEndHour] = useState<number>(9);

  // File Upload Functions
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

  const downloadTemplate = async () => {
    if (!stationDetails || stationDetails.length === 0) {
      return alert("ไม่มี station details ให้สร้าง template");
    }

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
        const raw = s.StationName ?? `Station-${s.StationID ?? idx + 1}`;
        const cleaned = raw.replace(/[\\\/\*\?\:\[\]]/g, "");
        const base = (cleaned || `Sheet${idx + 1}`).slice(0, 31);

        let safe = base;
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

  const submitSelected = async () => {
    if (!alightingFile && !interarrivalFile)
      return alert("กรุณาเลือกไฟล์ Alighting หรือ Interarrival ก่อนกด Submit");

    let alightRes: any = alightingResult;
    let interRes: any = interarrivalResult;

    try {
      if (alightingFile) {
        const outA = await submitAlighting();
        if (outA) alightRes = outA;
      }

      if (interarrivalFile) {
        const outI = await submitInterarrival();
        if (outI) interRes = outI;
      }

      let network: NetworkModel;
      if (stationDetails && stationDetails.length > 0) {
        try {
          network = await buildNetworkModelFromStations(
            stationDetails,
            "guest_network"
          );
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.error("Failed to build network with ORS:", errorMsg);

          alert(
            `เกิดข้อผิดพลาดในการดึงข้อมูลจาก OpenRouteService:\n${errorMsg}\n\nกรุณาตรวจสอบ:\n1. VITE_ORS_API_KEY ถูกตั้งค่าใน .env\n2. API key ยังมีเครดิต\n3. จำนวน stations ไม่เกินขีดจำกัด`
          );
          throw err;
        }
      } else {
        network = {
          Network_model: "guest_network",
          Station_detail: stationDetails ?? [],
          StationPair: [],
        };
      }

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

      onSubmit(cfg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("ส่งข้อมูลไม่สำเร็จ: " + msg);
    }
  };

  return (
    <>
      <ConfigurationNav mode="guest" />
      <main style={{ marginTop: "100px", marginBottom: "40px" }}>
        <div className="flex flex-col gap-8 w-full px-6 max-w-4xl mx-auto">
          {/* Time Range Section */}
          <section className="border rounded-lg p-6 space-y-4">
            <h3 className="font-bold text-xl">Time Range</h3>

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

            <div className="mt-4">
              <button
                type="button"
                onClick={downloadTemplate}
                className="text-blue-600 underline hover:text-blue-800"
              >
                Click here
              </button>
              <span className="ml-1">to download the .xlsx template</span>
            </div>
          </section>

          {/* Alighting Data Section */}
          <section className="border rounded-lg p-6 space-y-4">
            <h3 className="font-bold text-xl">Alighting Data</h3>

            <input
              id="alight-file"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setAlightingFile(f);
              }}
            />

            <div
              className="p-6 border-2 border-dashed border-gray-300 bg-white rounded cursor-pointer flex flex-col items-center justify-center min-h-[100px] hover:bg-gray-50"
              onClick={() =>
                (document.getElementById("alight-file") as HTMLInputElement | null)?.click()
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f) setAlightingFile(f);
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (document.getElementById("alight-file") as HTMLInputElement | null)?.click();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Choose file
              </button>
            </div>

            {alightingFile && (
              <p className="text-green-600">✓ ไฟล์: {alightingFile.name}</p>
            )}
          </section>

          {/* Interarrival Data Section */}
          <section className="border rounded-lg p-6 space-y-4">
            <h3 className="font-bold text-xl">Interarrival Data</h3>

            <input
              id="inter-file"
              type="file"
              accept=".xlsx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setInterarrivalFile(f);
              }}
            />

            <div
              className="p-6 border-2 border-dashed border-gray-300 bg-white rounded cursor-pointer flex flex-col items-center justify-center min-h-[100px] hover:bg-gray-50"
              onClick={() =>
                (document.getElementById("inter-file") as HTMLInputElement | null)?.click()
              }
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer?.files?.[0];
                if (f) setInterarrivalFile(f);
              }}
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  (document.getElementById("inter-file") as HTMLInputElement | null)?.click();
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Choose file
              </button>
            </div>

            {interarrivalFile && (
              <p className="text-green-600">✓ ไฟล์: {interarrivalFile.name}</p>
            )}
          </section>

          {/* Action Buttons */}
          <div className="flex gap-4 justify-end py-4 border-t">
            <button
              onClick={onBack}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded hover:bg-gray-50"
            >
              Back
            </button>
            <button
              onClick={submitSelected}
              disabled={!alightingFile && !interarrivalFile || loadingA || loadingI}
              className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingA || loadingI ? "กำลังประมวลผล..." : "Apply"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
