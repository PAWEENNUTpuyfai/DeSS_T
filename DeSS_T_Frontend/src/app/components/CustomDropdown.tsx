import { useState, useRef, useEffect } from "react";
import "./../../style/Dropdown.css";

interface OptionGroup {
  label: string;
  options: string[];
}

interface CustomDropdownProps {
  options?: string[];
  groups?: OptionGroup[];
  selectedValue: string;
  onChange: (value: string) => void;
  isGrouped?: boolean;
  icon?: string;
}

export default function CustomDropdown({
  options = [],
  groups = [],
  selectedValue,
  onChange,
  isGrouped = false,
  icon = "",
}: CustomDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleSelect = (value: string) => {
    onChange(value);
    setIsOpen(false);
  };

  const allOptions = isGrouped ? groups.flatMap(g => g.options) : options;

  return (
    <div
      ref={dropdownRef}
      className="relative inline-block min-w-[200px] z-[7000]"
    >
      {/* Main Button */}
      <span
        onClick={() => setIsOpen(!isOpen)}
        className="main-btn text-dropdown h-[60px] flex items-center justify-between px-4"
      >
        <span className="py-2 px-4">
          {icon && <span className="mr-2">{icon}</span>}
          {selectedValue}
        </span>
        <div className="h-full w-[2.5px] bg-[#76218a] mx-2"></div>
        <svg
          className={`w-7 h-7 transition-transform duration-200 ${
            isOpen ? "transform rotate-180" : ""
          }`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </span>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute top-full mt-2 w-full option-container z-[9999] overflow-hidden">
          {isGrouped ? (
            <div className="py-2">
              {groups.map((group, groupIndex) => (
                <div key={groupIndex}>
                  {groupIndex > 0 && <div className="dropdown-divider"></div>}
                  {group.options.map((option) => (
                    <span
                      key={option}
                      onClick={() => handleSelect(option)}
                      className={`w-full text-left px-6 py-2 text-[#C296CD] text-lg font-medium hover:bg-gray-50 transition-colors flex items-center block`}
                    >
                      {selectedValue === option && (
                        <span className="mr-3 text-[#81069e]">•</span>
                      )}
                      <span className={selectedValue === option ? "" : "ml-5"}>
                        {option}
                      </span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <ul className="py-2">
              {options.map((option) => (
                <li key={option}>
                  <span
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-6 py-1 text-[#C296CD] text-lg font-medium hover:bg-gray-50 transition-colors flex items-center `}
                  >
                    {selectedValue === option && (
                      <span className="mr-3 text-[#81069e]">•</span>
                    )}
                    <span className={selectedValue === option ? "" : "ml-5"}>
                      {option}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
