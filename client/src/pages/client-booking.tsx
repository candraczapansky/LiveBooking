import { useState } from "react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import BookingWidget from "@/components/bookings/booking-widget";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { BusinessBrand } from "@/components/BusinessBrand";
import { useAuth } from "@/contexts/AuthProvider";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

const registerSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  email: z.string().email("Valid email required"),
  username: z.string().min(3, "Username must be at least 3 characters"),
  password: z.string().min(8, "Password must be at least 8 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

const ClientBookingPage = () => {
  useDocumentTitle("Book an Appointment | Glo Head Spa");
  const { isAuthenticated, login } = useAuth();
  const [isBookingOpen, setIsBookingOpen] = useState(true);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      username: "",
      password: "",
    },
  });

  const handleRegister = async (values: RegisterValues) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.message || data?.error || "Registration failed";
        setError(message);
        throw new Error(message);
      }
      if (data?.success && data?.user && data?.token) {
        login(data.user, data.token);
        toast({ title: "Account created", description: "You are now logged in. Continue booking." });
        navigate("/booking");
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (e: any) {
      toast({ title: "Signup failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsBookingOpen(open);
    if (!open) {
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
          <BusinessBrand size="md" className="text-gray-900 dark:text-gray-100" />
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate("/login")}
          >
            Log In
          </Button>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto py-8 px-4 sm:px-6 lg:px-8">
        {!isAuthenticated ? (
          <div className="max-w-md mx-auto bg-white dark:bg-gray-800 shadow-sm rounded-lg p-6 border border-gray-200 dark:border-gray-700">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2 text-center">Create your account</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6 text-center">Sign up to book your appointment.</p>
            {error && (
              <div className="mb-4 text-center text-sm text-red-600 dark:text-red-400 font-medium">{error}</div>
            )}
            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-4" noValidate>
                <div className="grid grid-cols-2 gap-3">
                  <FormField
                    control={form.control}
                    name="firstName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">First name</FormLabel>
                        <FormControl>
                          <Input placeholder="Jane" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="lastName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs">Last name</FormLabel>
                        <FormControl>
                          <Input placeholder="Doe" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Email</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="you@example.com" autoComplete="email" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="username"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Username</FormLabel>
                      <FormControl>
                        <Input placeholder="janedoe" autoComplete="username" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Password</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isSubmitting}>
                  {isSubmitting ? "Creating account..." : "Create account & continue"}
                </Button>
                <div className="text-center text-xs text-gray-600 dark:text-gray-400">
                  Already have an account? <button type="button" className="text-primary" onClick={() => navigate("/login")}>Log in</button>
                </div>
              </form>
            </Form>
          </div>
        ) : (
          <>
            <div className="text-center mb-8">
              <h2 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-4">
                Book Your Appointment
              </h2>
              <p className="max-w-2xl mx-auto text-gray-600 dark:text-gray-400">
                Select from our wide range of services and choose a time that works for you.
              </p>
            </div>
            <BookingWidget 
              open={isBookingOpen} 
              onOpenChange={handleOpenChange} 
            />
          </>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            &copy; {new Date().getFullYear()} <BusinessBrand size="sm" showLogo={false} showName={true} />. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ClientBookingPage;