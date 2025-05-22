import { useContext } from "react";
import { Plus, UserPlus, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { AuthContext } from "@/App";

const QuickActions = () => {
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const { user } = useContext(AuthContext);

  const handleNewAppointment = () => {
    if (user?.role === 'admin' || user?.role === 'staff') {
      navigate('/appointments?new=true');
    } else {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to create appointments.",
        variant: "destructive",
      });
    }
  };

  const handleAddClient = () => {
    if (user?.role === 'admin' || user?.role === 'staff') {
      navigate('/clients?new=true');
    } else {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to add clients.",
        variant: "destructive",
      });
    }
  };

  const handleSendPromotion = () => {
    if (user?.role === 'admin') {
      navigate('/marketing?new=true');
    } else {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to send promotions.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="px-4 py-5 border-b border-gray-200 dark:border-gray-700">
        <CardTitle className="text-lg font-medium text-gray-900 dark:text-gray-100">Quick Actions</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        <Button 
          onClick={handleNewAppointment}
          className="w-full flex items-center justify-center"
        >
          <Plus className="h-4 w-4 mr-2" /> New Appointment
        </Button>
        
        <Button 
          onClick={handleAddClient}
          className="w-full flex items-center justify-center"
          variant="secondary"
        >
          <UserPlus className="h-4 w-4 mr-2" /> Add Client
        </Button>
        
        <Button 
          onClick={handleSendPromotion}
          className="w-full flex items-center justify-center"
          variant="outline"
        >
          <Megaphone className="h-4 w-4 mr-2" /> Send Promotion
        </Button>
      </CardContent>
    </Card>
  );
};

export default QuickActions;
