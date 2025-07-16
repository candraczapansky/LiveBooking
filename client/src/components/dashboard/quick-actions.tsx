import { useContext } from "react";
import { Plus, UserPlus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/contexts/AuthProvider";

const QuickActions = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useContext(AuthContext);

  // Fallback to localStorage if context user is null
  const getCurrentUser = () => {
    if (user) return user;
    
    try {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        return JSON.parse(storedUser);
      }
    } catch (error) {
      console.error('Error parsing stored user:', error);
    }
    return null;
  };

  const handleNewAppointment = () => {
    const currentUser = getCurrentUser();
    console.log('New Appointment clicked, user:', currentUser);
    if (currentUser?.role === 'admin' || currentUser?.role === 'staff') {
      console.log('Navigating to appointments with new=true');
      navigate('/appointments?new=true');
    } else {
      console.log('Permission denied for user role:', currentUser?.role);
      toast();
    }
  };

  const handleAddClient = () => {
    const currentUser = getCurrentUser();
    console.log('Add Client clicked, user:', currentUser);
    if (currentUser?.role === 'admin' || currentUser?.role === 'staff') {
      console.log('Navigating to clients with new=true');
      navigate('/clients?new=true');
    } else {
      console.log('Permission denied for user role:', currentUser?.role);
      toast();
    }
  };

  const handleSendPromotion = () => {
    const currentUser = getCurrentUser();
    console.log('Send Promotion clicked, user:', currentUser);
    if (currentUser?.role === 'admin') {
      console.log('Navigating to marketing with new=true');
      navigate('/marketing?new=true');
    } else {
      console.log('Permission denied for user role:', currentUser?.role);
      toast();
    }
  };

  return (
    <Card>
      <CardHeader className="px-3 py-4 border-b border-gray-200 dark:border-gray-700 sm:px-4 sm:py-5">
        <CardTitle className="text-base sm:text-lg font-medium text-gray-900 dark:text-gray-100">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3">
        <Button 
          onClick={handleNewAppointment}
          className="w-full flex items-center justify-center h-10 sm:h-auto"
          variant="outline"
          size="sm"
        >
          <Plus className="h-4 w-4 mr-2" /> New Appointment
        </Button>
        
        <Button 
          onClick={handleAddClient}
          className="w-full flex items-center justify-center h-10 sm:h-auto"
          variant="outline"
          size="sm"
        >
          <UserPlus className="h-4 w-4 mr-2" /> Add Client
        </Button>
        
        <Button 
          onClick={handleSendPromotion}
          className="w-full flex items-center justify-center h-10 sm:h-auto"
          variant="outline"
          size="sm"
        >
          <Megaphone className="h-4 w-4 mr-2" /> Send Promotion
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
