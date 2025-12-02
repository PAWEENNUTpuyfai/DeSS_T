import { Routes, Route, Link } from "react-router-dom";
import PowerPage from "./components/PowerPage";
import About from "./pages/About";
import GuestConfiguration from "./pages/GuestConfiguration";
import Configuration from "./pages/Configuration";
import "../style/App.css";

export default function App() {
  return (
    <div className="main-container">
      <nav>
        <Link to="/">Home</Link>
        <Link to="/about">About</Link>
        <Link to="/guest/config">Config</Link>
      </nav>

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
        <Route path="/about" element={<About />} />
        <Route path="/guest/config" element={<GuestConfiguration />} />
      </Routes>
    </div>
  );
}
