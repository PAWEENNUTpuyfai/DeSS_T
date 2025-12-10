interface LoadingModalProps {
  isOpen: boolean;
  message?: string;
}

export default function LoadingModal({
  isOpen,
  message = "Loading data...",
}: LoadingModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-35 flex items-center justify-center z-50">
      <div className="bg-white rounded-[25px] p-12 shadow-lg flex flex-col items-center gap-4">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#81069e] border-t-transparent"></div>
        <p className="text-[#323232] font-medium">{message}</p>
      </div>
    </div>
  );
}
