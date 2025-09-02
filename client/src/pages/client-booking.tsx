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

const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type LoginValues = z.infer<typeof loginSchema>;

const ClientBookingPage = () => {
  useDocumentTitle("Book an Appointment | Glo Head Spa");
  const { isAuthenticated, login, user } = useAuth();
  const [isBookingOpen, setIsBookingOpen] = useState(true);
  const { toast } = useToast();
  const [location, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

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

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
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

  const handleLogin = async (values: LoginValues) => {
    setIsLoginSubmitting(true);
    setLoginError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const data = await res.json();
      if (!res.ok) {
        const message = data?.message || data?.error || "Login failed";
        setLoginError(message);
        throw new Error(message);
      }
      if (data?.success && data?.user && data?.token) {
        login(data.user, data.token);
        toast({ title: "Logged in", description: "You're now ready to book." });
        setShowLogin(false);
      } else {
        throw new Error("Unexpected response from server");
      }
    } catch (e: any) {
      toast({ title: "Login failed", description: e?.message || String(e), variant: "destructive" });
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    setIsBookingOpen(open);
    // Stay on the public booking page when closing to avoid entering internal app UI
    // Intentionally no navigation on close for the public client flow
  };

  const isClientUser = user?.role === 'client' || user?.role === 'customer';
  const shouldShowRegister = false;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">

      <main className="flex-1 w-full mx-auto py-10 px-4 sm:px-6 lg:px-8">
        {shouldShowRegister ? (
          <div className="w-full">
            {showLogin ? (
              <div>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Log in</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sign in to book your appointment.</p>
                </div>
                {loginError && (
                  <div className="mb-4 text-sm text-red-600 dark:text-red-400 font-medium">{loginError}</div>
                )}
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5 max-w-2xl" noValidate>
                    <FormField
                      control={loginForm.control}
                      name="username"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Username</FormLabel>
                          <FormControl>
                            <Input placeholder="your username" autoComplete="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={loginForm.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" autoComplete="current-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center gap-4">
                      <Button type="submit" disabled={isLoginSubmitting}>
                        {isLoginSubmitting ? "Signing in..." : "Sign in"}
                      </Button>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        New here? <button type="button" className="text-primary" onClick={() => setShowLogin(false)}>Create account</button>
                      </div>
                    </div>
                  </form>
                </Form>
                <div className="mt-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Forgot your password?</div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-1">
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-8 w-fit px-2 text-xs text-primary hover:text-primary/80"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Reset via Email
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-8 w-fit px-2 text-xs text-primary hover:text-primary/80"
                      onClick={() => navigate("/forgot-password-sms")}
                    >
                      Reset via SMS
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="mb-8">
                  <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">Create your account</h2>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Sign up to book your appointment.</p>
                </div>
                {error && (
                  <div className="mb-4 text-sm text-red-600 dark:text-red-400 font-medium">{error}</div>
                )}
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(handleRegister)} className="space-y-5 max-w-2xl" noValidate>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-sm">First name</FormLabel>
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
                            <FormLabel className="text-sm">Last name</FormLabel>
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
                          <FormLabel className="text-sm">Email</FormLabel>
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
                          <FormLabel className="text-sm">Username</FormLabel>
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
                          <FormLabel className="text-sm">Password</FormLabel>
                          <FormControl>
                            <Input type="password" placeholder="••••••••" autoComplete="new-password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex items-center gap-4">
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Creating account..." : "Create account & continue"}
                      </Button>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Already have an account? <button type="button" className="text-primary" onClick={() => setShowLogin(true)}>Log in</button>
                      </div>
                    </div>
                  </form>
                </Form>
                <div className="mt-4">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Forgot your password?</div>
                  <div className="mt-2 flex flex-col sm:flex-row gap-1">
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-8 w-fit px-2 text-xs text-primary hover:text-primary/80"
                      onClick={() => navigate("/forgot-password")}
                    >
                      Reset via Email
                    </Button>
                    <Button
                      variant="ghost"
                      type="button"
                      className="h-8 w-fit px-2 text-xs text-primary hover:text-primary/80"
                      onClick={() => navigate("/forgot-password-sms")}
                    >
                      Reset via SMS
                    </Button>
                  </div>
                </div>
              </>
            )}
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
              userId={user?.id}
            />
          </>
        )}
      </main>

      <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-sm text-gray-500 dark:text-gray-400 flex items-center justify-center gap-2">
            <span>&copy; {new Date().getFullYear()}</span>
            <BusinessBrand size="sm" showLogo={false} showName={true} />
            <span>. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ClientBookingPage;