"use client";

import { useState } from "react";
import { DistFitFromXlsx } from "../../utility/api/distribution_fit";
import MapViewer from "../components/MapViewer";

export default function GuestConfiguration() {
  // ------------------------ File Upload States ------------------------
  const [alightingFile, setAlightingFile] = useState<File | null>(null);
  const [alightingResult, setAlightingResult] = useState<any>(null);
  const [loadingA, setLoadingA] = useState(false);

  // ------------------------ Map States ------------------------
  const [areaCode, setAreaCode] = useState("");
  const [minLat, setMinLat] = useState(13.72);
  const [maxLat, setMaxLat] = useState(13.75);
  const [minLon, setMinLon] = useState(100.5);
  const [maxLon, setMaxLon] = useState(100.53);

  const [mapBounds, setMapBounds] = useState({
    minLat,
    maxLat,
    minLon,
    maxLon,
  });

  // ------------------------ File Submit ------------------------
  const submitAlighting = async () => {
    if (!alightingFile) return alert("กรุณาเลือกไฟล์ Alighting Data");

    try {
      setLoadingA(true);
      const output = await DistFitFromXlsx(alightingFile);
      setAlightingResult(output);
    } catch (e: any) {
      alert("เกิดข้อผิดพลาด: " + e.message);
    } finally {
      setLoadingA(false);
    }
  };

  // ------------------------ Map Save ------------------------
  const handleSaveMap = async () => {
  if (areaCode.trim() !== "") {
    try {
      const query = `
        [out:json][timeout:25];
        area(${areaCode})->.searchArea;
        (
          node(area.searchArea);
        );
        out bb;
      `;

      const res = await fetch("https://overpass-api.de/api/interpreter", {
        method: "POST",
        body: query,
      });

      const data = await res.json();

      if (!data.elements || data.elements.length === 0)
        return alert("ไม่พบพื้นที่จาก area code นี้");

      const bb = data.elements[0].bounds;

      setMapBounds({
        minLat: bb.minlat,
        maxLat: bb.maxlat,
        minLon: bb.minlon,
        maxLon: bb.maxlon,
      });

    } catch (err) {
      alert("โหลด area code ไม่สำเร็จ");
    }
    return;
  }

  setMapBounds({ minLat, maxLat, minLon, maxLon });
};

  // ----------------------------------------------------------------------
  return (
    <main className="p-6 space-y-10">
      <h2 className="text-2xl font-bold">Guest Configuration</h2>

      {/* -------------------- Alighting -------------------- */}
      <section className="border rounded-lg p-4 space-y-4">
        <h3 className="font-bold text-lg">Alighting Data</h3>

        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setAlightingFile(e.target.files?.[0] ?? null)}
        />

        {alightingFile && (
          <p className="text-green-600">ไฟล์: {alightingFile.name}</p>
        )}

        <button
          onClick={submitAlighting}
          disabled={loadingA}
          className="bg-blue-600 text-white px-3 py-2 rounded disabled:opacity-50"
        >
          {loadingA ? "กำลังประมวลผล..." : "Submit Alighting"}
        </button>

        {alightingResult && (
          <pre className="bg-gray-100 p-3 rounded whitespace-pre-wrap">
            {JSON.stringify(alightingResult, null, 2)}
          </pre>
        )}
      </section>

      {/* -------------------- Map Controller -------------------- */}
      <section className="border rounded-lg p-4 space-y-4">
        <h3 className="font-bold text-lg">Map Area Configuration</h3>

        <div className="flex items-center gap-6">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mapMode"
              value="area"
              checked={areaCode !== ""}
              onChange={() => setAreaCode(" ")}
            />
            ใช้ Area Name
          </label>

          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="mapMode"
              value="manual"
              checked={areaCode === ""}
              onChange={() => setAreaCode("")}
            />
            ใช้ Lat / Lon
          </label>
        </div>

        {areaCode !== "" && (
          <input
            type="text"
            placeholder="กรอกชื่อสถานที่ เช่น Bangkok"
            value={areaCode}
            onChange={(e) => setAreaCode(e.target.value)}
            className="border p-2 w-full rounded"
          />
        )}

        {areaCode === "" && (
          <div className="grid grid-cols-2 gap-3">
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

        <button
          onClick={handleSaveMap}
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          Save Map
        </button>
      </section>

      <MapViewer
        minLat={mapBounds.minLat}
        maxLat={mapBounds.maxLat}
        minLon={mapBounds.minLon}
        maxLon={mapBounds.maxLon}
      />
    </main>
  );
}
