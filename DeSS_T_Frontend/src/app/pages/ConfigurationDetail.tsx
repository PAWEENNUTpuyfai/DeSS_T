import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import NavBar from "../components/NavBar";
import { getConfigurationDetail } from "../../utility/api/configuration";
import type { ConfigurationDetail } from "../models/Configuration";
import ConfigurationDetailMap from "../components/ConfigurationDetailMap";
import type { StationDetail, StationPair } from "../models/Network";
import "../../style/Workspace.css";

export default function ConfigurationDetailPage() {
  const { configurationId } = useParams<{ configurationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [configuration, setConfiguration] =
    useState<ConfigurationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStationIds, setSelectedStationIds] = useState<
    [string | null, string | null]
  >([null, null]);
  const [currentSlot, setCurrentSlot] = useState<0 | 1>(0); // Toggle between station 1 and 2

  useEffect(() => {
    if (!user) {
      navigate("/");
      return;
    }

    if (!configurationId) {
      setError("No configuration ID provided");
      setLoading(false);
      return;
    }

    const fetchConfiguration = async () => {
      try {
        setLoading(true);
        const config = await getConfigurationDetail(configurationId);
        setConfiguration(config);
        // Auto-select first two stations if available
        if (config.network_model?.Station_detail) {
          const stations = config.network_model.Station_detail;
          setSelectedStationIds([
            stations[0]?.station_detail_id || null,
            stations[1]?.station_detail_id || null,
          ]);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to load configuration: ${msg}`);
      } finally {
        setLoading(false);
      }
    };

    fetchConfiguration();
  }, [configurationId, user, navigate]);

  // Handle station click - toggle between slot 0 and 1
  const handleStationClick = (stationId: string) => {
    setSelectedStationIds((prev) => {
      const newIds: [string | null, string | null] = [...prev];
      newIds[currentSlot] = stationId;
      return newIds;
    });
    setCurrentSlot((prev) => (prev === 0 ? 1 : 0)); // Toggle slot
  };

  // Helper functions to filter data based on selected station
  const getFilteredAlighting = (stationId: string | null) => {
    if (!configuration?.alighting_datas || !stationId) return [];
    return configuration.alighting_datas.filter(
      (data) =>
        data.station_id === stationId ||
        data.station_detail?.station_detail_id === stationId,
    );
  };

  const getFilteredInterarrival = (stationId: string | null) => {
    if (!configuration?.interarrival_datas || !stationId) return [];
    return configuration.interarrival_datas.filter(
      (data) =>
        data.station_id === stationId ||
        data.station_detail?.station_detail_id === stationId,
    );
  };

  const getStationPairs = (): StationPair[] => {
    if (!configuration?.network_model?.StationPair) return [];
    const [station1, station2] = selectedStationIds;
    
    // If both stations selected, show only pairs between them
    if (station1 && station2) {
      return configuration.network_model.StationPair.filter(
        (pair) =>
          (pair.FstStation === station1 && pair.SndStation === station2) ||
          (pair.FstStation === station2 && pair.SndStation === station1),
      );
    }
    
    // If only one station selected, show all pairs involving that station
    const selectedStation = station1 || station2;
    if (selectedStation) {
      return configuration.network_model.StationPair.filter(
        (pair) =>
          pair.FstStation === selectedStation ||
          pair.SndStation === selectedStation,
      );
    }
    
    return [];
  };

  const getSelectedStation = (stationId: string | null): StationDetail | null => {
    if (!configuration?.network_model?.Station_detail || !stationId)
      return null;
    return (
      configuration.network_model.Station_detail.find(
        (s) =>
          s.station_detail_id === stationId ||
          s.station_id_osm === stationId,
      ) || null
    );
  };

  const getStationName = (stationId: string): string => {
    if (!configuration?.network_model?.Station_detail) return stationId;
    const station = configuration.network_model.Station_detail.find(
      (s) =>
        s.station_detail_id === stationId || s.station_id_osm === stationId,
    );
    return station?.name || stationId;
  };

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Loading configuration details...</p>
        </div>
      </div>
    );
  }

  if (error || !configuration) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p>{error || "Failed to load configuration"}</p>
          <button
            onClick={() => navigate("/user/workspace")}
            className="mt-4 bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition duration-200"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  const selectedStation1 = getSelectedStation(selectedStationIds[0]);
  const selectedStation2 = getSelectedStation(selectedStationIds[1]);
  const filteredAlighting1 = getFilteredAlighting(selectedStationIds[0]);
  const filteredAlighting2 = getFilteredAlighting(selectedStationIds[1]);
  const filteredInterarrival1 = getFilteredInterarrival(selectedStationIds[0]);
  const filteredInterarrival2 = getFilteredInterarrival(selectedStationIds[1]);
  const stationPairs = getStationPairs();
  const stations = configuration.network_model?.Station_detail || [];

  return (
    <div className="workspace-page">
      <NavBar inpage="configuration-detail" usermode="user" />
      <div className="workspace-body">
        <main className="workspace-main w-full">
          <div className="workspace-header mb-6">
            <div className="workspace-title">
              <span className="workspace-title-bar" />
              <h2>Configuration Details</h2>
            </div>
          </div>

          <div className="px-3 max-w-[98%] mx-auto">
            {/* Main Layout: Data Panel 1 (25%) - Map (50%) - Data Panel 2 (25%) */}
            <div className="flex gap-4 h-[calc(70vh-80px)] mb-6">
              {/* Left: Data Panel 1 - Station 1 Alighting */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                {/* Selected Station 1 Info */}
                {selectedStation1 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold mb-2 text-purple-600">
                      Station 1 {currentSlot === 0 && "(Next Click)"}
                    </h3>
                    <p className="font-semibold">{selectedStation1.name}</p>
                    <p className="text-sm text-gray-600">
                      ID: {selectedStation1.station_detail_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Lat: {selectedStation1.lat?.toFixed(6)}, Lon:{" "}
                      {selectedStation1.lon?.toFixed(6)}
                    </p>
                  </div>
                )}

                {!selectedStation1 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-center">
                      Click on a station
                    </p>
                  </div>
                )}

                {/* Combined Alighting & Interarrival Data Station 1 */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold mb-3 text-purple-600">
                    Alighting & Interarrival Data
                  </h3>
                  {(filteredAlighting1.length > 0 || filteredInterarrival1.length > 0) ? (
                    <div className="space-y-4">
                      {(() => {
                        const timePeriods = new Set<string>();
                        filteredAlighting1.forEach(d => timePeriods.add(d.time_period));
                        filteredInterarrival1.forEach(d => timePeriods.add(d.time_period));
                        
                        return Array.from(timePeriods).sort().map((timePeriod) => {
                          const alighting = filteredAlighting1.find(d => d.time_period === timePeriod);
                          const interarrival = filteredInterarrival1.find(d => d.time_period === timePeriod);
                           
                          return (
                            <div key={timePeriod} className="border-b pb-3 last:border-b-0">
                              <h4 className="font-semibold text-purple-600 mb-2">Time Period : {timePeriod}</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100 border-b">
                                    <tr>
                                      <th className="text-left px-2 py-2">Alighting Dist</th>
                                      <th className="text-left px-2 py-2">Alighting Args</th>
                                      <th className="text-left px-2 py-2">Interarrival Dist</th>
                                      <th className="text-left px-2 py-2">Interarrival Args</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="hover:bg-gray-50">
                                      <td className="px-2 py-2">{alighting?.distribution || "N/A"}</td>
                                      <td className="px-2 py-2 text-xs font-mono">{alighting?.argument_list || "N/A"}</td>
                                      <td className="px-2 py-2">{interarrival?.distribution || "N/A"}</td>
                                      <td className="px-2 py-2 text-xs font-mono">{interarrival?.argument_list || "N/A"}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No data</p>
                  )}
                </div>
              </div>

              {/* Center: Map */}
              <div className="flex-[2] bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                {stations.length > 0 ? (
                  <ConfigurationDetailMap
                    stations={stations}
                    onStationClick={handleStationClick}
                    selectedStationIds={selectedStationIds}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-500">
                    No stations available
                  </div>
                )}
              </div>

              {/* Right: Data Panel 2 - Station 2 Data */}
              <div className="flex-1 flex flex-col gap-4 overflow-y-auto">
                {/* Selected Station 2 Info */}
                {selectedStation2 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold mb-2 text-green-600">
                      Station 2 {currentSlot === 1 && "(Next Click)"}
                    </h3>
                    <p className="font-semibold">{selectedStation2.name}</p>
                    <p className="text-sm text-gray-600">
                      ID: {selectedStation2.station_detail_id}
                    </p>
                    <p className="text-sm text-gray-600">
                      Lat: {selectedStation2.lat?.toFixed(6)}, Lon:{" "}
                      {selectedStation2.lon?.toFixed(6)}
                    </p>
                  </div>
                )}

                {!selectedStation2 && (
                  <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                    <p className="text-gray-600 text-center">
                      Click on a station
                    </p>
                  </div>
                )}

                {/* Combined Alighting & Interarrival Data Station 2 */}
                <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
                  <h3 className="text-lg font-bold mb-3 text-green-600">
                    Alighting & Interarrival Data
                  </h3>
                  {(filteredAlighting2.length > 0 || filteredInterarrival2.length > 0) ? (
                    <div className="space-y-4">
                      {(() => {
                        const timePeriods = new Set<string>();
                        filteredAlighting2.forEach(d => timePeriods.add(d.time_period));
                        filteredInterarrival2.forEach(d => timePeriods.add(d.time_period));
                        
                        return Array.from(timePeriods).sort().map((timePeriod) => {
                          const alighting = filteredAlighting2.find(d => d.time_period === timePeriod);
                          const interarrival = filteredInterarrival2.find(d => d.time_period === timePeriod);
                          
                          return (
                            <div key={timePeriod} className="border-b pb-3 last:border-b-0">
                              <h4 className="font-semibold text-green-600 mb-2">Time Period : {timePeriod}</h4>
                              <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                  <thead className="bg-gray-100 border-b">
                                    <tr>
                                      <th className="text-left px-2 py-2">Alighting Dist</th>
                                      <th className="text-left px-2 py-2">Alighting Args</th>
                                      <th className="text-left px-2 py-2">Interarrival Dist</th>
                                      <th className="text-left px-2 py-2">Interarrival Args</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    <tr className="hover:bg-gray-50">
                                      <td className="px-2 py-2">{alighting?.distribution || "N/A"}</td>
                                      <td className="px-2 py-2 text-xs font-mono">{alighting?.argument_list || "N/A"}</td>
                                      <td className="px-2 py-2">{interarrival?.distribution || "N/A"}</td>
                                      <td className="px-2 py-2 text-xs font-mono">{interarrival?.argument_list || "N/A"}</td>
                                    </tr>
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No data</p>
                  )}
                </div>
              </div>
            </div>

            {/* Station Pairs Section - Full Width Below Map */}
            <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold mb-4 text-purple-600">
                Station Pairs
                {selectedStation1 && selectedStation2 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (between {selectedStation1.name} ↔ {selectedStation2.name})
                  </span>
                )}
                {selectedStation1 && !selectedStation2 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (for {selectedStation1.name})
                  </span>
                )}
                {!selectedStation1 && selectedStation2 && (
                  <span className="text-sm font-normal text-gray-600 ml-2">
                    (for {selectedStation2.name})
                  </span>
                )}
              </h3>
              {stationPairs.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100 border-b">
                      <tr>
                        <th className="text-left px-4 py-2">From Station</th>
                        <th className="text-left px-4 py-2">To Station</th>
                        <th className="text-left px-4 py-2">Distance (m)</th>
                        <th className="text-left px-4 py-2">Travel Time (s)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stationPairs.map((pair, idx) => (
                        <tr key={idx} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {getStationName(pair.FstStation)}
                          </td>
                          <td className="px-4 py-2">
                            {getStationName(pair.SndStation)}
                          </td>
                          <td className="px-4 py-2">
                            {pair.RouteBetween?.Distance?.toFixed(2) || "N/A"}
                          </td>
                          <td className="px-4 py-2">
                            {pair.RouteBetween?.TravelTime?.toFixed(2) || "N/A"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  {selectedStation1 || selectedStation2
                    ? "No station pairs found"
                    : "Select stations to view pairs"}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
