import { useContext, useState } from "react";
import { useLocation } from "wouter";
import { AuthContext } from "@/App";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Scissors } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

// Login schema
const loginSchema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

// Registration schema
const registerSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  email: z.string(),
  password: z.string().min(6, "Password must be at least 6 characters"),
  firstName: z.string().min(1, "First name is required"),
  lastName: z.string().min(1, "Last name is required"),
  phone: z.string().optional(),
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

const Login = () => {
  useDocumentTitle("Login | BeautyBook");
  const [, navigate] = useLocation();
  const { login } = useContext(AuthContext);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");

  // Login form
  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      username: "",
      password: "",
    },
  });

  // Register form
  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      username: "",
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
    },
  });

  const handleLogin = async (values: LoginValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Login failed");
      }

      const userData = await response.json();
      console.log("Login successful, user data:", userData);
      
      // Store user data in localStorage (simpler than context for now)
      localStorage.setItem('user', JSON.stringify(userData));
      
      // Show success toast
      toast({
        title: "Login Successful",
        description: "Welcome back to BeautyBook!",
      });
      
      // Force redirect to dashboard page (bypassing router)
      document.location.href = "/dashboard";
      
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        title: "Login Failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegister = async (values: RegisterValues) => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Registration failed");
      }

      const userData = await response.json();
      
      toast({
        title: "Registration Successful",
        description: "Your account has been created. You can now log in.",
      });
      
      // Switch to login tab
      setActiveTab("login");
      loginForm.setValue("username", values.username);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.message || "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-8 py-8">
      <div className="w-full max-w-md mx-auto">
        <Card className="w-full shadow-lg border-0 m-4">
        <CardHeader className="text-center pb-4 px-8">
          <div className="flex justify-center mb-4">
            <div className="bg-primary/10 p-3 rounded-full">
              <Scissors className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl font-bold mb-2">BeautyBook</CardTitle>
          <CardDescription className="text-base text-gray-600 dark:text-gray-400">
            Salon & Spa Management Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="px-8 pb-2 m-2">
            <div className="flex w-full mb-4 h-9 bg-gray-100 dark:bg-gray-800 rounded-md p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`flex-1 h-8 rounded text-sm font-medium transition-all duration-200 ${
                  activeTab === "login" 
                    ? "bg-white shadow-sm text-primary" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("register")}
                className={`flex-1 h-8 rounded text-sm font-medium transition-all duration-200 ${
                  activeTab === "register" 
                    ? "bg-white shadow-sm text-primary" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Register
              </button>
            </div>
            
            {activeTab === "login" && (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" noValidate>
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username" 
                            className="h-10 text-sm px-3 rounded-md border border-gray-300 focus:border-primary focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)] focus:outline-none transition-all" 
                            {...field} 
                          />
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
                        <FormLabel className="text-sm font-medium text-gray-700 dark:text-gray-300">Password</FormLabel>
                        <FormControl>
                          <Input 
                            type="password" 
                            placeholder="••••••" 
                            className="h-10 text-sm px-3 rounded-md border border-gray-300 focus:border-primary focus:shadow-[0_0_0_3px_rgba(236,72,153,0.1)] focus:outline-none transition-all" 
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full h-10 text-sm font-medium mt-4 rounded-md" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>
            )}
            
            {activeTab === "register" && (
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-3" noValidate>
                  <div className="grid grid-cols-2 gap-2">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={registerForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={registerForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Enter email address" 
                            className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all"
                            autoComplete="off"
                            autoCorrect="off"
                            autoCapitalize="off"
                            spellCheck="false"
                            data-lpignore="true"
                            data-form-type="other"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={registerForm.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(123) 456-7890" className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full h-10 text-sm font-medium mt-3 rounded-md" disabled={isLoading}>
                    {isLoading ? "Registering..." : "Register"}
                  </Button>
                </form>
              </Form>
            )}
        </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
