import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "../contexts/useAuth";
import {
  getScenarioDetails,
  type ScenarioDetailsResponse,
} from "../../utility/api/scenario";
import { getUserScenarios } from "../../utility/api/scenario";
import { getConfigurationDetail } from "../../utility/api/configuration";
import type { ConfigurationDetail } from "../models/Configuration";
import "../../style/Workspace.css";
import Scenario from "../components/Scenario";

export default function EditScenarioPage() {
  const { scenarioId } = useParams<{ scenarioId: string }>();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [scenarioDetails, setScenarioDetails] =
    useState<ScenarioDetailsResponse | null>(null);
  const [configuration, setConfiguration] =
    useState<ConfigurationDetail | null>(null);
  const [scenarioName, setScenarioName] = useState<string>("");
  const [userScenarioId, setUserScenarioId] = useState<string>("");

  useEffect(() => {
    if (!user) {
      window.location.href = "/";
      return;
    }

    if (!scenarioId) {
      setError("No scenario ID provided");
      setLoading(false);
      return;
    }

    let isMounted = true;
    setLoading(true);
    setError(null);

    getScenarioDetails(scenarioId)
      .then(async (details) => {
        if (!isMounted) return;
        setScenarioDetails(details);
        const config = await getConfigurationDetail(
          details.configuration_detail_id,
        );
        if (!isMounted) return;
        setConfiguration(config);
      })
      .catch((err: unknown) => {
        if (!isMounted) return;
        const msg = err instanceof Error ? err.message : String(err);
        setError(`Failed to load scenario: ${msg}`);
      })
      .finally(() => {
        if (!isMounted) return;
        setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [user, scenarioId]);

  useEffect(() => {
    if (!user || !scenarioId) {
      return;
    }

    const userId = user.google_id || user.email;
    if (!userId) {
      return;
    }

    const fetchScenarioName = async () => {
      try {
        const scenarios = await getUserScenarios(userId);
        const matchedScenario = scenarios?.find(
          (scenario) => scenario.scenario_detail_id === scenarioId,
        );
        const fallbackScenario = scenarios?.find(
          (scenario) => scenario.user_scenario_id === scenarioId,
        );
        const target = matchedScenario || fallbackScenario;

        if (target) {
          setScenarioName(target.name);
          setUserScenarioId(target.user_scenario_id);
          console.log(target.user_scenario_id);
        } else {
          setError("You do not have permission to access this scenario");
        }
      } catch (err) {
        console.error("Failed to fetch scenario name:", err);
        setError("Failed to verify scenario access");
      }
    };

    fetchScenarioName();
  }, [user, scenarioId]);

  if (loading) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <p>Loading scenario...</p>
        </div>
      </div>
    );
  }

  if (error || !scenarioDetails || !configuration) {
    return (
      <div className="flex h-screen justify-center items-center bg-white">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4 text-red-600">Error</h1>
          <p>{error || "Failed to load scenario"}</p>
          <button
            type="button"
            onClick={() =>
              (window.location.href = "/user/workspace?tab=project")
            }
            className="mt-4 bg-[#81069e] text-white font-semibold px-6 py-2 rounded-lg"
          >
            Back to Workspace
          </button>
        </div>
      </div>
    );
  }

  return (
    <Scenario
      scenario={scenarioDetails.scenario_detail}
      configuration={configuration}
      projectName={scenarioName || "User's scenario"}
      configurationName={
        scenarioDetails.configuration_name || "User's Configuration"
      }
      usermode="user"
      idforUpdate={userScenarioId}
    />
  );
}
