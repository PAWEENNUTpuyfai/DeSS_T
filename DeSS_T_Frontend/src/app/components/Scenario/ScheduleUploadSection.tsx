import React from "react";
import HelpButton from "../HelpButton";

interface ScheduleUploadSectionProps {
  busScheduleFile: File | null;
  hasExistingSchedule: boolean;
  onFileUpload: (file: File | null) => void;
  onDownloadTemplate: () => void;
}

export default function ScheduleUploadSection({
  busScheduleFile,
  hasExistingSchedule,
  onFileUpload,
  onDownloadTemplate,
}: ScheduleUploadSectionProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onFileUpload(e.target.files?.[0] || null);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const f = e.dataTransfer?.files?.[0];
    onFileUpload(f || null);
  };

  return (
    <div className="mb-6 pr-2 ">
      <div className="flex justify-between items-center pr-1  mb-2">
        <h3 className="content_title">Bus Schedule</h3>{" "}
        <HelpButton helpType="Schedule" />
      </div>
      <input
        id="bus-schedule-file"
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleFileChange}
      />
      <div
        className={`p-6 border-2 border-dashed rounded-[20px] bg-white cursor-pointer flex flex-col items-center justify-center min-h-[120px] hover:bg-gray-50 ${
          busScheduleFile || hasExistingSchedule
            ? "border-green-500 bg-green-50"
            : "border-[#81069e]"
        }`}
        onClick={() =>
          (
            document.getElementById(
              "bus-schedule-file",
            ) as HTMLInputElement | null
          )?.click()
        }
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
      >
        {busScheduleFile ? (
          <>
            <p className="text-green-600 font-semibold mb-2">✓ File uploaded</p>
            <p className="text-green-600 text-sm">{busScheduleFile.name}</p>
          </>
        ) : hasExistingSchedule ? (
          <>
            <p className="text-green-600 font-semibold mb-2">
              Existing schedule data loaded
            </p>
            <p className="text-green-600 text-sm text-center">
              You can upload a new file to replace it
            </p>
          </>
        ) : (
          <>
            <p className="text-gray-600 mb-2">
              Drag and drop file here (.xlsx)
            </p>
            <p className="text-gray-400 text-sm">or click to select file</p>
          </>
        )}
      </div>
      <div className="mt-2">
        <span>
          <span
            onClick={onDownloadTemplate}
            className="text-[#81069e] underline hover:text-[#323232] cursor-pointer"
          >
            Click here
          </span>
          <span className="ml-3">to download the .xlsx template</span>
        </span>
      </div>
    </div>
  );
}
