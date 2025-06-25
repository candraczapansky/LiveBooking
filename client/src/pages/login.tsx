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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-3 py-6">
      <Card className="w-full max-w-sm mx-auto border-0 shadow-lg">
        <CardHeader className="text-center pb-6 px-6">
          <div className="flex justify-center mb-6">
            <div className="bg-primary/10 p-4 rounded-full">
              <Scissors className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-4xl font-bold mb-2">BeautyBook</CardTitle>
          <CardDescription className="text-lg text-gray-600 dark:text-gray-400">
            Salon & Spa Management Platform
          </CardDescription>
        </CardHeader>
        <CardContent className="px-6 pb-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2 mb-8 h-16 bg-gray-100 dark:bg-gray-800 rounded-xl p-2">
              <TabsTrigger 
                value="login" 
                className="text-lg font-bold rounded-lg h-12 flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200"
              >
                Login
              </TabsTrigger>
              <TabsTrigger 
                value="register" 
                className="text-lg font-bold rounded-lg h-12 flex-1 data-[state=active]:bg-white data-[state=active]:shadow-md data-[state=active]:text-primary transition-all duration-200"
              >
                Register
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="login" className="mt-0">
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-6" noValidate>
                  <FormField
                    control={loginForm.control}
                    name="username"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-lg font-semibold text-gray-700 dark:text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input 
                            placeholder="Enter your username" 
                            className="h-14 text-lg px-4 border-2 rounded-xl focus:ring-2 focus:ring-primary/20" 
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
                        <FormLabel>Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full h-14 text-lg font-bold mt-8 rounded-xl shadow-lg" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
            
            <TabsContent value="register" className="mt-0">
              <Form {...registerForm}>
                <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-5" noValidate>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={registerForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-base font-semibold text-gray-700 dark:text-gray-300">First Name</FormLabel>
                          <FormControl>
                            <Input placeholder="John" className="h-12 text-base px-3 border-2 rounded-lg focus:ring-2 focus:ring-primary/20" {...field} />
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
                          <FormLabel className="text-base font-semibold text-gray-700 dark:text-gray-300">Last Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Doe" className="h-12 text-base px-3 border-2 rounded-lg focus:ring-2 focus:ring-primary/20" {...field} />
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
                        <FormLabel className="text-base font-semibold text-gray-700 dark:text-gray-300">Username</FormLabel>
                        <FormControl>
                          <Input placeholder="johndoe" className="h-12 text-base px-3 border-2 rounded-lg focus:ring-2 focus:ring-primary/20" {...field} />
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
                        <FormLabel className="text-base font-semibold text-gray-700 dark:text-gray-300">Email</FormLabel>
                        <FormControl>
                          <Input 
                            type="text" 
                            placeholder="Enter email address" 
                            className="h-12 text-base px-3 border-2 rounded-lg focus:ring-2 focus:ring-primary/20"
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
                        <FormLabel className="text-base font-semibold text-gray-700 dark:text-gray-300">Password</FormLabel>
                        <FormControl>
                          <Input type="password" placeholder="••••••" className="h-12 text-base px-3 border-2 rounded-lg focus:ring-2 focus:ring-primary/20" {...field} />
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
                        <FormLabel className="text-base font-semibold text-gray-700 dark:text-gray-300">Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="(123) 456-7890" className="h-12 text-base px-3 border-2 rounded-lg focus:ring-2 focus:ring-primary/20" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <Button type="submit" className="w-full h-14 text-lg font-bold mt-6 rounded-xl shadow-lg" disabled={isLoading}>
                    {isLoading ? "Registering..." : "Register"}
                  </Button>
                </form>
              </Form>
            </TabsContent>
          </Tabs>
        </CardContent>
        <CardFooter className="px-6 pb-8 pt-6">
          <Button 
            variant="outline" 
            className="w-full h-14 text-lg font-semibold rounded-xl border-2" 
            onClick={() => navigate("/booking")}
          >
            Continue as Guest to Book Appointment
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default Login;
