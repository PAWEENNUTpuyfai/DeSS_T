import { useEffect, useState, type ReactNode } from "react";

interface MobileWarningProps {
  children: ReactNode;
}

export default function MobileWarning({ children }: MobileWarningProps) {
  const [isMobile, setIsMobile] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      const isMobileDevice = window.innerWidth < 1024; // lg breakpoint in Tailwind
      setIsMobile(isMobileDevice);
    };

    checkMobile();
    setIsLoaded(true);
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!isLoaded) return null;
  if (isMobile) return warningContent;

  return <>{children}</>;
}

const warningContent = (
  <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-[999999]">
    <div className="bg-white rounded-[40px] p-8 max-w-md w-full mx-4 text-center">
      <div className="mb-6">
        <svg
          width="64"
          height="64"
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="mx-auto mb-4"
        >
          <path
            d="M17 2H7C5.9 2 5 2.9 5 4V20C5 21.1 5.9 22 7 22H17C18.1 22 19 21.1 19 20V4C19 2.9 18.1 2 17 2ZM17 20H7V4H17V20Z"
            fill="#81069e"
          />
        </svg>
        <h2 className="text-2xl text-gray-800 font-semibold">Desktop Required</h2>
      </div>
      <p className="text-gray-600 mb-6">
        This application is optimized for desktop and tablet devices. Please access it using a computer for the best experience.
      </p>
      <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-4 p-4 bg-gray-100 rounded-[20px]">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path
            d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 20C7.59 20 4 16.41 4 12C4 7.59 7.59 4 12 4C16.41 4 20 7.59 20 12C20 16.41 16.41 20 12 20ZM12.5 7H11V13L16.2 16.2L17 15.1L12.5 12.3V7Z"
            fill="#81069e"
          />
        </svg>
        Minimum width: 1024px recommended
      </div>
    </div>
  </div>
);
