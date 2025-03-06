
import * as React from "react"
import { Clock } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface TimePickerProps extends React.HTMLAttributes<HTMLDivElement> {
  value?: string
  onValueChange?: (value: string) => void
  hourStep?: number
  minuteStep?: number
  className?: string
  disabled?: boolean
}

export function TimePicker({
  value = "12:00",
  onValueChange,
  hourStep = 1,
  minuteStep = 5,
  className,
  disabled = false,
  ...props
}: TimePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false)
  const [currentValue, setCurrentValue] = React.useState(value)
  const containerRef = React.useRef<HTMLDivElement>(null)
  
  const currentHour = React.useMemo(() => {
    const [hour] = currentValue.split(":")
    return parseInt(hour, 10)
  }, [currentValue])
  
  const currentMinute = React.useMemo(() => {
    const [, minute] = currentValue.split(":")
    return parseInt(minute, 10)
  }, [currentValue])

  // Generate hours (1-12)
  const hours = React.useMemo(() => {
    return Array.from({ length: 24 / hourStep }, (_, i) => {
      const hour = i * hourStep
      return {
        value: hour.toString().padStart(2, "0"),
        label: hour === 0 ? "12" : hour > 12 ? (hour - 12).toString() : hour.toString()
      }
    })
  }, [hourStep])

  // Generate minutes (0-59)
  const minutes = React.useMemo(() => {
    return Array.from({ length: 60 / minuteStep }, (_, i) => {
      const minute = i * minuteStep
      return {
        value: minute.toString().padStart(2, "0"),
        label: minute.toString().padStart(2, "0")
      }
    })
  }, [minuteStep])

  // Generate AM/PM
  const periods = [
    { value: "AM", label: "AM" },
    { value: "PM", label: "PM" },
  ]

  // Determine if current time is AM or PM
  const currentPeriod = React.useMemo(() => {
    return currentHour >= 12 ? "PM" : "AM"
  }, [currentHour])

  // Handle hour selection
  const handleHourChange = (hour: string) => {
    const hourValue = parseInt(hour, 10)
    const isPM = currentPeriod === "PM"
    const adjustedHour = isPM && hourValue < 12 ? hourValue + 12 : (!isPM && hourValue === 12 ? 0 : hourValue)
    const newValue = `${adjustedHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`
    setCurrentValue(newValue)
    onValueChange?.(newValue)
  }

  // Handle minute selection
  const handleMinuteChange = (minute: string) => {
    const newValue = `${currentHour.toString().padStart(2, "0")}:${minute}`
    setCurrentValue(newValue)
    onValueChange?.(newValue)
  }

  // Handle period selection (AM/PM)
  const handlePeriodChange = (period: string) => {
    const hourValue = currentHour % 12
    const newHour = period === "PM" ? hourValue + 12 : hourValue
    const adjustedHour = period === "AM" && hourValue === 0 ? 12 : (period === "AM" && currentHour === 12 ? 0 : newHour)
    const newValue = `${adjustedHour.toString().padStart(2, "0")}:${currentMinute.toString().padStart(2, "0")}`
    setCurrentValue(newValue)
    onValueChange?.(newValue)
  }

  // Format time for display
  const formatDisplayTime = (timeString: string) => {
    const [hourStr, minuteStr] = timeString.split(":")
    const hour = parseInt(hourStr, 10)
    const minute = parseInt(minuteStr, 10)
    const period = hour >= 12 ? "PM" : "AM"
    const displayHour = hour % 12 === 0 ? 12 : hour % 12
    return `${displayHour}:${minute.toString().padStart(2, "0")} ${period}`
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
          <div className="flex space-x-1">
            {/* Hour column */}
            <div className="flex-1">
              <div className="mb-1 text-xs font-medium text-center text-muted-foreground">Hour</div>
              <ScrollArea className="h-[200px] rounded border">
                <div className="py-1">
                  {hours.map((hour) => (
                    <Button
                      key={hour.value}
                      variant="ghost"
                      className={cn(
                        "w-full justify-center rounded-none",
                        parseInt(hour.value, 10) === (currentHour % 12 || 12) && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleHourChange(hour.value)}
                    >
                      {hour.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* Minute column */}
            <div className="flex-1">
              <div className="mb-1 text-xs font-medium text-center text-muted-foreground">Minute</div>
              <ScrollArea className="h-[200px] rounded border">
                <div className="py-1">
                  {minutes.map((minute) => (
                    <Button
                      key={minute.value}
                      variant="ghost"
                      className={cn(
                        "w-full justify-center rounded-none",
                        minute.value === currentMinute.toString().padStart(2, "0") && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handleMinuteChange(minute.value)}
                    >
                      {minute.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
            
            {/* AM/PM column */}
            <div className="flex-1">
              <div className="mb-1 text-xs font-medium text-center text-muted-foreground">Period</div>
              <ScrollArea className="h-[200px] rounded border">
                <div className="py-1">
                  {periods.map((period) => (
                    <Button
                      key={period.value}
                      variant="ghost"
                      className={cn(
                        "w-full justify-center rounded-none",
                        period.value === currentPeriod && "bg-accent text-accent-foreground"
                      )}
                      onClick={() => handlePeriodChange(period.value)}
                    >
                      {period.label}
                    </Button>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
