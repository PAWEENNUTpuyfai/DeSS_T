import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import NavBar from "../components/NavBar";
import { getConfigurationDetail } from "../../utility/api/configuration";
import type { ConfigurationDetail } from "../models/Configuration";
import "../../style/Workspace.css";

export default function ConfigurationDetailPage() {
  const { configurationId } = useParams<{ configurationId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [configuration, setConfiguration] =
    useState<ConfigurationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to load configuration: ${msg}`);
      } finally {
        setLoading(false);
      }
    };

    fetchConfiguration();
  }, [configurationId, user, navigate]);

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

          <div className="px-6 max-w-6xl mx-auto">
            {/* Configuration Basic Info */}
            <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
              <h3 className="text-xl font-bold mb-4 text-purple-600">
                Configuration Info
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-600 font-semibold">
                    Configuration ID
                  </p>
                  <p className="text-gray-900 break-all">
                    {configuration.configuration_detail_id}
                  </p>
                </div>
                <div>
                  <p className="text-gray-600 font-semibold">
                    Network Model ID
                  </p>
                  <p className="text-gray-900 break-all">
                    {configuration.network_model_id || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Network Model */}
            {configuration.network_model && (
              <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
                <h3 className="text-xl font-bold mb-4 text-purple-600">
                  Network Model
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div>
                    <p className="text-gray-600 font-semibold">
                      Network Model ID
                    </p>
                    <p className="text-gray-900 break-all">
                      {configuration.network_model.network_model_id || "N/A"}
                    </p>
                  </div>
                </div>

                {/* Stations */}
                {configuration.network_model.Station_detail &&
                  configuration.network_model.Station_detail.length > 0 && (
                    <div className="mb-6">
                      <h4 className="text-lg font-semibold mb-3">Stations</h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="text-left px-4 py-2">
                                Station Name
                              </th>
                              <th className="text-left px-4 py-2">
                                Station ID
                              </th>
                              <th className="text-left px-4 py-2">Latitude</th>
                              <th className="text-left px-4 py-2">Longitude</th>
                            </tr>
                          </thead>
                          <tbody>
                            {configuration.network_model.Station_detail.map(
                              (station, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="px-4 py-2">
                                    {station.name || "N/A"}
                                  </td>
                                  <td className="px-4 py-2 break-all">
                                    {station.station_detail_id || "N/A"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {station.lat?.toFixed(6) || "N/A"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {station.lon?.toFixed(6) || "N/A"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                {/* Station Pairs */}
                {configuration.network_model.StationPair &&
                  configuration.network_model.StationPair.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold mb-3">
                        Station Pairs
                      </h4>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead className="bg-gray-100 border-b">
                            <tr>
                              <th className="text-left px-4 py-2">
                                From Station
                              </th>
                              <th className="text-left px-4 py-2">
                                To Station
                              </th>
                              <th className="text-left px-4 py-2">Distance</th>
                              <th className="text-left px-4 py-2">
                                Travel Time
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {configuration.network_model.StationPair.map(
                              (pair, idx) => (
                                <tr
                                  key={idx}
                                  className="border-b hover:bg-gray-50"
                                >
                                  <td className="px-4 py-2">
                                    {pair.FstStation || "N/A"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {pair.SndStation || "N/A"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {pair.RouteBetween?.Distance
                                      ? `${pair.RouteBetween.Distance.toFixed(
                                          2,
                                        )} m`
                                      : "N/A"}
                                  </td>
                                  <td className="px-4 py-2">
                                    {pair.RouteBetween?.TravelTime
                                      ? `${pair.RouteBetween.TravelTime.toFixed(
                                          2,
                                        )} s`
                                      : "N/A"}
                                  </td>
                                </tr>
                              ),
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
              </div>
            )}

            {/* Alighting Data */}
            {configuration.alighting_datas &&
              configuration.alighting_datas.length > 0 && (
                <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold mb-4 text-purple-600">
                    Alighting Data
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="text-left px-4 py-2">Station</th>
                          <th className="text-left px-4 py-2">Time Period</th>
                          <th className="text-left px-4 py-2">Distribution</th>
                          <th className="text-left px-4 py-2">Arguments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configuration.alighting_datas.map((data, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">
                              {data.station_detail?.name ||
                                data.station_id ||
                                "N/A"}
                            </td>
                            <td className="px-4 py-2">{data.time_period}</td>
                            <td className="px-4 py-2">
                              {data.distribution || "N/A"}
                            </td>
                            <td className="px-4 py-2 text-xs font-mono break-all">
                              {data.argument_list || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Interarrival Data */}
            {configuration.interarrival_datas &&
              configuration.interarrival_datas.length > 0 && (
                <div className="bg-white rounded-lg p-6 mb-6 shadow-sm border border-gray-200">
                  <h3 className="text-xl font-bold mb-4 text-purple-600">
                    Interarrival Data
                  </h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-100 border-b">
                        <tr>
                          <th className="text-left px-4 py-2">Station</th>
                          <th className="text-left px-4 py-2">Time Period</th>
                          <th className="text-left px-4 py-2">Distribution</th>
                          <th className="text-left px-4 py-2">Arguments</th>
                        </tr>
                      </thead>
                      <tbody>
                        {configuration.interarrival_datas.map((data, idx) => (
                          <tr key={idx} className="border-b hover:bg-gray-50">
                            <td className="px-4 py-2">
                              {data.station_detail?.name ||
                                data.station_id ||
                                "N/A"}
                            </td>
                            <td className="px-4 py-2">{data.time_period}</td>
                            <td className="px-4 py-2">
                              {data.distribution || "N/A"}
                            </td>
                            <td className="px-4 py-2 text-xs font-mono break-all">
                              {data.argument_list || "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            {/* Empty State */}
            {(!configuration.alighting_datas ||
              configuration.alighting_datas.length === 0) &&
              (!configuration.interarrival_datas ||
                configuration.interarrival_datas.length === 0) && (
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <p className="text-gray-600 text-center">
                    No alighting or interarrival data available
                  </p>
                </div>
              )}
          </div>
        </main>
      </div>
    </div>
  );
}
