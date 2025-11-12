// // import { useState } from 'react'
// // import reactLogo from './assets/react.svg'
// // import viteLogo from '/vite.svg'
// // import './App.css'

// // function App() {
// //   const [count, setCount] = useState(0)

// //   return (
// //     <>
// //       <div>
// //         <a href="https://vite.dev" target="_blank">
// //           <img src={viteLogo} className="logo" alt="Vite logo" />
// //         </a>
// //         <a href="https://react.dev" target="_blank">
// //           <img src={reactLogo} className="logo react" alt="React logo" />
// //         </a>
// //       </div>
// //       <h1>Vite + React</h1>
// //       <div className="card">
// //         <button onClick={() => setCount((count) => count + 1)}>
// //           count is {count}
// //         </button>
// //         <p>
// //           Edit <code>src/App.tsx</code> and save to test HMR
// //         </p>
// //       </div>
// //       <p className="read-the-docs">
// //         Click on the Vite and React logos to learn more
// //       </p>
// //     </>
// //   )
// // }

// // export default App


import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";

function App() {
  const [count, setCount] = useState(0);
  const [result, setResult] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>("");

  const handleCalculate = async () => {
    setLoading(true);
    setMessage(""); // clear message before calculation
    try {
      const res = await fetch("http://localhost:8080/api/power", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ number: count }),
      });

      const data = await res.json();
      if (data.result !== undefined) {
        setResult(data.result);
        setMessage(`✅ Calculated result: ${data.result}`);
      } else {
        setMessage("❌ Error: No result received from backend");
      }
    } catch (err) {
      console.error("Error:", err);
      setMessage("⚠️ Could not connect to backend");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div>
        <a href="https://vite.dev" target="_blank">
          <img src={viteLogo} className="logo" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank">
          <img src={reactLogo} className="logo react" alt="React logo" />
        </a>
      </div>

      <h1>Vite + React + Go + Python</h1>

      <div className="card">
        <button onClick={() => setCount((c) => c + 1)}>
          count is {count}
        </button>

        <button onClick={handleCalculate} disabled={loading}>
          {loading ? "Calculating..." : "Calculate"}
        </button>

        {/* ✅ แสดงผลลัพธ์ด้านล่าง */}
        {message && (
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

      <p className="read-the-docs">
        Click on the Vite and React logos to learn more
      </p>
    </>
  );
}

export default App;

