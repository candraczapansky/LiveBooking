import { useEffect } from "react";

/**
 * A custom hook to update the document title
 * @param title The title to set for the document
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    // Save the original title
    const originalTitle = document.title;
    
    // Set the new title
    document.title = title;
    
    // Restore the original title when the component unmounts
    return () => {
      document.title = originalTitle;
    };
  }, [title]);
}
