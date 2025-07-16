import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
// Toast system is disabled, using console.log instead
import { Shield, Smartphone, Copy, Check, Mail, Smartphone as AuthenticatorIcon } from 'lucide-react';

interface TwoFactorSetupModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess: () => void;
}

interface TwoFactorSetupData {
  secret?: string;
  qrCodeUrl?: string;
  method?: string;
  message?: string;
  email?: string;
}

export default function TwoFactorSetupModal({ isOpen, onClose, userId, onSuccess }: TwoFactorSetupModalProps) {
  // Toast system is disabled, using console.log instead
  const [step, setStep] = useState<'method' | 'setup' | 'verify'>('method');
  const [selectedMethod, setSelectedMethod] = useState<'authenticator' | 'email'>('authenticator');
  const [setupData, setSetupData] = useState<TwoFactorSetupData | null>(null);
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen && step === 'setup') {
      handleSetup();
    }
  }, [isOpen, step]);

  const handleSetup = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, method: selectedMethod })
      });

      if (!response.ok) {
        throw new Error('Failed to setup 2FA');
      }

      const data = await response.json();
      setSetupData(data);
    } catch (error) {
      console.log("Error: Failed to setup two-factor authentication");
      onClose();
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      console.log("Error: Please enter a 6-digit token from your authenticator app");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify token');
      }

      console.log("Success: Two-factor authentication enabled successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.log("Error:", error.message || "Failed to verify token");
    } finally {
      setIsLoading(false);
    }
  };

  const copySecret = async () => {
    if (setupData?.secret) {
      try {
        await navigator.clipboard.writeText(setupData.secret);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
        console.log("Success: Secret key copied to clipboard");
      } catch (error) {
        console.log("Error: Failed to copy secret key");
      }
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
  };

  const handleMethodSelect = () => {
    setStep('setup');
  };

  const resetModal = () => {
    setStep('method');
    setSelectedMethod('authenticator');
    setSetupData(null);
    setToken('');
    setCopied(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Two-Factor Authentication Setup
          </DialogTitle>
          <DialogDescription>
            {step === 'method' && "Choose your preferred two-factor authentication method."}
            {step === 'setup' && selectedMethod === 'authenticator' && "Scan the QR code with your authenticator app to set up two-factor authentication."}
            {step === 'setup' && selectedMethod === 'email' && "A verification code has been sent to your email address."}
            {step === 'verify' && "Enter the 6-digit code to complete setup."}
          </DialogDescription>
        </DialogHeader>

        {step === 'method' && (
          <div className="space-y-4">
            <RadioGroup value={selectedMethod} onValueChange={(value: 'authenticator' | 'email') => setSelectedMethod(value)}>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <RadioGroupItem value="authenticator" id="authenticator" />
                <Label htmlFor="authenticator" className="flex items-center gap-2 cursor-pointer">
                  <AuthenticatorIcon className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Authenticator App</div>
                    <div className="text-sm text-gray-500">Use Google Authenticator, Authy, or similar apps</div>
                  </div>
                </Label>
              </div>
              <div className="flex items-center space-x-2 p-4 border rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800">
                <RadioGroupItem value="email" id="email" />
                <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                  <Mail className="h-5 w-5" />
                  <div>
                    <div className="font-medium">Email Verification</div>
                    <div className="text-sm text-gray-500">Receive codes via email</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <div className="flex gap-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={handleMethodSelect} 
                className="flex-1"
                disabled={isLoading}
              >
                Continue
              </Button>
            </div>
          </div>
        )}

        {step === 'setup' && setupData && selectedMethod === 'authenticator' && (
          <div className="space-y-4">
            <div className="flex flex-col items-center space-y-4">
              <div className="bg-white p-4 rounded-lg border">
                <img 
                  src={`/api/2fa/qr-code?qrCodeUrl=${encodeURIComponent(setupData.qrCodeUrl!)}`}
                  alt="QR Code"
                  className="w-40 h-40 sm:w-48 sm:h-48"
                />
              </div>
              
              <div className="text-center space-y-2">
                <p className="text-sm text-gray-600">
                  Or enter this code manually in your authenticator app:
                </p>
                <div className="flex items-center gap-2 justify-center">
                  <code className="bg-gray-100 px-3 py-1 rounded text-sm font-mono break-all">
                    {setupData.secret}
                  </code>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copySecret}
                    className="h-8 w-8 p-0 flex-shrink-0"
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => setStep('verify')} 
                className="flex-1"
                disabled={isLoading}
              >
                Next
              </Button>
            </div>
          </div>
        )}

        {step === 'setup' && setupData && selectedMethod === 'email' && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <Mail className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h3 className="font-medium text-green-800 dark:text-green-200">Verification Code Sent</h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  We've sent a 6-digit code to <strong>{setupData.email}</strong>
                </p>
              </div>
              
              <p className="text-sm text-gray-600">
                Check your email and enter the code below to complete setup.
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-token">Verification Code</Label>
              <Input
                id="email-token"
                type="text"
                placeholder="000000"
                value={token}
                onChange={handleTokenChange}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('method')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={handleVerify} 
                className="flex-1"
                disabled={isLoading || token.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify & Enable"}
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && selectedMethod === 'authenticator' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="token">Verification Code</Label>
              <Input
                id="token"
                type="text"
                placeholder="000000"
                value={token}
                onChange={handleTokenChange}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('setup')} 
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleVerify} 
                className="flex-1"
                disabled={isLoading || token.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify & Enable"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 