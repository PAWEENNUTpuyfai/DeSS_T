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
  selectedGroupValues?: string[]; // Array of selected values for grouped dropdown
  icon?: string;
  width?: string; // e.g. "200px", "100%", "w-64"
  height?: string; // e.g. "60px", "40px"
  fontSize?: string; // e.g. "text-sm", "text-lg", "16px"
}

export default function CustomDropdown({
  options = [],
  groups = [],
  selectedValue,
  onChange,
  isGrouped = false,
  selectedGroupValues = [],
  icon = "",
  width = "min-w-[200px]",
  height = "h-[60px]",
  fontSize = "text-lg",
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

  // Determine if width/height are Tailwind classes or CSS values
  const widthClass = width.startsWith("w-") || width.includes("min-w") ? width : "";
  const widthStyle = !widthClass ? width : undefined;
  const heightClass = height.startsWith("h-") ? height : "";
  const heightStyle = !heightClass ? height : undefined;
  const fontSizeClass = fontSize.startsWith("text-") ? fontSize : "";
  const fontSizeStyle = !fontSizeClass ? fontSize : undefined;

  return (
    <div
      ref={dropdownRef}
      className={`relative inline-block z-[7000] ${widthClass}`}
      style={{ width: widthStyle }}
    >
      {/* Main Button */}
      <span
        onClick={() => setIsOpen(!isOpen)}
        className={`main-btn text-dropdown ${heightClass} ${fontSizeClass} flex items-center px-4 cursor-pointer`}
        style={{ height: heightStyle, fontSize: fontSizeStyle }}
      > 
        <span className="flex items-center py-2 px-4 flex-1 overflow-hidden">
          {icon && <span className="mr-2 flex-shrink-0">{icon}</span>}
          <span className="truncate">{selectedValue}</span>
        </span>
        <div className="h-full w-[2.5px] bg-[#76218a] mx-2 flex-shrink-0"></div>
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
                  {group.options.map((option) => {
                    const isSelected = selectedGroupValues.includes(option);
                    return (
                      <span
                        key={option}
                        onClick={() => handleSelect(option)}
                        className={`w-full text-left px-6 py-2 text-[#C296CD] ${fontSizeClass} font-medium hover:bg-gray-50 transition-colors flex items-center`}
                        style={{ fontSize: fontSizeStyle }}
                      >
                        {isSelected && (
                          <span className="mr-3 text-[#81069e]">•</span>
                        )}
                        <span className={isSelected ? "" : "ml-5"}>
                          {option}
                        </span>
                      </span>
                    );
                  })}
                </div>
              ))}
            </div>
          ) : (
            <ul className="py-2">
              {options.map((option) => (
                <li key={option}>
                  <span
                    onClick={() => handleSelect(option)}
                    className={`w-full text-left px-6 py-1 text-[#C296CD] ${fontSizeClass} font-medium hover:bg-gray-50 transition-colors flex items-center `}
                    style={{ fontSize: fontSizeStyle }}
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
