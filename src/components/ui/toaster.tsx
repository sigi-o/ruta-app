
import { useToast } from "@/hooks/use-toast"
import {
  ToastProvider,
  ToastViewport,
} from "@/components/ui/toast"

export function Toaster() {
  // We're still using useToast to maintain the API,
  // but the toasts array will always be empty
  const { toasts } = useToast()

  return (
    <ToastProvider>
      {/* No toasts will be rendered since the toasts array is always empty */}
      <ToastViewport />
    </ToastProvider>
  )
}
