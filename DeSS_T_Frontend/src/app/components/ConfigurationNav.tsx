import "../../style/configuration.css";

interface ConfigurationNavProps {
  mode: "guest" | "user";
  configurationName?: string;
}

export default function ConfigurationNav({
  mode,
  configurationName,
}: ConfigurationNavProps) {
  return (
    <nav className="configuration-nav">
      <div className="nav-content">
        <h1 className="nav-title">
          {mode === "guest"
            ? "Set up Configuration Data"
            : configurationName || "Configuration"}
        </h1>
      </div>
    </nav>
  );
}
