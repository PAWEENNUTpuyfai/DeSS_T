import React from "react";
import type { Configuration } from "../models/Configuration";

export default function GuestScenario({
  configuration,
  onBack,
}: {
  configuration: Configuration;
  onBack?: () => void;
}) {
  return (
    <main className="p-6">
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

      <section className="border rounded p-4 bg-white">
        <h3 className="font-bold mb-2">Configuration Preview</h3>
        <pre className="text-xs overflow-auto bg-gray-50 p-3 rounded">
          {JSON.stringify(configuration, null, 2)}
        </pre>
      </section>
    </main>
  );
}
