import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Scissors, CheckCircle, AlertCircle } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

const resetPasswordSchema = z.object({
  newPassword: z.string().min(6, "Password must be at least 6 characters long"),
  confirmPassword: z.string().min(6, "Password must be at least 6 characters long"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

const ResetPassword = () => {
  useDocumentTitle("Reset Password | BeautyBook");
  const [, navigate] = useLocation();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  const form = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  // Extract token from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tokenParam = urlParams.get('token');
    
    if (tokenParam) {
      setToken(tokenParam);
      setValidToken(true);
    } else {
      setValidToken(false);
    }
  }, []);

  const handleSubmit = async (values: ResetPasswordValues) => {
    if (!token) {
      toast({
        title: "Error",
        description: "Invalid reset token",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch("/api/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token,
          newPassword: values.newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      setResetComplete(true);
      toast({
        title: "Success",
        description: "Your password has been reset successfully!",
      });

    } catch (error: any) {
      console.error("Reset password error:", error);
      toast({
        title: "Error",
        description: error.message || "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Invalid token page
  if (validToken === false) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm mx-auto">
          <Card className="w-full shadow-lg border-0">
            <CardHeader className="text-center pb-4 px-8">
              <div className="flex justify-center mb-4">
                <div className="bg-red-100 dark:bg-red-900 p-3 rounded-full">
                  <AlertCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold mb-2">Invalid Reset Link</CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                This password reset link is invalid or has expired.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8 text-center">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Reset links expire after 1 hour for security reasons.
                </p>
                <div className="space-y-2">
                  <Button
                    onClick={() => navigate("/forgot-password")}
                    className="w-full"
                  >
                    Request New Reset Link
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => navigate("/login")}
                    className="w-full"
                  >
                    Back to Login
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Success page
  if (resetComplete) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm mx-auto">
          <Card className="w-full shadow-lg border-0">
            <CardHeader className="text-center pb-4 px-8">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <CheckCircle className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold mb-2">Password Reset Complete</CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                Your password has been successfully updated.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8 text-center">
              <div className="space-y-4">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  You can now log in with your new password.
                </p>
                <Button
                  onClick={() => navigate("/login")}
                  className="w-full"
                >
                  Continue to Login
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Loading state while checking token
  if (validToken === null) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm mx-auto">
          <Card className="w-full shadow-lg border-0">
            <CardContent className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-4 text-sm text-gray-600 dark:text-gray-400">
                Verifying reset link...
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Reset password form
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <Card className="w-full shadow-lg border-0">
          <CardHeader className="text-center pb-4 px-8">
            <div className="flex justify-center mb-4">
              <div className="bg-primary/10 p-3 rounded-full">
                <Scissors className="h-10 w-10 text-primary" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold mb-2">Reset Your Password</CardTitle>
            <CardDescription className="text-base text-gray-600 dark:text-gray-400">
              Enter your new password below.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        New Password
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Enter new password" 
                          className="h-10 text-sm px-3 rounded-md border border-gray-300 focus:border-primary focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)] focus:outline-none transition-all" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Confirm New Password
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="password"
                          placeholder="Confirm new password" 
                          className="h-10 text-sm px-3 rounded-md border border-gray-300 focus:border-primary focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)] focus:outline-none transition-all" 
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Button 
                  type="submit" 
                  className="w-full h-11 text-sm font-medium mt-6 rounded-md" 
                  disabled={isLoading}
                >
                  {isLoading ? "Resetting..." : "Reset Password"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Button
                variant="ghost"
                onClick={() => navigate("/login")}
                className="text-sm"
              >
                Back to Login
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResetPassword;