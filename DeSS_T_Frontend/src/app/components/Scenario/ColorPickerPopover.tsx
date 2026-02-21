import { useEffect, useRef } from "react";
import { SketchPicker, type ColorResult } from "react-color";

interface ColorPickerPopoverProps {
  isOpen: boolean;
  color: string;
  onClose: () => void;
  onColorChange: (color: ColorResult) => void;
}

export default function ColorPickerPopover({
  isOpen,
  color,
  onClose,
  onColorChange,
}: ColorPickerPopoverProps) {
  const pickerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (pickerRef.current && !pickerRef.current.contains(target)) {
        onClose();
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={pickerRef}
      style={{
        position: "absolute",
        zIndex: 1000,
        top: "100%",
        left: 0,
        marginTop: "8px",
      }}
    >
      <SketchPicker color={color} onChange={onColorChange} />
    </div>
  );
}
