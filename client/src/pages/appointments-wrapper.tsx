import { useEffect, useState } from "react";
import { lazy, Suspense } from "react";

// Lazy load the components for better performance
const Appointments = lazy(() => import("./appointments"));
const AppointmentsMobile = lazy(() => import("./appointments-mobile"));

const AppointmentsWrapper = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if device is mobile based on screen width
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    
    // Initial check
    checkMobile();
    
    // Add resize listener to handle orientation changes and responsive behavior
    window.addEventListener("resize", checkMobile);
    
    // Cleanup listener
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  // Loading fallback
  const LoadingFallback = () => (
    <div className="flex items-center justify-center h-screen">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <p className="text-gray-600">Loading appointments...</p>
      </div>
    </div>
  );

  // Render mobile or desktop version based on screen size
  return (
    <Suspense fallback={<LoadingFallback />}>
      {isMobile ? <AppointmentsMobile /> : <Appointments />}
    </Suspense>
  );
};

export default AppointmentsWrapper;


