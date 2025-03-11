
import * as React from "react"
import { Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TimePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  className?: string
  disabled?: boolean
  intervalMinutes?: number
}

export function TimePicker({
  value = "12:00",
  onValueChange,
  className,
  disabled = false,
  intervalMinutes = 15,
  ...props
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentValue, setCurrentValue] = React.useState(value)
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Generate time slots with the specified interval (default: 15min)
  const timeSlots = React.useMemo(() => {
    const slots = []
    for (let hour = 0; hour < 24; hour++) {
      for (let minute = 0; minute < 60; minute += intervalMinutes) {
        const formattedHour = hour.toString().padStart(2, "0")
        const formattedMinute = minute.toString().padStart(2, "0")
        const timeValue = `${formattedHour}:${formattedMinute}`
        
        // Format for 12-hour display
        const displayHour = hour % 12 || 12
        const amPm = hour < 12 ? "AM" : "PM"
        const displayValue = `${displayHour}:${formattedMinute} ${amPm}`
        
        slots.push({
          value: timeValue,
          display: displayValue
        })
      }
    }
    return slots
  }, [intervalMinutes])

  // Format time for display in 12-hour format
  const formatDisplayTime = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(":")
    const hour = parseInt(hourStr, 10)
    const displayHour = hour % 12 || 12
    const amPm = hour < 12 ? "AM" : "PM"
    return `${displayHour}:${minuteStr} ${amPm}`
  }

  // Handle time selection
  const handleTimeSelect = (timeValue: string) => {
    setCurrentValue(timeValue)
    onValueChange?.(timeValue)
    setIsOpen(false)
  }

  // Handle click outside to close
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
    }
  }, [])

  // Update currentValue when value prop changes
  React.useEffect(() => {
    setCurrentValue(value)
  }, [value])

  return (
    <div 
      className={cn("relative inline-block w-full", className)} 
      ref={containerRef}
      {...props}
    >
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full justify-start text-left font-normal"
      >
        <Clock className="mr-2 h-4 w-4" />
        {formatDisplayTime(currentValue)}
      </Button>
      
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-2 shadow-md">
          <div className="mb-1 text-xs font-medium text-center text-muted-foreground">Select Time</div>
          <ScrollArea className="h-[200px] rounded border">
            <div className="py-1">
              {timeSlots.map((slot) => (
                <Button
                  key={slot.value}
                  variant="ghost"
                  className={cn(
                    "w-full justify-center rounded-none",
                    slot.value === currentValue && "bg-accent text-accent-foreground"
                  )}
                  onClick={() => handleTimeSelect(slot.value)}
                >
                  {slot.display}
                </Button>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
