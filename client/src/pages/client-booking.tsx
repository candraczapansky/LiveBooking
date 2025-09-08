import { useEffect, useRef, useState } from "react";
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
import { LogOut } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

type BookingDesign = {
  backgroundImage: string | null;
  primaryColor: string;
  textColor: string;
  aboutContent: string;
  servicesContent: string;
  contactContent: string;
  showTabs: boolean;
  businessName?: string;
  businessPhone?: string;
  businessEmail?: string;
  businessAddress?: string;
  businessWebsite?: string;
};

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
  const { login, user } = useAuth();
  const [isBookingOpen, setIsBookingOpen] = useState(true);
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Custom logout function for client booking page - clears auth but stays on booking page
  const clientLogout = () => {
    // Clear auth data without redirecting
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('profilePicture');
    
    // Clear color preferences from the DOM
    const root = document.documentElement;
    root.style.removeProperty('--primary');
    root.style.removeProperty('--primary-foreground');
    root.style.removeProperty('--accent');
    root.style.removeProperty('--ring');
    root.style.removeProperty('--text-primary');
    root.style.removeProperty('--text-secondary');
    root.classList.remove('dark');
    
    // Dispatch event to notify components of logout
    window.dispatchEvent(new CustomEvent('userDataUpdated', { detail: null }));
    
    // Close booking modal if open
    setIsBookingOpen(false);
    
    // Show success message
    toast({
      title: "Signed Out",
      description: "You have been signed out successfully.",
    });
    
    // Force page reload to reset auth state
    window.location.reload();
  };

  

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

  // Booking design state
  const [design, setDesign] = useState<BookingDesign | null>(null);
  const originalThemeRef = useRef<{ primary?: string; primaryFg?: string; accent?: string; ring?: string; textPrimary?: string; textSecondary?: string; foreground?: string; mutedForeground?: string; dark?: boolean; } | null>(null);
  const [overlayColor, setOverlayColor] = useState<string>('rgba(255,255,255,0.90)');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        // Prefer server design; fallback to localStorage if server not ready
        const res = await fetch('/api/booking-design');
        if (!res.ok) return;
        const data = await res.json();
        if (!cancelled) setDesign(data);
        if (!cancelled && (!data?.backgroundImage)) {
          try {
            const cached = localStorage.getItem('bookingBackgroundImage');
            if (cached) setDesign((d) => ({ ...(d || {} as any), backgroundImage: cached } as any));
          } catch {}
        }
      } catch {}
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Apply theme colors for booking page only
  useEffect(() => {
    if (!design) return;
    const root = document.documentElement;
    if (!originalThemeRef.current) {
      originalThemeRef.current = {
        primary: root.style.getPropertyValue('--primary'),
        primaryFg: root.style.getPropertyValue('--primary-foreground'),
        accent: root.style.getPropertyValue('--accent'),
        ring: root.style.getPropertyValue('--ring'),
        textPrimary: root.style.getPropertyValue('--text-primary'),
        textSecondary: root.style.getPropertyValue('--text-secondary'),
        foreground: root.style.getPropertyValue('--foreground'),
        mutedForeground: root.style.getPropertyValue('--muted-foreground'),
        dark: root.classList.contains('dark'),
      };
    }

    const hexToHsl = (hex: string) => {
      if (!hex || !hex.startsWith('#') || (hex.length !== 7 && hex.length !== 4)) return '262 83% 58%';
      const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
      const r = parseInt(full.slice(1, 3), 16) / 255;
      const g = parseInt(full.slice(3, 5), 16) / 255;
      const b = parseInt(full.slice(5, 7), 16) / 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) { case r: h = (g - b) / d + (g < b ? 6 : 0); break; case g: h = (b - r) / d + 2; break; case b: h = (r - g) / d + 4; break; }
        h /= 6;
      }
      return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
    };

    const primaryHsl = hexToHsl(design.primaryColor || '#8b5cf6');
    const storedPrimary = (() => { try { return localStorage.getItem('primaryTextColor') || undefined; } catch { return undefined; } })();
    const storedSecondary = (() => { try { return localStorage.getItem('secondaryTextColor') || undefined; } catch { return undefined; } })();
    const primaryHex = design.textColor || storedPrimary || '#111827';
    const secondaryHex = storedSecondary || design.textColor || storedPrimary || '#6b7280';
    const textPrimaryHsl = hexToHsl(primaryHex);
    const textSecondaryHsl = hexToHsl(secondaryHex);
    root.style.setProperty('--primary', primaryHsl, 'important');
    root.style.setProperty('--primary-foreground', '210 40% 98%', 'important');
    root.style.setProperty('--accent', primaryHsl, 'important');
    root.style.setProperty('--ring', primaryHsl, 'important');
    root.style.setProperty('--text-primary', textPrimaryHsl, 'important');
    root.style.setProperty('--text-secondary', textSecondaryHsl, 'important');
    // Ensure Tailwind text utilities also reflect the chosen text color
    root.style.setProperty('--foreground', textPrimaryHsl, 'important');
    root.style.setProperty('--muted-foreground', textSecondaryHsl, 'important');

    return () => {
      const original = originalThemeRef.current;
      if (!original) return;
      if (original.primary) root.style.setProperty('--primary', original.primary);
      if (original.primaryFg) root.style.setProperty('--primary-foreground', original.primaryFg);
      if (original.accent) root.style.setProperty('--accent', original.accent);
      if (original.ring) root.style.setProperty('--ring', original.ring);
      if (original.textPrimary) root.style.setProperty('--text-primary', original.textPrimary);
      if (original.textSecondary) root.style.setProperty('--text-secondary', original.textSecondary);
      if (original.foreground) root.style.setProperty('--foreground', original.foreground);
      if (original.mutedForeground) root.style.setProperty('--muted-foreground', original.mutedForeground);
      if (original.dark) root.classList.add('dark'); else root.classList.remove('dark');
    };
  }, [design]);

  const isClientUser = user?.role === 'client' || user?.role === 'customer';
  const shouldShowRegister = false;

  const pageBackgroundStyle: React.CSSProperties = design?.backgroundImage
    ? { backgroundImage: `url(${design.backgroundImage})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : {};

  // Extract a dominant color from the background image (hue histogram, saturation-weighted)
  useEffect(() => {
    if (!design?.backgroundImage) return;

    const toHsl = (r: number, g: number, b: number) => {
      r /= 255; g /= 255; b /= 255;
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      let h = 0, s = 0, l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return { h, s, l } as const; // h [0,1], s [0,1], l [0,1]
    };

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 64; canvas.height = 64; // small sample, more accurate than 32
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;

        const bins = 36; // 10-degree bins
        const counts = new Array(bins).fill(0);
        const sumR = new Array(bins).fill(0);
        const sumG = new Array(bins).fill(0);
        const sumB = new Array(bins).fill(0);

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue; // skip transparent

          // Ignore near-black and near-white pixels
          const maxc = Math.max(r, g, b), minc = Math.min(r, g, b);
          if (maxc < 24 || minc > 232) continue;

          const { h, s, l } = toHsl(r, g, b);
          // Filter very low saturation or too dark/bright which are not helpful for overlays
          if (s < 0.25 || l < 0.18 || l > 0.82) continue;

          const bin = Math.floor(h * bins) % bins;
          const weight = s * s; // emphasize vivid colors
          counts[bin] += weight;
          sumR[bin] += r * weight;
          sumG[bin] += g * weight;
          sumB[bin] += b * weight;
        }

        let best = 0;
        for (let i = 1; i < bins; i++) if (counts[i] > counts[best]) best = i;

        if (counts[best] > 0) {
          const r = Math.round(sumR[best] / counts[best]);
          const g = Math.round(sumG[best] / counts[best]);
          const b = Math.round(sumB[best] / counts[best]);
          setOverlayColor(`rgba(${r}, ${g}, ${b}, 0.86)`);
        } else {
          // Fallback: slightly tinted white
          setOverlayColor('rgba(255,255,255,0.90)');
        }
      } catch {
        setOverlayColor('rgba(255,255,255,0.90)');
      }
    };
    img.src = design.backgroundImage;
  }, [design?.backgroundImage]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col" style={pageBackgroundStyle}>
      {/* Header with sign-out option */}
      {user && (
        <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <BusinessBrand size="sm" />
              <div className="flex items-center gap-2 sm:gap-3">
                <span className="hidden sm:inline text-sm text-gray-600 dark:text-gray-400">
                  Welcome, <span className="font-medium">{user.firstName} {user.lastName}</span>
                </span>
                <span className="sm:hidden text-sm text-gray-600 dark:text-gray-400 font-medium">
                  {user.firstName}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={clientLogout}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Sign Out</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="flex-1 w-full mx-auto py-6 sm:py-10 px-4 sm:px-6 lg:px-8">
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
          <div className="max-w-5xl mx-auto w-full">
            {design?.showTabs !== false ? (
              <Tabs defaultValue="book" className="w-full">
                <TabsList className="flex flex-nowrap justify-between gap-2 overflow-x-auto whitespace-nowrap backdrop-blur-sm border border-white/20 dark:border-white/10 h-auto px-2" style={{ backgroundColor: overlayColor }}>
                  <TabsTrigger value="about" className="flex-1 text-xs sm:text-sm py-2 text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:bg-foreground/10">About</TabsTrigger>
                  <TabsTrigger value="services" className="flex-1 text-xs sm:text-sm py-2 text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:bg-foreground/10">Services</TabsTrigger>
                  <TabsTrigger value="contact" className="flex-1 text-xs sm:text-sm py-2 text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:bg-foreground/10">Contact</TabsTrigger>
                  <TabsTrigger value="book" className="flex-1 text-xs sm:text-sm py-2 text-foreground bg-transparent data-[state=active]:bg-transparent data-[state=active]:shadow-none hover:bg-foreground/10">Book</TabsTrigger>
                </TabsList>
                <TabsContent value="about">
                  <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg p-6 border">
                    <h3 className="text-xl font-semibold mb-2">{design?.businessName || 'About Us'}</h3>
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{design?.aboutContent || 'Tell your story here.'}</div>
                  </div>
                </TabsContent>
                <TabsContent value="services">
                  <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg p-6 border">
                    <h3 className="text-xl font-semibold mb-2">Our Services</h3>
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap">{design?.servicesContent || 'Describe your services here.'}</div>
                  </div>
                </TabsContent>
                <TabsContent value="contact">
                  <div className="bg-white/80 dark:bg-gray-900/80 rounded-lg p-6 border space-y-2">
                    <h3 className="text-xl font-semibold mb-2">Contact</h3>
                    {design?.businessPhone && <p><strong>Phone:</strong> {design.businessPhone}</p>}
                    {design?.businessEmail && <p><strong>Email:</strong> {design.businessEmail}</p>}
                    {design?.businessAddress && <p><strong>Address:</strong> {design.businessAddress}</p>}
                    {design?.businessWebsite && <p><strong>Website:</strong> <a className="text-primary underline" href={design.businessWebsite} target="_blank" rel="noreferrer">{design.businessWebsite}</a></p>}
                    <div className="prose dark:prose-invert max-w-none whitespace-pre-wrap mt-2">{design?.contactContent || ''}</div>
                  </div>
                </TabsContent>
                <TabsContent value="book">
                  <div className="text-center mb-4 sm:mb-8 hidden sm:block">
                    <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2 sm:mb-4">
                      Book Your Appointment
                    </h2>
                    <p className="max-w-2xl mx-auto text-sm sm:text-base text-foreground px-2 sm:px-0">
                      Select from our wide range of services and choose a time that works for you.
                    </p>
                  </div>
                  <BookingWidget 
                    open={isBookingOpen} 
                    onOpenChange={handleOpenChange}
                    userId={user?.id}
                    overlayColor={overlayColor}
                  />
                </TabsContent>
              </Tabs>
            ) : (
              <>
                <div className="text-center mb-4 sm:mb-8 hidden sm:block">
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-2 sm:mb-4">
                    Book Your Appointment
                  </h2>
                  <p className="max-w-2xl mx-auto text-sm sm:text-base text-foreground px-2 sm:px-0">
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
          </div>
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