import "../../style/Output.css";
import type { SimulationResponse } from "../models/SimulationModel";

export default function InteractiveMap({
  simulationResponse,
}: {
  simulationResponse: SimulationResponse;
}) {
  return (
    <div className="interactive-map-container">
      <h2 className="interactive-map-title">แผนที่โต้ตอบ</h2>
      <div className="interactive-map-content">
        {/* Interactive map content goes here */}
      </div>
    </div>
  );
}
