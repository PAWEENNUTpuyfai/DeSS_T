import { useState } from "react";
import {
  AlightingFitFromXlsx,
  InterarrivalFitFromXlsx,
} from "../../../utility/api/distribution_fit";
import ConfigurationNav from "./ConfigurationNav";
import MapViewer from "../MapViewer";
import LoadingModal from "../LoadingModal";
import type { StationDetail, StationPair } from "../../models/Network";
import type {
  AlightingData,
  InterArrivalData,
  ConfigurationDetail,
} from "../../models/Configuration";
import type { NetworkModel } from "../../models/Network";
import buildNetworkModelFromStations from "../../../utility/api/openRouteService";
import { isDataFitResponse } from "../../models/DistriButionFitModel";
import HelpButton from "../HelpButton";
interface GuestConfigurationFilesProps {
  stationDetails: StationDetail[];
  mapBounds: { minLat: number; maxLat: number; minLon: number; maxLon: number };
  onBack: () => void;
  onSubmit: (config: ConfigurationDetail) => void;
  mode?: "guest" | "user";
  configurationName?: string;
  configuration?: ConfigurationDetail;
}

export default function ConfigurationFiles({
  stationDetails,
  mapBounds,
  onBack,
  onSubmit,
  mode = "guest",
  configurationName,
  configuration,
}: GuestConfigurationFilesProps) {
  const makeId = (): string => {
    try {
      if (typeof crypto !== "undefined" && crypto.randomUUID) {
        return crypto.randomUUID();
      }
    } catch { /* empty */ }
    return Math.random().toString(36).slice(2);
  };

  const findStationDetail = (
    key: string,
    list: StationDetail[]
  ): StationDetail | undefined => {
    return (
      list.find((sd) => sd.station_detail_id === key) ||
      list.find((sd) => (sd.name ?? "") === key)
    );
  };

  const toAlightingData = (
    res: unknown,
    stations: StationDetail[]
  ): AlightingData[] => {
    if (!isDataFitResponse(res)) return [];
    return res.DataFitResponse.map((item) => ({
      alighting_data_id: makeId(),
      time_period: item.Time_Range,
      distribution: item.Distribution,
      argument_list: item.ArgumentList,
      station_id: item.Station,
      station_detail: findStationDetail(item.Station, stations),
    }));
  };

  const toInterArrivalData = (
    res: unknown,
    stations: StationDetail[]
  ): InterArrivalData[] => {
    if (!isDataFitResponse(res)) return [];
    return res.DataFitResponse.map((item) => ({
      inter_arrival_data_id: makeId(),
      time_period: item.Time_Range,
      distribution: item.Distribution,
      argument_list: item.ArgumentList,
      station_id: item.Station,
      station_detail: findStationDetail(item.Station, stations),
    }));
  };
  const [alightingFile, setAlightingFile] = useState<File | null>(null);
  const [alightingResult, setAlightingResult] = useState<unknown>(null);
  const [loadingA, setLoadingA] = useState(false);

  const [interarrivalFile, setInterarrivalFile] = useState<File | null>(null);
  const [interarrivalResult, setInterarrivalResult] = useState<unknown>(null);
  const [loadingI, setLoadingI] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [startHour, setStartHour] = useState<number>(8);
  const [endHour, setEndHour] = useState<number>(16);
  const [showTemplateModal, setShowTemplateModal] = useState(false);

  // File Upload Functions
  const submitAlighting = async () => {
    if (!alightingFile) return alert("Please select an Alighting data file");

    try {
      setLoadingA(true);
      const output = await AlightingFitFromXlsx(alightingFile, stationDetails);
      setAlightingResult(output);
      return output;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Error: " + msg);
    } finally {
      setLoadingA(false);
    }
  };

  const submitInterarrival = async () => {
    if (!interarrivalFile)
      return alert("Please select an Interarrival data file");

    try {
      setLoadingI(true);
      const output = await InterarrivalFitFromXlsx(
        interarrivalFile,
        stationDetails
      );
      setInterarrivalResult(output);
      return output;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      alert("Error: " + msg);
    } finally {
      setLoadingI(false);
    }
  };

  const downloadTemplate = async () => {
    if (!stationDetails || stationDetails.length === 0) {
      return alert("No station details available to create template");
    }

    const s = Math.floor(Number(startHour));
    const e = Math.floor(Number(endHour));
    if (!Number.isFinite(s) || !Number.isFinite(e))
      return alert("Please enter a valid hour number (0-24)");
    if (s < 0 || s > 23 || e < 1 || e > 24)
      return alert("Hours must be between 0 and 24 (start 0-23, end 1-24)");
    if (e <= s) return alert("End time must be later than start time");

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
        const raw = s.name ?? `Station-${s.station_detail_id ?? idx + 1}`;
        const cleaned = raw.replace(/[\\/*?:[\]]/g, "");
        const base = (cleaned || `Sheet${idx + 1}`).slice(0, 31);

        let safe = base;
        if (usedNames.has(safe)) {
          const idSuffix = s.station_detail_id
            ? `-${s.station_detail_id}`
            : undefined;
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
      alert("Failed to create file: " + msg);
    }
  };

  const submitSelected = async () => {
    if (mode === "user") {
      // For user mode, do nothing on save click
      return;
    }

    // Prevent rapid repeated clicks while submitting
    if (isSubmitting) return;

    if (!alightingFile || !interarrivalFile)
      return alert(
        "Please attach both Alighting and Interarrival files before submitting"
      );

    let alightRes: unknown = alightingResult;
    let interRes: unknown = interarrivalResult;

    try {
      setIsSubmitting(true);
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
          console.error("Failed to build network - Full error:", err);
          console.error("Error message:", errorMsg);
          // Surface a single clear error; outer catch will alert
          throw new Error(
            "Failed to build network. Ensure the backend is running and try again.\n\nDetails: " +
              errorMsg
          );
        }
      } else {
        network = {
          network_model_id: "guest_network",
          StationPair: [],
        };
      }

      // For Configuration, only save the station data and station pairs
      // Routes will be created in the Scenario phase
      const networkData = network as NetworkModel & {
        StationPair?: StationPair[];
      };

      // Stations from ConfigurationMap are already in StationDetail format
      // Just pass them directly to NetworkModel
      const normalizedStations = stationDetails.map((station, idx) => ({
        ...station,
        station_detail_id: station.station_detail_id || String(idx),
        lat: station.lat ?? 0,
        lon: station.lon ?? 0,
      }));

      // Build NetworkModel with only stations and station pairs (no routes)
      const configNetworkModel: NetworkModel = {
        ...network,
        StationPair: networkData.StationPair || [],
        Station_detail: normalizedStations, // Properly formatted stations with IDs
      };

      const cfg: ConfigurationDetail = {
        configuration_detail_id: configuration
          ? configuration.configuration_detail_id
          : "guest-configuration-"+Date.now(),
        alighting_data_id: "alighting-data-" + Date.now(),
        interarrival_data_id: "interarrival-data-" + Date.now(),
        network_model_id: configNetworkModel.network_model_id || "guest_network",
        network_model: configNetworkModel,
        alighting_datas: toAlightingData(alightRes, normalizedStations),
        interarrival_datas: toInterArrivalData(interRes, normalizedStations),
      };

      // Save stations to localStorage for InteractiveMap real-time sync
      const stationsForPlayback = normalizedStations.map((st) => ({
        id: st.station_detail_id || `st-${Math.random()}`,
        name: st.name || "Unknown",
        lat: st.lat ?? 0,
        lon: st.lon ?? 0,
      }));
      
      localStorage.setItem('scenario_stations', JSON.stringify(stationsForPlayback));

      onSubmit(cfg);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      alert("Submit failed: " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <ConfigurationNav mode={mode} configurationName={configurationName} />
      <LoadingModal
        isOpen={loadingA || loadingI || isSubmitting}
        message={
          isSubmitting ? "Applying configuration..." : "Processing files..."
        }
      />
      <main>
        <div className="h-[12vh]"></div>
        <div className="content h-full mx-auto">
          <div className="flex gap-12 w-full h-full px-6 max-w-7xl mx-auto">
            {/* Left: Map */}
            <div
              className="flex-1 border rounded-[25px] overflow-hidden my-8 ml-2"
              style={{ position: "relative", zIndex: 1 }}
            >
              <MapViewer
                minLat={mapBounds.minLat}
                maxLat={mapBounds.maxLat}
                minLon={mapBounds.minLon}
                maxLon={mapBounds.maxLon}
                stationDetails={stationDetails}
              />
            </div>

            {/* Right: File Upload Section */}
            <div className="flex-1 flex flex-col gap-3 h-full py-8">
              <div>
                <span>
                  <span
                    onClick={() => setShowTemplateModal(true)}
                    className="text-[#81069e] underline hover:text-[#323232] cursor-pointer"
                  >
                    Click here
                  </span>
                  <span className="ml-3">to download the .xlsx template</span>
                </span>
              </div>

              {/* Template Download Modal */}
              {showTemplateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                  <div className="bg-white rounded-[25px] p-8 shadow-lg max-w-md w-full">
                    <div className="flex">
                      <h2 className="content_title mb-6">Set Time Range </h2>{" "}
                      <p className="ml-2 text-gray-500">(Only for template)</p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 font-medium">
                        Time range :
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={23}
                        value={startHour}
                        onChange={(e) => setStartHour(Number(e.target.value))}
                        className="border p-2 rounded w-10"
                      />
                      <span>:00</span>
                      <span className="text-gray-600">to</span>
                      <input
                        type="number"
                        min={1}
                        max={24}
                        value={endHour}
                        onChange={(e) => setEndHour(Number(e.target.value))}
                        className="border p-2 rounded w-10"
                      />
                      <span>:00</span>
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
                        className="btn_primary ml-2"
                      >
                        download
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Alighting Data Section */}
              <div className="flex justify-between items-center mt-2 pr-1">
                <h3 className="content_title">Alighting Data</h3>{" "}
                <HelpButton helpType="Alighting" />
              </div>

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
                className="p-6 border-2 border-dashed border-[#81069e] rounded-[20px] bg-white cursor-pointer flex flex-col items-center justify-center min-h-[120px] hover:bg-gray-50"
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
                <p className="text-gray-600 mb-2">
                  Drag and drop file here (.xlsx)
                </p>
                <p className="text-gray-400 text-sm">or click to select file</p>
              </div>

              {alightingFile && (
                <p className="text-green-600">✓ File: {alightingFile.name}</p>
              )}

              {/* Interarrival Data Section */}
              <div className="flex justify-between items-center mt-2 pr-1">
                <h3 className="content_title">Interarrival Data</h3>{" "}
                <HelpButton helpType="Interarrival" />
              </div>

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
                className="p-6 border-2 border-dashed border-[#81069e] rounded-[20px] bg-white cursor-pointer flex flex-col items-center justify-center min-h-[120px] hover:bg-gray-50"
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
                <p className="text-gray-600 mb-2">
                  Drag and drop file here (.xlsx)
                </p>
                <p className="text-gray-400 text-sm">or click to select file</p>
              </div>

              {interarrivalFile && (
                <p className="text-green-600">
                  ✓ File: {interarrivalFile.name}
                </p>
              )}

              {/* Action Buttons */}
              <div className="mt-2 flex justify-end">
                <button
                  onClick={onBack}
                  className="btn_secondary flex items-center"
                >
                  <svg
                    width="25"
                    height="25"
                    viewBox="0 0 64 64"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="mr-3 mb-1"
                  >
                    <path
                      d="M55.9908 36.4579C55.9879 40.8128 54.2573 44.9887 51.1789 48.069C48.1004 51.1493 43.9257 52.8824 39.5708 52.8879H10.0088C9.47836 52.8879 8.96965 52.6772 8.59458 52.3022C8.2195 51.9271 8.00879 51.4184 8.00879 50.8879C8.00879 50.3575 8.2195 49.8488 8.59458 49.4737C8.96965 49.0987 9.47836 48.8879 10.0088 48.8879H39.5708C42.8467 48.8586 45.9784 47.5366 48.2844 45.2097C50.5905 42.8829 51.8843 39.7395 51.8843 36.4634C51.8843 33.1874 50.5905 30.044 48.2844 27.7171C45.9784 25.3903 42.8467 24.0683 39.5708 24.0389H15.5908L22.1358 29.4199C22.34 29.5863 22.5093 29.7914 22.634 30.0233C22.7587 30.2553 22.8364 30.5096 22.8626 30.7717C22.8888 31.0337 22.8629 31.2984 22.7865 31.5505C22.7101 31.8025 22.5847 32.037 22.4175 32.2405C22.2503 32.4439 22.0445 32.6123 21.812 32.7361C21.5795 32.8598 21.3248 32.9363 21.0626 32.9614C20.8004 32.9864 20.5359 32.9594 20.2842 32.882C20.0325 32.8045 19.7985 32.6781 19.5958 32.5099L8.73879 23.5829C8.71479 23.5629 8.69679 23.5389 8.67379 23.5179C8.62173 23.4707 8.57232 23.4206 8.52579 23.3679L8.50979 23.3529C8.49579 23.3369 8.47779 23.3249 8.46379 23.3089V23.3029C8.44279 23.2779 8.42779 23.2489 8.40879 23.2229C8.36945 23.1707 8.33306 23.1163 8.29979 23.0599C8.29179 23.0469 8.28079 23.0349 8.27379 23.0209C8.26679 23.0069 8.24879 22.9879 8.23979 22.9699C8.23079 22.9519 8.21879 22.9159 8.20679 22.8899C8.18013 22.8317 8.15611 22.7723 8.13479 22.7119L8.12779 22.6939C8.08651 22.5796 8.05735 22.4613 8.04079 22.3409C8.03479 22.3039 8.02279 22.2689 8.01979 22.2319C8.01679 22.1949 8.01979 22.1609 8.01979 22.1259C8.01979 22.0909 8.01079 22.0689 8.01079 22.0389C8.01079 22.0089 8.01879 21.9809 8.01979 21.9509V21.8459C8.01979 21.8109 8.03479 21.7729 8.04079 21.7359C8.05729 21.6155 8.08645 21.4972 8.12779 21.3829L8.13479 21.3649C8.15679 21.3039 8.17979 21.2449 8.20679 21.1869C8.21879 21.1609 8.22579 21.1329 8.23979 21.1069C8.25379 21.0809 8.26379 21.0739 8.27379 21.0559C8.28379 21.0379 8.29179 21.0299 8.29979 21.0169C8.33241 20.9607 8.36814 20.9063 8.40679 20.8539C8.42579 20.8279 8.44079 20.7989 8.46179 20.7739V20.7689C8.48179 20.7439 8.50679 20.7269 8.52779 20.7029C8.57379 20.6529 8.62079 20.6029 8.67179 20.5589C8.69479 20.5379 8.71279 20.5139 8.73679 20.4939L8.74679 20.4849L19.5998 11.5669C19.8025 11.3988 20.0365 11.2724 20.2882 11.1949C20.5399 11.1175 20.8044 11.0905 21.0666 11.1155C21.3288 11.1405 21.5835 11.2171 21.816 11.3408C22.0485 11.4646 22.2543 11.633 22.4215 11.8364C22.5887 12.0399 22.7141 12.2744 22.7905 12.5264C22.8669 12.7785 22.8928 13.0431 22.8666 13.3052C22.8404 13.5673 22.7627 13.8216 22.638 14.0536C22.5133 14.2855 22.344 14.4906 22.1398 14.6569L15.5948 20.0389H39.5748C43.9273 20.0448 48.0999 21.7766 51.1773 24.8546C54.2547 27.9326 55.9858 32.1054 55.9908 36.4579Z"
                      fill="#81069E"
                    />
                  </svg>
                  Map Configuration
                </button>
                <button
                  onClick={submitSelected}
                  disabled={loadingA || loadingI || isSubmitting}
                  className="btn_primary ml-3"
                >
                  {isSubmitting || loadingA || loadingI
                    ? "Applying..."
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
