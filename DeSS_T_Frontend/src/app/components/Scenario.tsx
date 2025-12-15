import React, { useState } from "react";
import type { Configuration } from "../models/Configuration";
import type { StationDetail, StationPair } from "../models/Network";
import "../../style/Scenario.css";

export default function Scenario({
  configuration,
  onBack,
  mode = "guest",
  projectName,
}: {
  configuration: Configuration;
  onBack?: () => void;
  mode?: "guest" | "user";
  projectName?: string;
}) {
  const nodes: StationDetail[] =
    configuration?.Network_model?.Station_detail ?? [];
  const edges: StationPair[] = configuration?.Network_model?.StationPair ?? [];

  return (
    <main className="">
      <div className="flex flex-col">
        <div className="flex">
          <div className="">Route</div>
          <div className="">BUS</div>

        </div>
        <div className="side-bar h-[90vb] w-[25%]"></div>
      </div>

      <div className="mt-5">
        <button
          onClick={() => onBack && onBack()}
          className="px-3 py-2 bg-gray-200 rounded hover:bg-gray-300"
        >
          Back
        </button>
      </div>
    </main>
  );
}
