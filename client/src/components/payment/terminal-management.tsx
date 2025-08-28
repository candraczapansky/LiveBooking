import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';

interface TerminalManagementProps {
  locationId: string;
}

export default function TerminalManagement({ locationId }: TerminalManagementProps) {
  const [deviceCode, setDeviceCode] = useState('');
  const [apiToken, setApiToken] = useState('');
  const [terminalId, setTerminalId] = useState('');
  const [isInitializing, setIsInitializing] = useState(false);
  const { toast } = useToast();

  const handleInitializeTerminal = async () => {
    if (!deviceCode || !apiToken || !terminalId) {
      toast({
        title: "Validation Error",
        description: "Terminal ID, Device Code and API Token are required",
        variant: "destructive",
      });
      return;
    }

    setIsInitializing(true);

    try {
      const response = await apiRequest('POST', '/api/terminal/initialize', {
        terminalId,
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
    <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="terminalId">Terminal ID</Label>
          <Input
            id="terminalId"
            value={terminalId}
            onChange={(e) => setTerminalId(e.target.value)}
            placeholder="Enter Terminal ID (e.g., terminal-1)"
          />
          <p className="text-sm text-gray-500">
            A unique identifier for this terminal (e.g., "terminal-1", "front-desk", etc.)
          </p>
        </div>
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
      <div className="flex justify-end gap-2 pt-4 border-t">
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
      </div>
    </div>
  );
}
