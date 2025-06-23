import * as React from "react"

// Disabled toast system to prevent achievement overlays
export function useToast() {
  return {
    toasts: [],
    toast: () => {}, // No-op function to prevent errors
    dismiss: () => {}, // No-op function to prevent errors
  }
}