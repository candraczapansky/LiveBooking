import { useContext, useState } from "react";
import { useLocation } from "wouter";
import { AuthContext } from "@/contexts/AuthProvider";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { BusinessBrand } from "@/components/BusinessBrand";
import { generateUsername, suggestUsernames } from "@/utils/username-generator";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


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
  useDocumentTitle("Login | Glo Head Spa");
  const [, navigate] = useLocation();
  const authContext = useContext(AuthContext);
  
  console.log("Login component - authContext:", authContext);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("login");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [usernameSuggestions, setUsernameSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);


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
    setLoginError(null); // Clear previous error
    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setLoginError(errorData.error || "Login failed");
        throw new Error(errorData.error || "Login failed");
      }

      const userData = await response.json();
      
      // Use the auth context login function which will handle color preferences
      // The backend returns { success: true, user: {...}, token: "..." } so we need to extract the user object and token
      if (userData.success && userData.user) {
        authContext.login(userData.user as any, userData.token);
      } else {
        throw new Error("Invalid response format from server");
      }
      
      // Navigate after login
      const params = new URLSearchParams(window.location.search);
      const redirect = params.get('redirect');
      const target = redirect && redirect.startsWith('/booking') ? redirect : '/dashboard';
      try {
        window.location.assign(target);
      } catch {
        navigate(target);
      }
      
    } catch (error: any) {
      console.error("Login error:", error);
      // loginError is already set above if response is not ok
      if (!loginError) setLoginError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };



  const handleRegister = async (values: RegisterValues) => {
    setIsLoading(true);
    setRegisterError(null); // Clear previous error
    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.log("Registration error response:", errorData);
        
        // Provide more specific error messages based on the error type
        let errorMessage = "Registration failed";
        if (errorData.message) {
          if (errorData.message.includes("Username already exists")) {
            errorMessage = "This username is already taken. Please choose a different username.";
            // Generate suggestions when username conflict occurs
            const suggestions = await suggestUsernames(values.firstName, values.lastName);
            setUsernameSuggestions(suggestions);
            setShowSuggestions(true);
          } else if (errorData.message.includes("Email already exists")) {
            errorMessage = "This email address is already registered. Please use a different email or try logging in.";
          } else {
            errorMessage = errorData.message;
          }
        } else if (errorData.error) {
          errorMessage = errorData.error;
        }
        
        setRegisterError(errorMessage);
        throw new Error(errorMessage);
      }

      const userData = await response.json();
      
      // Switch to login tab
      setActiveTab("login");
      loginForm.setValue("username", values.username);
    } catch (error: any) {
      console.error("Registration error:", error);
      // registerError is already set above if response is not ok
      if (!registerError) setRegisterError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Auto-generate username when first and last name change
  const handleNameChange = async (firstName: string, lastName: string) => {
    if (firstName && lastName) {
      const generatedUsername = generateUsername(firstName, lastName);
      registerForm.setValue("username", generatedUsername);
      
      // Generate suggestions
      const suggestions = await suggestUsernames(firstName, lastName);
      setUsernameSuggestions(suggestions);
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm mx-auto">
        <div className="w-full">
        <div className="text-center pb-4 px-8">
          <div className="flex justify-center mb-4">
            <div className="transform scale-[3]">
              <BusinessBrand size="xl" showLogo={true} showName={false} />
            </div>
          </div>
        </div>
        <div className="px-6 pb-8">
            <div className="flex w-full mb-8 h-7 bg-gray-100 dark:bg-gray-800 rounded-lg p-0.5 gap-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("login")}
                className={`flex-1 h-6 rounded text-sm font-medium transition-all duration-200 ${
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
                className={`flex-1 h-6 rounded text-sm font-medium transition-all duration-200 ${
                  activeTab === "register" 
                    ? "bg-white shadow-sm text-primary" 
                    : "text-gray-600 hover:text-gray-800"
                }`}
              >
                Register
              </button>
            </div>
            
            {activeTab === "login" && (
              <>
                {loginError && (
                  <div className="mb-4 text-center text-sm text-red-600 dark:text-red-400 font-medium">
                    {loginError}
                  </div>
                )}
                <Form {...loginForm}>
                  <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-5" noValidate>
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
                    
                    <Button type="submit" className="w-full h-11 text-sm font-medium mt-6 rounded-md" disabled={isLoading}>
                      {isLoading ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                </Form>
                
                <div className="mt-4 text-center space-y-2">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Forgot your password?
                  </div>
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/forgot-password")}
                      className="text-xs text-primary hover:text-primary/80 h-8"
                      type="button"
                    >
                      Reset via Email
                    </Button>
                    <Button
                      variant="ghost"
                      onClick={() => navigate("/forgot-password-sms")}
                      className="text-xs text-primary hover:text-primary/80 h-8"
                      type="button"
                    >
                      Reset via SMS
                    </Button>
                  </div>
                </div>
              </>
            )}
            
            {activeTab === "register" && (
              <>
                {registerError && (
                  <div className="mb-4 text-center text-sm text-red-600 dark:text-red-400 font-medium">
                    {registerError}
                  </div>
                )}
                <Form {...registerForm}>
                  <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4" noValidate>
                    <div className="grid grid-cols-2 gap-2">
                      <FormField
                        control={registerForm.control}
                        name="firstName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel className="text-xs font-medium text-gray-700 dark:text-gray-300">First Name</FormLabel>
                            <FormControl>
                              <Input 
                                placeholder="John" 
                                className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const firstName = e.target.value;
                                  const lastName = registerForm.getValues("lastName");
                                  if (firstName && lastName) {
                                    handleNameChange(firstName, lastName);
                                  }
                                }}
                              />
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
                              <Input 
                                placeholder="Doe" 
                                className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  const lastName = e.target.value;
                                  const firstName = registerForm.getValues("firstName");
                                  if (firstName && lastName) {
                                    handleNameChange(firstName, lastName);
                                  }
                                }}
                              />
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
                            <div className="relative">
                              <Input 
                                placeholder="johndoe" 
                                className="h-9 text-sm px-2 rounded border border-gray-300 focus:border-primary focus:shadow-[0_0_0_2px_rgba(236,72,153,0.1)] focus:outline-none transition-all" 
                                {...field} 
                              />
                              {usernameSuggestions.length > 0 && showSuggestions && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-10">
                                  <div className="p-2 text-xs text-gray-500 border-b">Suggested usernames:</div>
                                  {usernameSuggestions.map((suggestion, index) => (
                                    <button
                                      key={index}
                                      type="button"
                                      className="w-full text-left px-2 py-1 text-sm hover:bg-gray-100 block"
                                      onClick={() => {
                                        registerForm.setValue("username", suggestion);
                                        setShowSuggestions(false);
                                      }}
                                    >
                                      {suggestion}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
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
                    
                    <Button type="submit" className="w-full h-11 text-sm font-medium mt-6 rounded-md" disabled={isLoading}>
                      {isLoading ? "Registering..." : "Register"}
                    </Button>
                  </form>
                </Form>
              </>
            )}
        </div>
        </div>


      </div>
    </div>
  );
};

export default Login;
