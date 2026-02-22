import { useState } from "react";

interface HelpButtonProps {
  helpType: "Alighting" | "Interarrival" | "Schedule" | "Map" | "Heatmap";
}

export default function HelpButton({ helpType }: HelpButtonProps) {
  const [showHelp, setShowHelp] = useState(false);

  const getHelpContent = () => {
    switch (helpType) {
      case "Alighting":
        return {
          title: "Alighting Data Help",
          content: (
            <>
              <p className="mb-3">
                <strong>Alighting Data:</strong> Upload an Excel file (.xlsx)
                containing passenger alighting data for each station.
              </p>
              <p className="mb-3">
                <strong>Interarrival Data:</strong> Upload an Excel file (.xlsx)
                containing bus interarrival time data.
              </p>
              <p>
                Both files must be attached before you can proceed. Click the
                template download link to get the correct file format.
              </p>
            </>
          ),
        };
      case "Interarrival":
        return {
          title: "Interarrival Data Help",
          content: (
            <>
              <p className="mb-3">
                Configure your simulation scenario parameters including bus
                capacity, number of buses, and simulation duration.
              </p>
              <p>
                Adjust the settings according to your analysis requirements and
                run the simulation to see results.
              </p>
            </>
          ),
        };
      case "Heatmap":
        return {
          title: "Passenger Waiting Density",
          content: (
            <>
              <div className=" rounded-lg p-4 space-y-4">
                <div className="mb-3">
                  <div className="text-sm font-semibold text-gray-800 mb-3">Queue Length (Color)</div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">Low</span>
                      <span className="text-xs text-gray-600">จำนวนคนรอน้อย</span>
                    </div>
                    <div
                      className="flex-1 h-5 rounded-full shadow-sm"
                      style={{
                        background:
                          "linear-gradient(to right, #0096ff, #00ff00, #ffff00, #ff8800, #ff0000)",
                      }}
                    ></div>
                    <div className="flex flex-col items-center gap-1">
                      <span className="text-xs font-medium text-gray-700">High</span>
                      <span className="text-xs text-gray-600">จำนวนคนรอมาก</span>
                    </div>
                  </div>
                </div>
                <div className="border-t border-purple-200 pt-4">
                  <div className="text-sm font-semibold text-gray-800 mb-3">Waiting Time (Blur Width)</div>
                  <div className="space-y-2 text-xs text-gray-700">
                    <p className="flex items-center gap-2">
                      <span className="inline-block w-2 h-2 bg-blue-400 rounded-full"></span>
                      วงกลม <span className="font-semibold">เล็ก</span> = เวลารอสั้น
                    </p>
                    <p className="flex items-center gap-2">
                      <span className="inline-block w-4 h-4 bg-red-400 rounded-full"></span>
                      วงกลม <span className="font-semibold">ใหญ่</span> = เวลารอนาน
                    </p>
                  </div>
                </div>
              </div>

              <div className="border-t border-purple-200 pt-4 rounded p-3 text-xs text-gray-700 space-y-2 mt-3">
                <p className="font-semibold">ตัวอย่างการอ่านแผนที่ :</p>
                <div className="space-y-1.5">
                  <p>• <span className="font-semibold text-red-600">สีแดง + วงกลมใหญ่</span> = ปัญหามาก (คนรอเยอะ + รอนาน)</p>
                  <p>• <span className="font-semibold text-yellow-600">สีเหลือง + วงกลมปานกลาง</span> = ปัญหาปานกลาง</p>
                  <p>• <span className="font-semibold text-blue-600">สีฟ้า + วงกลมเล็ก</span> = ไม่มีปัญหา (คนรอน้อย + รอสั้น)</p>
                </div>
              </div>
            </>
          ),
        };
      case "Map":
        return {
          title: "Map Configuration Help",  
          content: (
            <>
              <p className="mb-3">
                .
              </p>
            </>
          ),
        };
      case "Schedule":
      default:
        return {
          title: "Help",
          content: (
            <>
              <p className="mb-3">
                This is the configuration setup page. Follow the steps to
                configure your transit system simulation:
              </p>
              <ol className="list-decimal ml-5">
                <li>Configure the map area and select stations</li>
                <li>Upload required data files</li>
                <li>Set scenario parameters</li>
                <li>Run the simulation</li>
              </ol>
            </>
          ),
        };
    }
  };

  const { title, content } = getHelpContent();

  return (
    <>
      <span
        onClick={() => setShowHelp(true)}
        className="help-button"
        title="Help"
      >
        <svg
          width="25"
          height="25"
          viewBox="0 0 25 25"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M12.25 23.5C18.4632 23.5 23.5 18.4632 23.5 12.25C23.5 6.0368 18.4632 1 12.25 1C6.0368 1 1 6.0368 1 12.25C1 18.4632 6.0368 23.5 12.25 23.5Z"
            stroke="#81069E"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M12.25 19.5156C12.8972 19.5156 13.4219 18.991 13.4219 18.3438C13.4219 17.6965 12.8972 17.1719 12.25 17.1719C11.6028 17.1719 11.0781 17.6965 11.0781 18.3438C11.0781 18.991 11.6028 19.5156 12.25 19.5156Z"
            fill="#81069E"
          />
          <path
            d="M12.25 14.1255V13.188C12.899 13.188 13.5334 12.9955 14.073 12.635C14.6126 12.2745 15.0331 11.762 15.2815 11.1624C15.5298 10.5628 15.5948 9.9031 15.4682 9.2666C15.3416 8.6301 15.0291 8.04544 14.5702 7.58655C14.1113 7.12766 13.5266 6.81515 12.8901 6.68854C12.2536 6.56193 11.5939 6.62691 10.9943 6.87526C10.3948 7.12361 9.88229 7.54418 9.52174 8.08377C9.16119 8.62337 8.96875 9.25777 8.96875 9.90674"
            stroke="#81069E"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>

      {showHelp && (
        <div className="help-modal-overlay" onClick={() => setShowHelp(false)}>
          <div className="help-modal" onClick={(e) => e.stopPropagation()}>
            <h2 className="help-modal-title">{title}</h2>
            <div className="help-modal-content">{content}</div>
            <div className="help-modal-actions">
              <button
                className="modal-btn modal-btn-primary"
                onClick={() => setShowHelp(false)}
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
