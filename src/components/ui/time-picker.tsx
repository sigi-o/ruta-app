
import * as React from "react";
import { Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./button";
import { ScrollArea } from "./scroll-area";

interface TimePickerProps {
  value?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
  className?: string;
  hourStep?: number;
  minuteStep?: number;
  secondStep?: number;
  showSeconds?: boolean;
}

function generateTimeOptions(step: number, max: number, padding = true) {
  return Array.from({ length: Math.floor(max / step) + 1 }, (_, i) => {
    const value = i * step;
    return {
      value: value,
      label: padding ? value.toString().padStart(2, "0") : value.toString(),
    };
  });
}

export function TimePicker({
  value,
  onChange,
  disabled = false,
  className,
  hourStep = 1,
  minuteStep = 1,
  secondStep = 1,
  showSeconds = false,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const timePickerRef = React.useRef<HTMLDivElement>(null);
  const [hours, minutes, seconds] = value
    ? value.split(":").map(Number)
    : [0, 0, 0];

  const hoursOptions = generateTimeOptions(hourStep, 23);
  const minutesOptions = generateTimeOptions(minuteStep, 59);
  const secondsOptions = generateTimeOptions(secondStep, 59);

  const formatSelectedTime = () => {
    if (!value) return "";
    const [h, m, s] = value.split(":").map(Number);
    return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}${
      showSeconds ? `:${s.toString().padStart(2, "0")}` : ""
    }`;
  };

  const handleTimeChange = (
    type: "hours" | "minutes" | "seconds",
    newValue: number
  ) => {
    if (!onChange) return;

    const [h, m, s] = value ? value.split(":").map(Number) : [0, 0, 0];
    
    let newTimeValue = "";
    if (type === "hours") {
      newTimeValue = `${newValue.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}${
        showSeconds ? `:${s.toString().padStart(2, "0")}` : ""
      }`;
    } else if (type === "minutes") {
      newTimeValue = `${h.toString().padStart(2, "0")}:${newValue.toString().padStart(2, "0")}${
        showSeconds ? `:${s.toString().padStart(2, "0")}` : ""
      }`;
    } else {
      newTimeValue = `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${newValue.toString().padStart(2, "0")}`;
    }
    
    onChange(newTimeValue);
  };

  // Click outside handler
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        timePickerRef.current &&
        !timePickerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  return (
    <div
      ref={timePickerRef}
      className={cn("relative inline-block", className)}
    >
      <Button
        type="button"
        variant="outline"
        className={cn(
          "w-full justify-start text-left font-normal",
          !value && "text-muted-foreground"
        )}
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        <Clock className="mr-2 h-4 w-4" />
        {value ? formatSelectedTime() : "Select time"}
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
          <div className="flex gap-1">
            {/* Hours Column */}
            <div className="flex-1">
              <div className="mb-1 text-center text-xs font-medium">Hours</div>
              <ScrollArea className="h-52 rounded border">
                <div className="flex flex-col">
                  {hoursOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={hours === option.value ? "secondary" : "ghost"}
                      className="justify-center rounded-none"
                      onClick={() => handleTimeChange("hours", option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Minutes Column */}
            <div className="flex-1">
              <div className="mb-1 text-center text-xs font-medium">Minutes</div>
              <ScrollArea className="h-52 rounded border">
                <div className="flex flex-col">
                  {minutesOptions.map((option) => (
                    <Button
                      key={option.value}
                      type="button"
                      variant={minutes === option.value ? "secondary" : "ghost"}
                      className="justify-center rounded-none"
                      onClick={() => handleTimeChange("minutes", option.value)}
                    >
                      {option.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Seconds Column (Optional) */}
            {showSeconds && (
              <div className="flex-1">
                <div className="mb-1 text-center text-xs font-medium">Seconds</div>
                <ScrollArea className="h-52 rounded border">
                  <div className="flex flex-col">
                    {secondsOptions.map((option) => (
                      <Button
                        key={option.value}
                        type="button"
                        variant={seconds === option.value ? "secondary" : "ghost"}
                        className="justify-center rounded-none"
                        onClick={() => handleTimeChange("seconds", option.value)}
                      >
                        {option.label}
                      </Button>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
