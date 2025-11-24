"use client";

import { useState } from "react";
import { DistFitFromXlsx } from "../../utility/api/distribution_fit";

export default function GuestConfiguration() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleSubmit = async () => {
    if (!file) {
      alert("กรุณาเลือกไฟล์ xlsx");
      return;
    }

    try {
      setLoading(true);
      const data = await DistFitFromXlsx(file);
      setResult(data);
    } catch (err: any) {
      alert("เกิดข้อผิดพลาด: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="p-6 space-y-6">
      <h2 className="text-2xl font-bold">Guest Configuration</h2>

      {/* Upload box */}
      <div className="border rounded-lg p-4">
        <label className="block mb-2 font-medium">แนบไฟล์ .xlsx</label>
        <input
          type="file"
          accept=".xlsx"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="block w-full"
        />

        {file && (
          <p className="mt-2 text-green-600">ไฟล์ที่เลือก: {file.name}</p>
        )}
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {loading ? "กำลังส่ง..." : "Submit"}
      </button>

      {/* Show result */}
      {result && (
        <pre className="bg-gray-100 p-4 rounded mt-4">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </main>
  );
}
