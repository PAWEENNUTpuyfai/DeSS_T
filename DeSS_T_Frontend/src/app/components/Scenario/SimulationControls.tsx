
import CustomDropdown from "../CustomDropdown";

interface SimulationControlsProps {
  simStartHour: number;
  simEndHour: number;
  timeSlot: string;
  onStartHourChange: (hour: number) => void;
  onEndHourChange: (hour: number) => void;
  onTimeSlotChange: (slot: string) => void;
}

const timeSlotOptions = [
  "5 Minutes",
  "10 Minutes",
  "15 Minutes",
  "20 Minutes",
  "30 Minutes",
];

export default function SimulationControls({
  simStartHour,
  simEndHour,
  timeSlot,
  onStartHourChange,
  onEndHourChange,
  onTimeSlotChange,
}: SimulationControlsProps) {
  return (
    <div className="my-4 flex w-full text-header-map justify-start gap-10 items-center">
      <div className="flex items-center ">
        <p className="text-[20px] text-[#323232]">Simulation Period :</p>
        <div className="time-inputs p-2 px-4 text-[#C296CD] ml-3 my-2 h-[60px] flex items-center text-lg">
          <input
            type="number"
            min={0}
            max={23}
            value={simStartHour}
            onChange={(e) => onStartHourChange(Number(e.target.value))}
            className="border p-2 rounded w-10 text-lg"
          />
          <span className="text-lg">:00</span>
          <span className="mx-2 text-lg">-</span>
          <input
            type="number"
            min={1}
            max={24}
            value={simEndHour}
            onChange={(e) => onEndHourChange(Number(e.target.value))}
            className="border p-2 rounded w-10 text-lg"
          />
          <span className="text-lg">:00</span>
        </div>
      </div>

      <div className="flex items-center ">
        <p className="text-[20px] text-[#323232]">Time Slot : </p>
        <div className="ml-3 my-2 h-full">
          <CustomDropdown
            options={timeSlotOptions}
            selectedValue={timeSlot}
            onChange={onTimeSlotChange}
            fontSize="text-lg"
          />
        </div>
      </div>
    </div>
  );
}
