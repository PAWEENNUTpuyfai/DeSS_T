import { useState } from "react";
import {
  AlightingFitFromXlsx,
  InterarrivalFitFromXlsx,
} from "../../utility/api/distribution_fit";
import ConfigurationNav from "./ConfigurationNav";
import MapViewer from "./MapViewer";
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
  mode?: "guest" | "user";
  configurationName?: string;
}

export default function ConfigurationFiles({
  stationDetails,
  mapBounds,
  onBack,
  onSubmit,
  mode = "guest",
  configurationName,
}: GuestConfigurationFilesProps) {
  const [alightingFile, setAlightingFile] = useState<File | null>(null);
  const [alightingResult, setAlightingResult] = useState<unknown>(null);
  const [loadingA, setLoadingA] = useState(false);

  const [interarrivalFile, setInterarrivalFile] = useState<File | null>(null);
  const [interarrivalResult, setInterarrivalResult] = useState<unknown>(null);
  const [loadingI, setLoadingI] = useState(false);

  const [startHour, setStartHour] = useState<number>(8);
  const [endHour, setEndHour] = useState<number>(16);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

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
      setShowTemplateModal(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("สร้างไฟล์ไม่ได้: " + msg);
    }
  };

  const submitSelected = async () => {
    if (mode === "user") {
      // For user mode, do nothing on save click
      return;
    }

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
      <ConfigurationNav mode={mode} configurationName={configurationName} />
      <main style={{ marginTop: "50px" }}>
        <div className="content h-full">
          <div className="flex gap-12 w-full h-full px-6 max-w-7xl mx-auto">
            {/* Left: Map */}
            <div
              className="flex-1 border rounded rounded-[25px] overflow-hidden my-8 ml-2"
              style={{ position: "relative", zIndex: 1 }}
            >
              <MapViewer
                minLat={mapBounds.minLat}
                maxLat={mapBounds.maxLat}
                minLon={mapBounds.minLon}
                maxLon={mapBounds.maxLon}
              />
            </div>

            {/* Right: File Upload Section */}
            <div className="flex-1 flex flex-col gap-6 h-full py-8">
              <div className="mt-4">
                <span>
                  <button
                    type="button"
                    onClick={() => setShowTemplateModal(true)}
                    className="text-blue-600 underline hover:text-blue-900 hover:bg-transparent bg-transparent border-none cursor-pointer p-0 font-inherit"
                  >
                    Click here
                  </button>
                  <span className="ml-1">to download the .xlsx template</span>
                </span>
              </div>

              {/* Template Download Modal */}
              {showTemplateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-[25px] p-8 shadow-lg max-w-md w-full">
                    <h2 className="content_title mb-6">Set Time Range</h2>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <label className="w-20">Start:</label>
                        <input
                          type="number"
                          min={0}
                          max={23}
                          value={startHour}
                          onChange={(e) => setStartHour(Number(e.target.value))}
                          className="border p-2 rounded  w-20"
                        />
                        <span>:00</span>
                      </div>

                      <div className="flex items-center gap-3">
                        <label className="w-20">End:</label>
                        <input
                          type="number"
                          min={1}
                          max={24}
                          value={endHour}
                          onChange={(e) => setEndHour(Number(e.target.value))}
                          className="border p-2 rounded w-20"
                        />
                        <span>:00</span>
                      </div>
                    </div>

                    <div className="flex justify-end mt-4">
                      <button
                        onClick={() => setShowTemplateModal(false)}
                        className="btn_secondary"
                      >
                        cancel
                      </button>
                      <button
                        onClick={downloadTemplate}
                        className="btn_primary"
                      >
                        download
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Alighting Data Section */}
              <h3 className="content_title">Alighting Data</h3>

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
                    (
                      document.getElementById(
                        "alight-file"
                      ) as HTMLInputElement | null
                    )?.click()
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
                      (
                        document.getElementById(
                          "alight-file"
                        ) as HTMLInputElement | null
                      )?.click();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Choose file
                  </button>
                </div>

                {alightingFile && (
                  <p className="text-green-600">✓ ไฟล์: {alightingFile.name}</p>
                )}

              {/* Interarrival Data Section */}
              <h3 className="content_title">Interarrival Data</h3>

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
                    (
                      document.getElementById(
                        "inter-file"
                      ) as HTMLInputElement | null
                    )?.click()
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
                      (
                        document.getElementById(
                          "inter-file"
                        ) as HTMLInputElement | null
                      )?.click();
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Choose file
                  </button>
                </div>

                {interarrivalFile && (
                  <p className="text-green-600">
                    ✓ ไฟล์: {interarrivalFile.name}
                  </p>
                )}

              {/* Action Buttons */}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={onBack}
                  className="btn_secondary"
                >
                  Map Configuration
                </button>
                <button
                  onClick={submitSelected}
                  disabled={
                    (!alightingFile && !interarrivalFile) ||
                    loadingA ||
                    loadingI
                  }
                  className="btn_primary"
                >
                  {loadingA || loadingI
                    ? "กำลังประมวลผล..."
                    : mode === "user"
                    ? "Save"
                    : "Apply"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
