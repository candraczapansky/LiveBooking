import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, AlertTriangle, Mail } from 'lucide-react';

interface TwoFactorDisableModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess: () => void;
  twoFactorMethod?: string;
}

export default function TwoFactorDisableModal({ isOpen, onClose, userId, onSuccess, twoFactorMethod }: TwoFactorDisableModalProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleRequestDisable = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: '' }) // Empty token for email method
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request 2FA disable');
      }

      const data = await response.json();
      if (data.method === 'email') {
        setEmailSent(true);
        setUserEmail(data.email);
        setStep('verify');
      } else {
        // For authenticator app, proceed directly to verification
        setStep('verify');
      }
    } catch (error: any) {
      console.log("Error:", error.message || "Failed to request 2FA disable");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisable = async () => {
    if (!token || token.length !== 6) {
      console.log("Error: Please enter a 6-digit verification code");
      return;
    }

    setIsLoading(true);
    try {
      const endpoint = twoFactorMethod === 'email' ? '/api/2fa/disable-email' : '/api/2fa/disable';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to disable 2FA');
      }

      console.log("Success: Two-factor authentication disabled successfully");
      onSuccess();
      onClose();
    } catch (error: any) {
      console.log("Error:", error.message || "Failed to disable 2FA");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
  };

  const resetModal = () => {
    setStep('request');
    setToken('');
    setEmailSent(false);
    setUserEmail('');
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
            <AlertTriangle className="h-5 w-5 text-orange-500" />
            Disable Two-Factor Authentication
          </DialogTitle>
          <DialogDescription>
            {step === 'request' && twoFactorMethod === 'email' && 
              "We'll send a verification code to your email to disable two-factor authentication."}
            {step === 'request' && twoFactorMethod === 'authenticator' && 
              "Enter the 6-digit code from your authenticator app to disable two-factor authentication."}
            {step === 'verify' && twoFactorMethod === 'email' && 
              "Enter the verification code sent to your email to complete the process."}
            <br />
            <span className="text-orange-600 font-medium">
              Warning: This will make your account less secure.
            </span>
          </DialogDescription>
        </DialogHeader>

        {step === 'request' && twoFactorMethod === 'email' && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="bg-orange-50 dark:bg-orange-900/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <AlertTriangle className="h-12 w-12 text-orange-600 dark:text-orange-400 mx-auto mb-2" />
                <h3 className="font-medium text-orange-800 dark:text-orange-200">Disable 2FA</h3>
                <p className="text-sm text-orange-600 dark:text-orange-400">
                  We'll send a verification code to your email address to confirm this action.
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRequestDisable} 
                variant="destructive"
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Verification Code"}
              </Button>
            </div>
          </div>
        )}

        {step === 'request' && twoFactorMethod === 'authenticator' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="disable-token">Verification Code</Label>
              <Input
                id="disable-token"
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
                onClick={handleClose} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleDisable} 
                variant="destructive"
                className="flex-1"
                disabled={isLoading || token.length !== 6}
              >
                {isLoading ? "Disabling..." : "Disable 2FA"}
              </Button>
            </div>
          </div>
        )}

        {step === 'verify' && twoFactorMethod === 'email' && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <Mail className="h-12 w-12 text-green-600 dark:text-green-400 mx-auto mb-2" />
                <h3 className="font-medium text-green-800 dark:text-green-200">Verification Code Sent</h3>
                <p className="text-sm text-green-600 dark:text-green-400">
                  We've sent a 6-digit code to <strong>{userEmail}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email-disable-token">Verification Code</Label>
              <Input
                id="email-disable-token"
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
              <Button 
                variant="outline" 
                onClick={() => setStep('request')} 
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleDisable} 
                variant="destructive"
                className="flex-1"
                disabled={isLoading || token.length !== 6}
              >
                {isLoading ? "Disabling..." : "Disable 2FA"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 