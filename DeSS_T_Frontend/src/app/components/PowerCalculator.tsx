// src/app/components/PowerCalculator.tsx
import { useState } from "react";
import { calculatePower } from "../../utility/api/powerApi";

export default function PowerCalculator() {
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleCalculate = async () => {
    setLoading(true);
    setMessage("");
    try {
      const data = await calculatePower({ number: count });
      setResult(data.result);
      setMessage(`✅ Calculated result: ${data.result}`);
    } catch (err) {
      console.error("Error:", err);
      setMessage("⚠️ Could not connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <button onClick={() => setCount((c) => c + 1)}>Count is {count}</button>
      <button onClick={handleCalculate} disabled={loading}>
        {loading ? "Calculating..." : "Calculate"}
      </button>

      {result && message && (
        <p
          style={{
            marginTop: "1em",
            fontSize: "1.1em",
            color: message.includes("✅") ? "green" : "red",
          }}
        >
          {message}
        </p>
      )}
    </div>
  );
}
