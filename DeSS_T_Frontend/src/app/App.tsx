import { Routes, Route, Link } from "react-router-dom";
import PowerPage from "./components/PowerPage";
import "../style/App.css";
import GuestSetup from "./pages/GuestSetup";

export default function App() {
  return (
    <div className="main-container">
      <Routes>
        <Route
          path="/"
          element={
            <>
              <h1>ข้างนอก</h1>
              <PowerPage />
            </>
          }
        />
        <Route path="/guest/setup" element={<GuestSetup />} />
      </Routes>
    </div>
  );
}
