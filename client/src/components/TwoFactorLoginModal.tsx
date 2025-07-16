import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Shield, Smartphone, Mail } from 'lucide-react';

interface TwoFactorLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: number;
  onSuccess: (userData: any) => void;
  twoFactorMethod?: string;
}

export default function TwoFactorLoginModal({ isOpen, onClose, userId, onSuccess, twoFactorMethod }: TwoFactorLoginModalProps) {
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [token, setToken] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [userEmail, setUserEmail] = useState('');

  const handleRequestCode = async () => {
    setIsLoading(true);
    setError('');
    
    try {
      const response = await fetch('/api/login/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token: '' }) // Empty token for email method
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to request verification code');
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
      console.log("Error:", error.message || "Failed to request verification code");
      setError(error.message || "Failed to request verification code");
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!token || token.length !== 6) {
      setError('Please enter a 6-digit verification code');
      return;
    }

    setIsLoading(true);
    setError('');
    
    try {
      const endpoint = twoFactorMethod === 'email' ? '/api/login/2fa-email' : '/api/login/2fa';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, token })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to verify token');
      }

      const userData = await response.json();
      console.log("Success: Two-factor authentication verified successfully");
      onSuccess(userData);
      onClose();
    } catch (error: any) {
      console.log("Error:", error.message || "Failed to verify token");
      setError(error.message || "Failed to verify token");
    } finally {
      setIsLoading(false);
    }
  };

  const handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setToken(value);
    if (error) setError(''); // Clear error when user starts typing
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && token.length === 6) {
      handleVerify();
    }
  };

  const resetModal = () => {
    setStep('request');
    setToken('');
    setError('');
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
            <Shield className="h-5 w-5" />
            Two-Factor Authentication Required
          </DialogTitle>
          <DialogDescription>
            {step === 'request' && twoFactorMethod === 'email' && 
              "We'll send a verification code to your email to complete your login."}
            {step === 'request' && twoFactorMethod === 'authenticator' && 
              "Enter the 6-digit code from your authenticator app to complete your login."}
            {step === 'verify' && twoFactorMethod === 'email' && 
              "Enter the verification code sent to your email to complete your login."}
          </DialogDescription>
        </DialogHeader>

        {step === 'request' && twoFactorMethod === 'email' && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <Mail className="h-12 w-12 text-blue-600 dark:text-blue-400 mx-auto mb-2" />
                <h3 className="font-medium text-blue-800 dark:text-blue-200">Email Verification</h3>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  We'll send a verification code to your email address to complete your login.
                </p>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRequestCode} 
                className="flex-1"
                disabled={isLoading}
              >
                {isLoading ? "Sending..." : "Send Code"}
              </Button>
            </div>
          </div>
        )}

        {step === 'request' && twoFactorMethod === 'authenticator' && (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="login-token">Verification Code</Label>
              <Input
                id="login-token"
                type="text"
                placeholder="000000"
                value={token}
                onChange={handleTokenChange}
                onKeyPress={handleKeyPress}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleClose} 
                className="flex-1"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleVerify} 
                className="flex-1"
                disabled={isLoading || token.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify & Login"}
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
              <Label htmlFor="email-login-token">Verification Code</Label>
              <Input
                id="email-login-token"
                type="text"
                placeholder="000000"
                value={token}
                onChange={handleTokenChange}
                onKeyPress={handleKeyPress}
                maxLength={6}
                className="text-center text-lg tracking-widest"
                autoFocus
              />
              <p className="text-xs text-gray-500 text-center">
                Enter the 6-digit code from your email
              </p>
            </div>

            {error && (
              <div className="text-sm text-red-600 dark:text-red-400 text-center">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={() => setStep('request')} 
                className="flex-1"
              >
                Back
              </Button>
              <Button 
                onClick={handleVerify} 
                className="flex-1"
                disabled={isLoading || token.length !== 6}
              >
                {isLoading ? "Verifying..." : "Verify & Login"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
} 