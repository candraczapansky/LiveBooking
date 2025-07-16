import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Scissors, ArrowLeft, MessageSquare } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

const forgotPasswordSMSSchema = z.object({
  phone: z.string().min(10, "Please enter a valid phone number"),
});

type ForgotPasswordSMSValues = z.infer<typeof forgotPasswordSMSSchema>;

const ForgotPasswordSMS = () => {
  useDocumentTitle("Forgot Password - SMS | Glo Head Spa");
  const [, navigate] = useLocation();

  const [isLoading, setIsLoading] = useState(false);
  const [smsSent, setSmsSent] = useState(false);

  const form = useForm<ForgotPasswordSMSValues>({
    resolver: zodResolver(forgotPasswordSMSSchema),
    defaultValues: {
      phone: "",
    },
  });

  const handleSubmit = async (values: ForgotPasswordSMSValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/forgot-password-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to send reset SMS");
      }

      setSmsSent(true);

    } catch (error: any) {
      console.error("Forgot password SMS error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (smsSent) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-sm mx-auto">
          <Card className="w-full shadow-lg border-0">
            <CardHeader className="text-center pb-4 px-8">
              <div className="flex justify-center mb-4">
                <div className="bg-green-100 dark:bg-green-900 p-3 rounded-full">
                  <MessageSquare className="h-10 w-10 text-green-600 dark:text-green-400" />
                </div>
              </div>
              <CardTitle className="text-2xl font-bold mb-2">Check Your Phone</CardTitle>
              <CardDescription className="text-base text-gray-600 dark:text-gray-400">
                We've sent password reset instructions to your phone number.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-6 pb-8">
              <div className="space-y-4 text-center">
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Didn't receive the SMS? Check your phone number or try again.
                </p>
                <div className="space-y-2">
                  <Button
                    variant="outline"
                    onClick={() => setSmsSent(false)}
                    className="w-full"
                  >
                    Try Different Phone Number
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/forgot-password")}
                    className="w-full"
                  >
                    Try Email Instead
                  </Button>
                  <Button
                    variant="default"
                    onClick={() => navigate("/login")}
                    className="w-full flex items-center gap-2"
                  >
                    <ArrowLeft className="h-4 w-4" />
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
            <CardTitle className="text-2xl font-bold mb-2">Forgot Password</CardTitle>
            <CardDescription className="text-base text-gray-600 dark:text-gray-400">
              Enter your phone number and we'll send you a link to reset your password.
            </CardDescription>
          </CardHeader>
          <CardContent className="px-6 pb-8">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-5" noValidate>
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone Number
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="(555) 123-4567" 
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
                  {isLoading ? "Sending..." : "Send Reset SMS"}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center space-y-2">
              <Button
                variant="ghost"
                onClick={() => navigate("/forgot-password")}
                className="text-sm text-primary hover:text-primary/80"
              >
                Try Email Instead
              </Button>
              <div>
                <Button
                  variant="ghost"
                  onClick={() => navigate("/login")}
                  className="text-sm flex items-center gap-2 mx-auto"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Login
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ForgotPasswordSMS; 