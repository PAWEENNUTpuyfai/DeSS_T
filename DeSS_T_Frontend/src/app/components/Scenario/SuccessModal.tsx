
interface SuccessModalProps {
  isOpen: boolean;
  redirectId: string | null;
  onClose: () => void;
  onViewScenario: () => void;
}

export default function SuccessModal({
  isOpen,
  onViewScenario,
}: SuccessModalProps) {
  if (!isOpen) return null;

  return (
    <div className="confirm-modal-overlay">
      <div className="confirm-modal">
        <h2 className="text-green-600 text-xl flex items-center justify-center">
          ✓ Scenario saved successfully!
        </h2>
        <p className="confirm-modal-subtitle">
          Your scenario has been saved and is ready for analysis.
        </p>
        <div className="confirm-modal-actions">
          <button
            className="bg-green-500 text-white px-4 py-2 rounded-full hover:bg-green-600 mb-4 mt-2"
            onClick={onViewScenario}
          >
            View Scenario
          </button>
        </div>
      </div>
    </div>
  );
}
