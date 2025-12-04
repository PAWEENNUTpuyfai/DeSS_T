import React, { useState } from "react";
import type { Configuration } from "../models/Configuration";
import type { StationDetail, StationPair } from "../models/Network";

export default function GuestScenario({
  configuration,
  onBack,
}: {
  configuration: Configuration;
  onBack?: () => void;
}) {
  const nodes: StationDetail[] = configuration?.Network_model?.Station_detail ?? [];
  const edges: StationPair[] = configuration?.Network_model?.StationPair ?? [];

  const itemsPerPage = 50;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.ceil(edges.length / itemsPerPage);
  const startIdx = (currentPage - 1) * itemsPerPage;
  const endIdx = startIdx + itemsPerPage;
  const paginatedEdges = edges.slice(startIdx, endIdx);

  return (
    <main className="p-6 space-y-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold">Guest Scenario</h2>
        <div>
          <button
            onClick={() => onBack && onBack()}
            className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
          >
            Back
          </button>
        </div>
      </div>

      {/* Nodes Section */}
      <section className="border rounded p-4 bg-white">
        <div className="flex items-center gap-2 mb-2">
          <h3 className="font-bold text-lg">Nodes (Stations)</h3>
          <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-1 rounded">
            {nodes.length} stations
          </span>
        </div>
        {nodes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse border border-gray-300">
              <thead className="bg-gray-100">
                <tr>
                  <th className="border border-gray-300 p-2 text-left">StationID</th>
                  <th className="border border-gray-300 p-2 text-left">StationName</th>
                  <th className="border border-gray-300 p-2 text-left">Latitude</th>
                  <th className="border border-gray-300 p-2 text-left">Longitude</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="border border-gray-300 p-2 font-mono">{node.StationID}</td>
                    <td className="border border-gray-300 p-2">{node.StationName}</td>
                    <td className="border border-gray-300 p-2">{node.Lat}</td>
                    <td className="border border-gray-300 p-2">{node.Lon}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-gray-600">No stations in Network_model.Station_detail</p>
        )}
      </section>

      {/* Edges Section */}
      <section className="border rounded p-4 bg-white">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="font-bold text-lg">Edges (Routes)</h3>
          <span className="bg-green-100 text-green-800 text-xs font-semibold px-2 py-1 rounded">
            {edges.length} routes
          </span>
        </div>
        {edges.length > 0 ? (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse border border-gray-300">
                <thead className="bg-gray-100">
                  <tr>
                    <th className="border border-gray-300 p-2 text-left">From Station</th>
                    <th className="border border-gray-300 p-2 text-left">To Station</th>
                    <th className="border border-gray-300 p-2 text-right">Distance (m)</th>
                    <th className="border border-gray-300 p-2 text-right">Travel Time (s)</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedEdges.map((edge, idx) => (
                    <tr key={idx} className="hover:bg-gray-50">
                      <td className="border border-gray-300 p-2 font-mono">{edge.FstStation}</td>
                      <td className="border border-gray-300 p-2 font-mono">{edge.SndStation}</td>
                      <td className="border border-gray-300 p-2 text-right">
                        {edge.RouteBetween.Distance.toFixed(0)}
                      </td>
                      <td className="border border-gray-300 p-2 text-right">
                        {edge.RouteBetween.TravelTime.toFixed(0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 gap-2 flex-wrap">
                <button
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  ← Previous
                </button>

                <div className="flex items-center gap-1 flex-wrap justify-center">
                  {/* Helper function to generate visible page numbers with smart windowing */}
                  {(() => {
                    const windowSize = 7; // Show max 7 buttons around current page
                    let startPage = Math.max(1, currentPage - Math.floor(windowSize / 2));
                    let endPage = Math.min(totalPages, startPage + windowSize - 1);

                    // Adjust if we're near the end
                    if (endPage - startPage < windowSize - 1) {
                      startPage = Math.max(1, endPage - windowSize + 1);
                    }

                    const pages: (number | string)[] = [];

                    // Add first page + ellipsis if needed
                    if (startPage > 1) {
                      pages.push(1);
                      if (startPage > 2) {
                        pages.push("...");
                      }
                    }

                    // Add page range
                    for (let p = startPage; p <= endPage; p++) {
                      pages.push(p);
                    }

                    // Add ellipsis + last page if needed
                    if (endPage < totalPages) {
                      if (endPage < totalPages - 1) {
                        pages.push("...");
                      }
                      pages.push(totalPages);
                    }

                    return pages.map((page, idx) =>
                      typeof page === "number" ? (
                        <button
                          key={idx}
                          onClick={() => setCurrentPage(page)}
                          className={`px-3 py-1 rounded text-sm font-medium ${
                            currentPage === page
                              ? "bg-blue-600 text-white"
                              : "bg-gray-200 hover:bg-gray-300"
                          }`}
                        >
                          {page}
                        </button>
                      ) : (
                        <span key={idx} className="px-2 text-gray-500">
                          {page}
                        </span>
                      )
                    );
                  })()}
                </div>

                <button
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 bg-gray-200 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300"
                >
                  Next →
                </button>

                <div className="w-full text-xs text-gray-600 text-center">
                  Page {currentPage} of {totalPages} ({startIdx + 1}-{Math.min(endIdx, edges.length)} of{" "}
                  {edges.length})
                </div>
              </div>
            )}
          </>
        ) : (
          <p className="text-sm text-gray-600">No edges present in Network_model.StationPair</p>
        )}
      </section>

      {/* Full JSON (collapsible) */}
      <details className="border rounded p-4 bg-white">
        <summary className="cursor-pointer font-bold text-lg mb-2">
          Full Configuration (JSON)
        </summary>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded max-h-96">
          {JSON.stringify(configuration, null, 2)}
        </pre>
      </details>
    </main>
  );
}
