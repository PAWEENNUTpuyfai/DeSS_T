"use client";

import { useState, useEffect } from "react";
import { DistFitFromXlsx } from "../../utility/api/distribution_fit";
import MapViewer from "../components/MapViewer";

export default function GuestConfiguration() {
  // ------------------------ File Upload States ------------------------
  const [alightingFile, setAlightingFile] = useState<File | null>(null);
  const [alightingResult, setAlightingResult] = useState<unknown>(null);
  const [loadingA, setLoadingA] = useState(false);

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

  // reset confirmation when user edits map inputs
  const resetConfirmation = () => {
    if (mapConfirmed) {
      setMapConfirmed(false);
      setMapBounds(undefined);
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
      const output = await DistFitFromXlsx(alightingFile);
      setAlightingResult(output);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("เกิดข้อผิดพลาด: " + msg);
    } finally {
      setLoadingA(false);
    }
  };

  // ------------------------ Map Save ------------------------
  const handleConfirmMap = async () => {
    if (mapMode === "area") {
      if (areaCode.trim() === "") return alert("กรุณากรอก Area Code");

      try {
        const mapApi = await import("../../utility/api/mapApi");
        const bb = await mapApi.fetchAreaBounds(areaCode);
        setMapBounds({
          minLat: bb.minlat,
          maxLat: bb.maxlat,
          minLon: bb.minlon,
          maxLon: bb.maxlon,
        });
        setMapConfirmed(true);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        alert(msg ?? "โหลด area code ไม่สำเร็จ");
      }

      return;
    }

    // manual lat/lon mode
    setMapBounds({ minLat, maxLat, minLon, maxLon });
    setMapConfirmed(true);
  };

  // ----------------------------------------------------------------------
  const prettyAlightingResult =
    alightingResult === null
      ? null
      : typeof alightingResult === "string"
      ? alightingResult
      : JSON.stringify(alightingResult, null, 2);

  return (
    <main className="p-6 ">
      <div className="mb-6 bg-white p-6 rounded-lg shadow">
        <h2 className="font-lexend text-2xl font-bold mb-4">
          Guest Configuration
        </h2>

        <div className="flex gap-6">
          {/* Left: Map (reduced size) */}
          <div className="w-2/3 border rounded-lg overflow-hidden">
            <div className="w-full h-[60vh]">
              <MapViewer
                minLat={mapBounds?.minLat}
                maxLat={mapBounds?.maxLat}
                minLon={mapBounds?.minLon}
                maxLon={mapBounds?.maxLon}
                areaCode={mapMode === "area" ? areaCode : undefined}
              />
            </div>
          </div>

          {/* Right: stacked controls */}
          <aside className="w-1/3 flex flex-col gap-4">
            <section className="border rounded-lg p-4 space-y-3">
              <h3 className="font-bold text-lg">Map Area Configuration</h3>

              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mapMode"
                    value="area"
                    checked={mapMode === "area"}
                    onChange={() => setMapMode("area")}
                  />
                  ใช้ Area Code
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="mapMode"
                    value="manual"
                    checked={mapMode === "manual"}
                    onChange={() => setMapMode("manual")}
                  />
                  ใช้ Lat / Lon
                </label>
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
              <h3 className="font-bold text-lg mb-2">Alighting Data</h3>

              {/* Large drag-and-drop area for file upload. Disabled until map confirmed. */}
              <input
                id="alight-file"
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => setAlightingFile(e.target.files?.[0] ?? null)}
                disabled={!mapConfirmed}
              />

              <div
                className={`mt-3 p-6 border-2 rounded ${
                  mapConfirmed ? "cursor-pointer" : "cursor-not-allowed"
                } flex flex-col items-center justify-center text-center ${
                  mapConfirmed
                    ? "border-dashed border-gray-300 bg-white"
                    : "opacity-60 bg-gray-50"
                } min-h-[240px]`}
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
                  if (f) setAlightingFile(f);
                }}
              >
                <p className="text-lg text-gray-800 font-semibold mt-3">
                  {mapConfirmed
                    ? "คลิกหรือวางไฟล์ที่นี่ (.xlsx)"
                    : "กด Confirm Map ก่อนอัปโหลดไฟล์"}
                </p>

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

              <div className="mt-2">
                <button
                  onClick={submitAlighting}
                  disabled={!mapConfirmed || loadingA}
                  className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
                >
                  {loadingA ? "กำลังประมวลผล..." : "Submit Alighting"}
                </button>
              </div>

              {prettyAlightingResult !== null && (
                <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap mt-3 overflow-auto">
                  {prettyAlightingResult}
                </pre>
              )}
            </section>
          </aside>
        </div>
      </div>
    </main>
  );
}
