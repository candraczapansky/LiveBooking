import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

interface TerminalManagementProps {
  locationId: string;
}

export default function TerminalManagement({ locationId }: TerminalManagementProps) {
  const [deviceCode, setDeviceCode] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();

  const handleInitializeTerminal = async () => {
    if (!deviceCode || !apiToken) {
      toast({
        title: "Validation Error",
        description: "Device Code and API Token are required",
        variant: "destructive",
      });
      return;
    }

    setIsInitializing(true);

    try {
      const response = await apiRequest('POST', '/api/terminal/initialize', {
        deviceCode,
        locationId,
        apiToken,
      });

      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Terminal initialized successfully",
        });
      } else {
        throw new Error(result.message || 'Failed to initialize terminal');
      }
    } catch (error: any) {
      console.error('❌ Error initializing terminal:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to initialize terminal',
        variant: "destructive",
      });
    } finally {
      setIsInitializing(false);
    }
  };

  const handleTestTerminal = async () => {
    try {
      const response = await apiRequest('GET', `/api/terminal/status/${locationId}`);
      const result = await response.json();

      if (result.success) {
        toast({
          title: "Success",
          description: "Terminal is connected and ready",
        });
      } else {
        throw new Error(result.message || 'Terminal test failed');
      }
    } catch (error: any) {
      console.error('❌ Error testing terminal:', error);
      toast({
        title: "Error",
        description: error.message || 'Failed to test terminal',
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Terminal Management</CardTitle>
        <CardDescription>
          Configure and manage your Helcim Smart Terminal for this location
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="deviceCode">Device Code</Label>
          <Input
            id="deviceCode"
            value={deviceCode}
            onChange={(e) => setDeviceCode(e.target.value)}
            placeholder="Enter Device Code from Terminal"
          />
          <p className="text-sm text-gray-500">
            To get the Device Code:
            1. Enable API Mode in Helcim Dashboard (Settings &gt; Smart Terminal API)
            2. Log out and back in to your terminal
            3. The Device Code will be displayed on the terminal screen
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="apiToken">API Token</Label>
          <Input
            id="apiToken"
            type="password"
            value={apiToken}
            onChange={(e) => setApiToken(e.target.value)}
            placeholder="Enter Helcim API Token"
          />
          <p className="text-sm text-gray-500">
            Each terminal should have its own API token from Helcim
          </p>
        </div>
      </CardContent>
      <CardFooter className="flex justify-end gap-2">
        <Button
          variant="outline"
          onClick={handleTestTerminal}
          disabled={isInitializing}
        >
          Test Connection
        </Button>
        <Button
          onClick={handleInitializeTerminal}
          disabled={isInitializing}
        >
          {isInitializing ? "Initializing..." : "Initialize Terminal"}
        </Button>
      </CardFooter>
    </Card>
  );
}
