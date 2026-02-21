import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import NavBar from "../components/NavBar";
import {
  getConfigurationDetail,
  getUserConfigurations,
  deleteUserConfiguration,
} from "../../utility/api/configuration";
import type { ConfigurationDetail } from "../models/Configuration";
import ConfigurationDetailMap from "../components/ConfigurationDetailMap";
import type { StationDetail, StationPair } from "../models/Network";
import "../../style/Workspace.css";

export default function ConfigurationDetailPage() {
  const { configurationId } = useParams<{ configurationId: string }>();
  const { user } = useAuth();
  const [configuration, setConfiguration] =
    useState<ConfigurationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [configurationName, setConfigurationName] = useState<string>("");
  const [selectedStationId, setSelectedStationId] = useState<string | null>(
    null,
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [userConfigId, setUserConfigId] = useState<string | null>(null);
  const [stationPairSort, setStationPairSort] = useState<"from" | "to" | "all">(
    "all",
  );
  const [stationPairSearch, setStationPairSearch] = useState<string>("");
  const [showPairAutocomplete, setShowPairAutocomplete] = useState(false);
  const [pairHighlightedIndex, setPairHighlightedIndex] = useState(-1);
  const [pairAutocompleteRef, setPairAutocompleteRef] =
    useState<HTMLDivElement | null>(null);
  const [stationSearch, setStationSearch] = useState<string>("");
  const [stationFilter, setStationFilter] = useState<
    "all" | "with-data" | "no-data"
  >("all");
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [autocompleteRef, setAutocompleteRef] = useState<HTMLDivElement | null>(
    null,
  );

  useEffect(() => {
    if (!user) {
      window.location.href = "/";
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
        // Auto-select first station if available
        if (config.network_model?.Station_detail) {
          const stations = config.network_model.Station_detail;
          setSelectedStationId(stations[0]?.station_detail_id || null);
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to load configuration: ${msg}`);
      } finally {
        setLoading(false);
      }
    };

    fetchConfiguration();
  }, [configurationId, user]);

  useEffect(() => {
    if (!user) {
      return;
    }

    const userId = user.google_id || user.email;
    if (!userId) {
      return;
    }

    const fetchConfigName = async () => {
      try {
        const configurations = await getUserConfigurations(userId);
        const matchedConfig = configurations?.find(
          (config) => config.configuration_detail_id === configurationId,
        );
        if (matchedConfig) {
          setConfigurationName(matchedConfig.name);
          setUserConfigId(matchedConfig.user_configuration_id);
        } else {
          setError("You do not have permission to access this configuration");
          setLoading(false);
        }
      } catch (err) {
        console.error("Failed to fetch configuration name:", err);
        setError("Failed to verify configuration access");
      }
    };

    fetchConfigName();
  }, [user, configurationId]);

  // Click outside to close autocomplete
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef && !autocompleteRef.contains(event.target as Node)) {
        setShowAutocomplete(false);
      }
      if (
        pairAutocompleteRef &&
        !pairAutocompleteRef.contains(event.target as Node)
      ) {
        setShowPairAutocomplete(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [autocompleteRef, pairAutocompleteRef]);

  // Handle station click - set as selected station
  const handleStationClick = (stationId: string) => {
    setSelectedStationId(stationId);
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
    if (!configuration?.network_model?.StationPair || !selectedStationId)
      return [];

    return configuration.network_model.StationPair.filter(
      (pair) =>
        pair.FstStation === selectedStationId ||
        pair.SndStation === selectedStationId,
    );
  };

  const getSelectedStation = (
    stationId: string | null,
  ): StationDetail | null => {
    if (!configuration?.network_model?.Station_detail || !stationId)
      return null;
    return (
      configuration.network_model.Station_detail.find(
        (s) =>
          s.station_detail_id === stationId || s.station_id_osm === stationId,
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

  const handleDeleteClick = () => {
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!userConfigId) return;

    try {
      setIsDeleting(true);
      await deleteUserConfiguration(userConfigId);
      setShowDeleteModal(false);
      window.location.href = "/user/workspace?tab=config";
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(`Failed to delete configuration: ${msg}`);
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const cancelDelete = () => {
    setShowDeleteModal(false);
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
            onClick={() => (window.location.href = "/user/workspace")}
            style={{
              marginTop: "1rem",
              backgroundColor: "#81069e",
              color: "white",
              fontWeight: "600",
              padding: "0.5rem 1.5rem",
              borderRadius: "0.5rem",
              border: "none",
              cursor: "pointer",
              transition: "background-color 0.2s",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.backgroundColor = "#6a0580")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.backgroundColor = "#81069e")
            }
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  const selectedStation1 = getSelectedStation(selectedStationId);
  const filteredAlighting1 = getFilteredAlighting(selectedStationId);
  const filteredInterarrival1 = getFilteredInterarrival(selectedStationId);
  const rawStationPairs = getStationPairs();

  // Filter and sort station pairs based on mode
  const stationPairs = [...rawStationPairs].filter((pair) => {
    if (!selectedStationId || stationPairSort === "all") return true;

    if (stationPairSort === "from") {
      // Only pairs where selected station is FstStation (from station)
      return pair.FstStation === selectedStationId;
    } else {
      // Only pairs where selected station is SndStation (to station)
      return pair.SndStation === selectedStationId;
    }
  });

  const filteredStationPairs = stationPairs.filter((pair) => {
    if (stationPairSearch.trim() === "") return true;
    const query = stationPairSearch.toLowerCase();
    const fromName = getStationName(pair.FstStation).toLowerCase();
    const toName = getStationName(pair.SndStation).toLowerCase();
    return fromName.includes(query) || toName.includes(query);
  });

  const stations = configuration.network_model?.Station_detail || [];
  const totalPairs = configuration.network_model?.StationPair?.length || 0;

  // Stations that have at least one alighting or interarrival record
  const stationsWithDataIds = new Set<string>(
    [
      ...(configuration.alighting_datas?.map(
        (d) => d.station_id || d.station_detail?.station_detail_id || "",
      ) ?? []),
      ...(configuration.interarrival_datas?.map(
        (d) => d.station_id || d.station_detail?.station_detail_id || "",
      ) ?? []),
    ].filter(Boolean),
  );

  // Autocomplete suggestions
  const autocompleteSuggestions =
    stationSearch.trim() !== ""
      ? stations
          .filter(
            (s) =>
              s.name?.toLowerCase().includes(stationSearch.toLowerCase()) ||
              s.station_detail_id
                ?.toLowerCase()
                .includes(stationSearch.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const filteredMapStations = stations.filter((s) => {
    const id = s.station_detail_id ?? "";
    const matchSearch =
      stationSearch.trim() === "" ||
      s.name?.toLowerCase().includes(stationSearch.toLowerCase()) ||
      id.toLowerCase().includes(stationSearch.toLowerCase());
    const hasData = stationsWithDataIds.has(id);
    const matchFilter =
      stationFilter === "all" ||
      (stationFilter === "with-data" && hasData) ||
      (stationFilter === "no-data" && !hasData);
    return matchSearch && matchFilter;
  });

  const handleStationSelect = (station: StationDetail) => {
    setStationSearch(station.name || "");
    setSelectedStationId(station.station_detail_id ?? null);
    setShowAutocomplete(false);
    setHighlightedIndex(-1);
  };

  const pairAutocompleteSuggestions =
    stationPairSearch.trim() !== ""
      ? stations
          .filter((s) =>
            s.name?.toLowerCase().includes(stationPairSearch.toLowerCase()),
          )
          .slice(0, 5)
      : [];

  const handlePairStationSelect = (station: StationDetail) => {
    setStationPairSearch(station.name || "");
    setShowPairAutocomplete(false);
    setPairHighlightedIndex(-1);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showAutocomplete || autocompleteSuggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightedIndex((prev) =>
        prev < autocompleteSuggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && highlightedIndex >= 0) {
      e.preventDefault();
      handleStationSelect(autocompleteSuggestions[highlightedIndex]);
    } else if (e.key === "Escape") {
      setShowAutocomplete(false);
      setHighlightedIndex(-1);
    }
  };

  const handlePairSearchKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => {
    if (!showPairAutocomplete || pairAutocompleteSuggestions.length === 0)
      return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setPairHighlightedIndex((prev) =>
        prev < pairAutocompleteSuggestions.length - 1 ? prev + 1 : prev,
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setPairHighlightedIndex((prev) => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === "Enter" && pairHighlightedIndex >= 0) {
      e.preventDefault();
      handlePairStationSelect(
        pairAutocompleteSuggestions[pairHighlightedIndex],
      );
    } else if (e.key === "Escape") {
      setShowPairAutocomplete(false);
      setPairHighlightedIndex(-1);
    }
  };

  return (
    <div className="workspace-page">
      <NavBar inpage="configuration-detail" usermode="user" />
      <div className="workspace-body">
        <main className="workspace-main w-full">
          {/* ── Header ── */}
          <div className="workspace-header mb-3 relative flex items-center justify-between">
            <div className="workspace-title">
              <span className="workspace-title-bar" />
              <h2>
                {configurationName
                  ? `Configuration Details - ${configurationName}`
                  : "Configuration Details"}
              </h2>
            </div>

            <div className="flex gap-3 mr-auto ml-6">
              <span className="inline-flex items-center gap-2 bg-[#f3e5f5] text-[#81069e] border border-[#d1a3db] rounded-full px-4 py-1.5 text-sm font-semibold">
                {stations.length} Stations
              </span>
              <span className="inline-flex items-center gap-2 bg-[#f3e5f5] text-[#81069e] border border-[#d1a3db] rounded-full px-4 py-1.5 text-sm font-semibold">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
                {totalPairs} Station Pairs
              </span>
            </div>

            <button
              onClick={handleDeleteClick}
              className="p-2 bg-white rounded-full hover:bg-red-50 transition-all shadow-md border border-gray-200 hover:border-red-300 flex items-center gap-2 px-3"
              aria-label="Delete configuration"
              title="Delete configuration"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 20 20"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M7 16C7.26522 16 7.51957 15.8946 7.70711 15.7071C7.89464 15.5196 8 15.2652 8 15V9C8 8.73478 7.89464 8.48043 7.70711 8.29289C7.51957 8.10536 7.26522 8 7 8C6.73478 8 6.48043 8.10536 6.29289 8.29289C6.10536 8.48043 6 8.73478 6 9V15C6 15.2652 6.10536 15.5196 6.29289 15.7071C6.48043 15.8946 6.73478 16 7 16ZM17 4H13V3C13 2.20435 12.6839 1.44129 12.1213 0.87868C11.5587 0.316071 10.7956 0 10 0H8C7.20435 0 6.44129 0.316071 5.87868 0.87868C5.31607 1.44129 5 2.20435 5 3V4H1C0.734784 4 0.48043 4.10536 0.292893 4.29289C0.105357 4.48043 0 4.73478 0 5C0 5.26522 0.105357 5.51957 0.292893 5.70711C0.48043 5.89464 0.734784 6 1 6H2V17C2 17.7956 2.31607 18.5587 2.87868 19.1213C3.44129 19.6839 4.20435 20 5 20H13C13.7956 20 14.5587 19.6839 15.1213 19.1213C15.6839 18.5587 16 17.7956 16 17V6H17C17.2652 6 17.5196 5.89464 17.7071 5.70711C17.8946 5.51957 18 5.26522 18 5C18 4.73478 17.8946 4.48043 17.7071 4.29289C17.5196 4.10536 17.2652 4 17 4ZM7 3C7 2.73478 7.10536 2.48043 7.29289 2.29289C7.48043 2.10536 7.73478 2 8 2H10C10.2652 2 10.5196 2.10536 10.7071 2.29289C10.8946 2.48043 11 2.73478 11 3V4H7V3ZM14 17C14 17.2652 13.8946 17.5196 13.7071 17.7071C13.5196 17.8946 13.2652 18 13 18H5C4.73478 18 4.48043 17.8946 4.29289 17.7071C4.10536 17.5196 4 17.2652 4 17V6H14V17ZM11 16C11.2652 16 11.5196 15.8946 11.7071 15.7071C11.8946 15.5196 12 15.2652 12 15V9C12 8.73478 11.8946 8.48043 11.7071 8.29289C11.5196 8.10536 11.2652 8 11 8C10.7348 8 10.4804 8.10536 10.2929 8.29289C10.1054 8.48043 10 8.73478 10 9V15C10 15.2652 10.1054 15.5196 10.2929 15.7071C10.4804 15.8946 10.7348 16 11 16Z"
                  fill="red"
                />
              </svg>
              <span className="text-red-600 font-semibold text-sm">Delete</span>
            </button>
          </div>

          {/* ── Main 2-column area ── */}
          <div className="flex gap-4 h-[calc(90vh-130px)]">
            {/* Left: Map */}
            <div className="flex-[2] h-full pl-1 pr-2 flex flex-col gap-2">
              {/* Search + Filter bar */}
              <div className="flex items-center gap-3 flex-shrink-0 bg-white rounded-2xl shadow-md border border-gray-100 px-4 py-2.5 relative z-30">
                {/* Search input with autocomplete */}
                <div className="relative flex-1" ref={setAutocompleteRef}>
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    width="15"
                    height="15"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#81069e"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.35-4.35" />
                  </svg>
                  <input
                    type="text"
                    value={stationSearch}
                    onChange={(e) => {
                      setStationSearch(e.target.value);
                      setShowAutocomplete(e.target.value.trim() !== "");
                      setHighlightedIndex(-1);
                    }}
                    onKeyDown={handleSearchKeyDown}
                    onFocus={() =>
                      stationSearch.trim() !== "" && setShowAutocomplete(true)
                    }
                    placeholder="Search stations..."
                    className="w-full pl-9 pr-3 py-1.5 text-sm bg-[#f7f7f7] rounded-xl border border-transparent focus:outline-none focus:border-[#81069e] focus:ring-1 focus:ring-[#d1a3db] transition-all placeholder-gray-400"
                    style={{ color: "#333" }}
                  />
                  {/* Autocomplete dropdown */}
                  {showAutocomplete && autocompleteSuggestions.length > 0 && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d1a3db] rounded-xl shadow-lg overflow-hidden z-[100001]">
                      {autocompleteSuggestions.map((station, idx) => (
                        <div
                          key={station.station_detail_id}
                          onClick={() => handleStationSelect(station)}
                          className="px-3 py-2 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                          style={{
                            background:
                              idx === highlightedIndex ? "#f3e5f5" : "white",
                            color:
                              idx === highlightedIndex ? "#81069e" : "#333",
                          }}
                          onMouseEnter={() => setHighlightedIndex(idx)}
                        >
                          <div className="text-sm font-semibold">
                            {station.name}
                          </div>
                          <div className="text-xs text-gray-500">
                            ID: {station.station_detail_id}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
                {/* Filter buttons — workspace-tab style */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {(
                    [
                      { key: "all", label: "All Stations", dot: undefined },
                      { key: "with-data", label: "Has Data", dot: "#22c55e" },
                      { key: "no-data", label: "No Data", dot: "#d1d5db" },
                    ] as const
                  ).map(({ key, label, dot }) => (
                    <button
                      key={key}
                      onClick={() => {
                        setStationFilter(key);
                        setStationSearch("");
                        setShowAutocomplete(false);
                        setHighlightedIndex(-1);
                      }}
                      className="flex items-center gap-1.5 text-xs font-semibold px-3.5 py-1.5 rounded-full border-2 transition-all"
                      style={{
                        borderColor: "#81069e",
                        background:
                          stationFilter === key ? "#81069e" : "#ffffff",
                        color: stationFilter === key ? "#ffffff" : "#81069e",
                        boxShadow:
                          stationFilter === key
                            ? "0 4px 10px rgba(129,6,158,0.22)"
                            : "none",
                      }}
                    >
                      {dot && (
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{
                            background:
                              stationFilter === key
                                ? "rgba(255,255,255,0.75)"
                                : (dot ?? ""),
                          }}
                        />
                      )}
                      {label}
                    </button>
                  ))}
                </div>
                {/* Divider */}
                <div className="w-px h-6 bg-gray-200 flex-shrink-0" />
                {/* Count */}
                <span className="flex-shrink-0 text-xs font-semibold text-[#81069e] bg-[#f3e5f5] border border-[#d1a3db] rounded-full px-3 py-1">
                  {filteredMapStations.length}/{stations.length}
                </span>
              </div>
              <div className="bg-white rounded-3xl shadow-md border border-gray-200 overflow-hidden flex-1 relative z-0">
                {stations.length > 0 ? (
                  <ConfigurationDetailMap
                    stations={filteredMapStations}
                    onStationClick={handleStationClick}
                    selectedStationIds={[selectedStationId, null]}
                  />
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No stations available
                  </div>
                )}
              </div>
            </div>

            {/* Right: Side Panel */}
            <div className="flex-1 h-full pr-1 overflow-y-auto flex flex-col gap-3 pb-4">
              {/* ── ⑤ Station Details with accent bar ── */}
              {selectedStation1 ? (
                <div className="bg-white rounded-2xl shadow-md border border-gray-200 flex-shrink-0">
                  <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100">
                    <span className="w-1 h-5 bg-[#81069e] rounded-full flex-shrink-0" />
                    <h3 className="text-sm font-bold text-gray-800">
                      Station Details
                    </h3>
                  </div>
                  <div className="px-4 py-3 space-y-1">
                    <p className="font-semibold text-gray-800">
                      {selectedStation1.name}
                    </p>
                    <p className="text-xs text-gray-500">
                      ID: {selectedStation1.station_detail_id}
                    </p>
                    <p className="text-xs text-gray-500">
                      Lat: {selectedStation1.lat?.toFixed(6)}, Lon:{" "}
                      {selectedStation1.lon?.toFixed(6)}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-white rounded-2xl p-4 shadow-sm border border-dashed border-gray-200 flex-shrink-0">
                  <p className="text-gray-400 text-center text-sm">
                    Click a station to view details
                  </p>
                </div>
              )}

              {/* Alighting & Interarrival Data */}
              <div className="bg-white rounded-2xl shadow-md border border-gray-200 flex-1 overflow-hidden flex flex-col">
                <div className="flex items-center gap-2 px-4 pt-3 pb-2 border-b border-gray-100 flex-shrink-0">
                  <span className="w-1 h-5 bg-[#81069e] rounded-full flex-shrink-0" />
                  <h3 className="text-sm font-bold text-gray-800">
                    Distribution Data
                  </h3>
                </div>
                <div className="overflow-y-auto flex-1 px-4 py-3">
                  {filteredAlighting1.length > 0 ||
                  filteredInterarrival1.length > 0 ? (
                    <div className="space-y-3">
                      {(() => {
                        const timePeriods = new Set<string>();
                        filteredAlighting1.forEach((d) =>
                          timePeriods.add(d.time_period),
                        );
                        filteredInterarrival1.forEach((d) =>
                          timePeriods.add(d.time_period),
                        );

                        return Array.from(timePeriods)
                          .sort()
                          .map((timePeriod) => {
                            const alighting = filteredAlighting1.find(
                              (d) => d.time_period === timePeriod,
                            );
                            const interarrival = filteredInterarrival1.find(
                              (d) => d.time_period === timePeriod,
                            );

                            return (
                              <div
                                key={timePeriod}
                                className="border-b border-gray-100 pb-3 last:border-b-0"
                              >
                                {/* ── ③ Time Period Chip ── */}
                                <span className="inline-block bg-[#e1bee7] text-[#81069e] text-xs font-semibold px-3 py-1 rounded-full mb-2">
                                  {timePeriod}
                                </span>
                                <div className="overflow-x-auto">
                                  <div className="rounded-xl overflow-hidden border border-[#d1a3db]">
                                    <table className="w-full text-xs border-separate border-spacing-0">
                                      <thead>
                                        <tr className="bg-[#f3e5f5]">
                                          <th className="text-left px-2 py-1.5 text-[#81069e] font-semibold rounded-tl-xl">
                                            Alighting Dist
                                          </th>
                                          <th className="text-left px-2 py-1.5 text-[#81069e] font-semibold">
                                            Args
                                          </th>
                                          <th className="text-left px-2 py-1.5 text-[#81069e] font-semibold">
                                            Interarrival Dist
                                          </th>
                                          <th className="text-left px-2 py-1.5 text-[#81069e] font-semibold rounded-tr-xl">
                                            Args
                                          </th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        <tr className="hover:bg-gray-50 transition-colors">
                                          <td className="px-2 py-1.5 text-gray-700 rounded-bl-xl">
                                            {alighting?.distribution || "N/A"}
                                          </td>
                                          <td className="px-2 py-1.5 font-mono text-gray-600">
                                            {alighting?.argument_list || "N/A"}
                                          </td>
                                          <td className="px-2 py-1.5 text-gray-700">
                                            {interarrival?.distribution ||
                                              "N/A"}
                                          </td>
                                          <td className="px-2 py-1.5 font-mono text-gray-600 rounded-br-xl">
                                            {interarrival?.argument_list ||
                                              "N/A"}
                                          </td>
                                        </tr>
                                      </tbody>
                                    </table>
                                  </div>
                                </div>
                              </div>
                            );
                          });
                      })()}
                    </div>
                  ) : (
                    <p className="text-gray-400 text-sm text-center py-4">
                      No data for selected station
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="mx-1 mt-4 mb-2">
            <div className="bg-white overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4">
                <span className="w-1 h-5 bg-[#81069e] rounded-full flex-shrink-0" />
                <h3 className="text-base font-bold text-gray-800">
                  Station Pairs
                </h3>
                {selectedStation1 && (
                  <span className="text-sm text-gray-500 ml-1">
                    — {selectedStation1.name}
                  </span>
                )}
                <div className="ml-auto flex items-center gap-2">
                  <div className="relative" ref={setPairAutocompleteRef}>
                    <svg
                      className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="#81069e"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <circle cx="11" cy="11" r="8" />
                      <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                      type="text"
                      value={stationPairSearch}
                      onChange={(e) => {
                        setStationPairSearch(e.target.value);
                        setShowPairAutocomplete(e.target.value.trim() !== "");
                        setPairHighlightedIndex(-1);
                      }}
                      onKeyDown={handlePairSearchKeyDown}
                      onFocus={() =>
                        stationPairSearch.trim() !== "" &&
                        setShowPairAutocomplete(true)
                      }
                      placeholder="Search station pairs..."
                      className="w-56 pl-8 pr-3 py-1.5 text-xs bg-[#f7f7f7] rounded-xl border border-transparent focus:outline-none focus:border-[#81069e] focus:ring-1 focus:ring-[#d1a3db] transition-all placeholder-gray-400"
                      style={{ color: "#333" }}
                    />
                    {showPairAutocomplete &&
                      pairAutocompleteSuggestions.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-[#d1a3db] rounded-xl shadow-lg overflow-hidden z-[100001]">
                          {pairAutocompleteSuggestions.map((station, idx) => (
                            <div
                              key={station.station_detail_id}
                              onClick={() => handlePairStationSelect(station)}
                              className="px-3 py-2 cursor-pointer transition-colors border-b border-gray-100 last:border-b-0"
                              style={{
                                background:
                                  idx === pairHighlightedIndex
                                    ? "#f3e5f5"
                                    : "white",
                                color:
                                  idx === pairHighlightedIndex
                                    ? "#81069e"
                                    : "#333",
                              }}
                              onMouseEnter={() => setPairHighlightedIndex(idx)}
                            >
                              <div className="text-sm font-semibold">
                                {station.name}
                              </div>
                              <div className="text-xs text-gray-500">
                                ID: {station.station_detail_id}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setStationPairSort("all")}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 transition-all h-[32px]"
                      style={{
                        borderColor: "#81069e",
                        background:
                          stationPairSort === "all" ? "#81069e" : "#ffffff",
                        color:
                          stationPairSort === "all" ? "#ffffff" : "#81069e",
                        boxShadow:
                          stationPairSort === "all"
                            ? "0 4px 10px rgba(129,6,158,0.22)"
                            : "none",
                      }}
                    >
                      All
                    </button>
                    <button
                      onClick={() => setStationPairSort("from")}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 transition-all h-[32px]"
                      style={{
                        borderColor: "#81069e",
                        background:
                          stationPairSort === "from" ? "#81069e" : "#ffffff",
                        color:
                          stationPairSort === "from" ? "#ffffff" : "#81069e",
                        boxShadow:
                          stationPairSort === "from"
                            ? "0 4px 10px rgba(129,6,158,0.22)"
                            : "none",
                      }}
                    >
                      From
                    </button>
                    <button
                      onClick={() => setStationPairSort("to")}
                      className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full border-2 transition-all h-[32px]"
                      style={{
                        borderColor: "#81069e",
                        background:
                          stationPairSort === "to" ? "#81069e" : "#ffffff",
                        color: stationPairSort === "to" ? "#ffffff" : "#81069e",
                        boxShadow:
                          stationPairSort === "to"
                            ? "0 4px 10px rgba(129,6,158,0.22)"
                            : "none",
                      }}
                    >
                      To
                    </button>
                  </div>
                  {stationPairs.length > 0 && (
                    <span className="text-gray-500 text-xs px-2 py-0.5 rounded-full">
                      {filteredStationPairs.length} station pairs
                    </span>
                  )}
                </div>
              </div>
              {stationPairs.length > 0 ? (
                filteredStationPairs.length > 0 ? (
                  <div className="overflow-x-auto mx-6">
                    <div className="rounded-xl overflow-hidden border">
                      <table className="w-full text-sm border-separate border-spacing-0">
                        <thead>
                          <tr className="bg-[#f3e5f5]">
                            <th className="text-left px-6 py-3 text-[#81069e] rounded-tl-xl">
                              From Station
                            </th>
                            <th className="text-left px-6 py-3 text-[#81069e]">
                              To Station
                            </th>
                            <th className="text-left px-6 py-3 text-[#81069e]">
                              Distance (m)
                            </th>
                            <th className="text-left px-6 py-3 text-[#81069e] rounded-tr-xl">
                              Travel Time (s)
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredStationPairs.map((pair, idx) => {
                            const isLast =
                              idx === filteredStationPairs.length - 1;
                            return (
                              <tr
                                key={idx}
                                className="border-t border-gray-100 hover:bg-[#f3e5f5]/60 transition-colors"
                              >
                                <td
                                  className={`px-6 py-3 text-gray-700${isLast ? " rounded-bl-xl" : ""}`}
                                >
                                  {getStationName(pair.FstStation)}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {getStationName(pair.SndStation)}
                                </td>
                                <td className="px-6 py-3 text-gray-700">
                                  {pair.RouteBetween?.Distance?.toFixed(2) ||
                                    "N/A"}
                                </td>
                                <td
                                  className={`px-6 py-3 text-gray-700${isLast ? " rounded-br-xl" : ""}`}
                                >
                                  {pair.RouteBetween?.TravelTime?.toFixed(2) ||
                                    "N/A"}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400 text-center py-6 text-sm">
                    No station pairs match your search
                  </p>
                )
              ) : (
                <p className="text-gray-400 text-center py-6 text-sm">
                  {selectedStation1
                    ? "No station pairs found"
                    : "Select a station to view pairs"}
                </p>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[100000]">
          <div className="bg-white rounded-[40px] p-8 max-w-md w-full mx-4 border-2">
            <div className="flex items-center mb-4">
              <span className="w-2 h-8 bg-red-600 mr-3" />
              <h2 className="text-2xl text-gray-800">Delete Configuration</h2>
            </div>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete "{configurationName}"? This action
              cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={cancelDelete}
                disabled={isDeleting}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 text-white py-2 px-6 rounded-lg transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? "Deleting..." : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
