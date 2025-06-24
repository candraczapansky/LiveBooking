import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface SquareSetupProps {
  onComplete: () => void;
}

export default function SquareSetup({ onComplete }: SquareSetupProps) {
  const [appId, setAppId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!appId.trim() || !locationId.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in both Square Application ID and Location ID",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Save to environment variables (this is a placeholder - in production you'd send to backend)
      localStorage.setItem('VITE_SQUARE_APPLICATION_ID', appId.trim());
      localStorage.setItem('SQUARE_LOCATION_ID', locationId.trim());
      
      toast({
        title: "Configuration Saved",
        description: "Square payment settings have been configured successfully!",
      });
      
      // Refresh the page to apply new environment variables
      setTimeout(() => {
        window.location.reload();
      }, 1000);
      
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save Square configuration",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
            Square Payment Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4 mb-6">
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <h3 className="font-medium text-blue-800 dark:text-blue-200 mb-2">
                Where to find these values:
              </h3>
              <ol className="text-sm text-blue-700 dark:text-blue-300 space-y-1 list-decimal list-inside">
                <li>Go to your Square Developer Dashboard</li>
                <li>Select your application</li>
                <li>Copy the Application ID (starts with "sandbox-sq0idb-" for sandbox)</li>
                <li>Go to Square Dashboard → Locations to find Location ID</li>
              </ol>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="appId">Square Application ID</Label>
              <Input
                id="appId"
                type="text"
                placeholder="sandbox-sq0idb-..."
                value={appId}
                onChange={(e) => setAppId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Your Square Application ID from the Developer Dashboard
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="locationId">Square Location ID</Label>
              <Input
                id="locationId"
                type="text"
                placeholder="Enter your location ID"
                value={locationId}
                onChange={(e) => setLocationId(e.target.value)}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Your Square Location ID from the Dashboard
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <Button
                type="submit"
                disabled={isSubmitting || !appId.trim() || !locationId.trim()}
                className="flex-1"
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    Save Configuration
                  </div>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}