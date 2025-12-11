import "../../style/GuestDecision.css";
import { useNavigate } from "react-router-dom";

export default function GuestDecision() {
  const navigate = useNavigate();

  const handleSecondaryClick = () => {
    navigate("/guest/setup");
  };

  return (
    <div className="flex h-screen justify-center items-center bg-white">
      <div className="decision_container">
        <div className="decision_logobar">
          <img src="/DeSS-T_logo.png" alt="DeSS-T Logo" className="logo" />
        </div>
        <div className="decision_content mb-14">
          <span className="header flex mb-6">
            You are currently in{" "}
            <p className="font-bold text-[#81069E] ml-2">Guest Mode.</p>
          </span>
          <span className="question flex">
            Do you want to download a{" "}
            <p className="text-[#81069E] mx-2">Configuration Data</p>
          </span>
          <span className="question flex">
            or <p className="text-[#81069E] mx-2">Project</p> from Community
            workspace?
          </span>
          <div className="btn_primary w-[50%] mt-6 flex justify-center items-center">
            <p>Yes, I want to go to community page.</p>
          </div>
          <div
            className="btn_secondary w-[50%] mt-4 flex justify-center items-center"
            onClick={handleSecondaryClick}
          >
            <p>No, I want to set up my own.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
