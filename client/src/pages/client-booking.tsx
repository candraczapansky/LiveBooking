import { useState } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import BookingWidget from "@/components/bookings/booking-widget";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";

const ClientBookingPage = () => {
  useDocumentTitle("Book an Appointment | BeautyBook");
  const [isBookingOpen, setIsBookingOpen] = useState(true);
  const { toast } = useToast();
  const [location, navigate] = useLocation();

  const handleOpenChange = (open: boolean) => {
    setIsBookingOpen(open);
    if (!open) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">BeautyBook Salon & Spa</h1>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/login")}
          >
            Log In
          </Button>
        </div>
      </header>
      
      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
            Book Your Appointment
          </h2>
          <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-400">
            Select from our wide range of services and choose a time that works for you.
          </p>
        </div>
        
        <BookingWidget 
          open={isBookingOpen} 
          onOpenChange={handleOpenChange} 
        />
      </main>
      
      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} BeautyBook Salon & Spa. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientBookingPage;