import { useState } from "react";

interface HelpButtonProps {
  helpType: "Alighting" | "Interarrival" | "Schedule" | "Map";
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
      case "Map":
        return {
          title: "Map Configuration Help",
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
