import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import HelcimPayJsModal from './helcim-payjs-modal';

export default function HelcimDebugTest() {
  const [showModal, setShowModal] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const handleSuccessfulPayment = (response: any) => {
    console.log("Payment successful:", response);
    setTestResult("SUCCESS: Payment processed successfully");
  };

  const handleFailedPayment = (error: any) => {
    console.error("Payment failed:", error);
    setTestResult(`ERROR: ${error?.message || 'Unknown error'}`);
  };

  const testApiEndpoint = async () => {
    try {
      const response = await fetch('/api/payments/helcim/initialize', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: 1.00,
          description: 'Debug Test Payment',
        }),
      });
      
      const data = await response.json();
      console.log("API Test Result:", data);
      setTestResult(`API Test: ${data.success ? 'SUCCESS' : 'FAILED'} - ${data.token ? `Token: ${data.token}` : data.message || 'No token'}`);
    } catch (error: any) {
      console.error("API test error:", error);
      setTestResult(`API Test ERROR: ${error.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <h2 className="text-xl font-semibold">Helcim Pay.js Debug Test</h2>
      
      <div className="space-y-4">
        <Button onClick={() => testApiEndpoint()}>
          Test API Endpoint
        </Button>
        
        <Button onClick={() => setShowModal(true)}>
          Open Payment Modal
        </Button>

        {testResult && (
          <div className={`p-4 rounded-md ${testResult.includes('ERROR') ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
            {testResult}
          </div>
        )}
      </div>

      <HelcimPayJsModal
        open={showModal}
        onOpenChange={setShowModal}
        amount={1.00}
        description="Debug Test Payment"
        onSuccess={handleSuccessfulPayment}
        onError={handleFailedPayment}
      />

      <div className="mt-8 p-4 border rounded-md bg-gray-50">
        <h3 className="font-medium mb-2">Console Output</h3>
        <p className="text-sm text-gray-600">Open your browser console (F12) to view detailed debug information</p>
      </div>
    </div>
  );
}
