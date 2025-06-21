import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Mail, Lock, Building2, AlertCircle, Monitor, Loader2, LogIn, Shield, Users, BarChart3 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useLocation } from 'wouter';
import { loginFormSchema, type LoginFormData } from '@/lib/validation';

export default function Login() {
  const { user, isLoading, isAuthenticated } = useAuth();
  const [location, setLocation] = useLocation();
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginFormSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false
    }
  });

  const rememberMe = watch('rememberMe');

  // Redirect if already authenticated
  if (isAuthenticated && location !== '/') {
    setLocation('/');
    return null;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  const handleEmailPasswordLogin = async (data: LoginFormData) => {
    setIsSubmitting(true);
    setLoginError(null);

    try {
      // Make API call to login endpoint
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: data.email,
          password: data.password,
          rememberMe: data.rememberMe,
        }),
      });

      if (response.ok) {
        // Successful login - redirect to main app
        window.location.href = '/';
      } else {
        const errorData = await response.json();
        setLoginError(errorData.message || 'Login failed. Please check your credentials and try again.');
      }
    } catch (error) {
      setLoginError('Network error. Please check your connection and try again.');
      console.error('Login error:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMicrosoftLogin = () => {
    setIsSubmitting(true);
    setLoginError(null);
    
    // Redirect to Replit Auth Microsoft integration
    window.location.href = '/api/login';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-accent/5 flex">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          {/* Header */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center mb-4">
              <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
            </div>
            <h1 className="text-3xl font-bold">Zero Gate</h1>
            <p className="text-muted-foreground">
              ESO Platform - Sign in to continue
            </p>
          </div>

          <Card>
            <CardHeader className="space-y-1">
              <CardTitle className="text-2xl text-center">Sign In</CardTitle>
              <CardDescription className="text-center">
                Access your organization's ESO platform
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* OAuth Login */}
              <div className="space-y-3">
                <Button
                  onClick={handleMicrosoftLogin}
                  variant="outline"
                  className="w-full h-11 text-sm font-medium border-blue-200 hover:bg-blue-50 dark:border-blue-800 dark:hover:bg-blue-950"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Monitor className="mr-2 h-4 w-4 text-blue-600" />
                  )}
                  Continue with Microsoft 365
                </Button>
                <p className="text-xs text-center text-muted-foreground">
                  Recommended for organizational accounts
                </p>
              </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">
                  Or continue with email
                </span>
              </div>
            </div>

            {/* Email/Password Form */}
            <form onSubmit={handleSubmit(handleEmailPasswordLogin)} className="space-y-4">
              {loginError && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    className="pl-10"
                    {...register('email')}
                    disabled={isSubmitting}
                  />
                </div>
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="pl-10 pr-10"
                    {...register('password')}
                    disabled={isSubmitting}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 px-0"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isSubmitting}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                </div>
                {errors.password && (
                  <p className="text-sm text-destructive">{errors.password.message}</p>
                )}
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="rememberMe"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setValue('rememberMe', !!checked)}
                  disabled={isSubmitting}
                />
                <Label
                  htmlFor="rememberMe"
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                >
                  Remember me for 30 days
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full h-11"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Signing In...
                  </>
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>

              {/* Help Links */}
              <div className="text-center space-y-2">
                <Button variant="link" className="text-sm text-muted-foreground p-0 h-auto">
                  Forgot your password?
                </Button>
                <div className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Button variant="link" className="p-0 h-auto font-medium">
                    Contact your administrator
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Footer */}
          <div className="text-center text-xs text-muted-foreground">
            <p>
              By signing in, you agree to our{' '}
              <Button variant="link" className="p-0 h-auto text-xs underline">
                Terms of Service
              </Button>{' '}
              and{' '}
              <Button variant="link" className="p-0 h-auto text-xs underline">
                Privacy Policy
              </Button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Platform Features */}
      <div className="hidden lg:flex lg:flex-1 bg-gradient-to-br from-primary/5 via-primary/10 to-accent/20 p-8 items-center justify-center">
        <div className="max-w-md space-y-6">
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">
              Welcome to Zero Gate
            </h2>
            <p className="text-muted-foreground">
              The comprehensive platform for Entrepreneur Support Organizations
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Multi-Tenant Management</h3>
                <p className="text-sm text-muted-foreground">
                  Secure organization isolation with role-based access control
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <BarChart3 className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Hybrid Relationship Mapping</h3>
                <p className="text-sm text-muted-foreground">
                  Seven-degree path discovery with geographic visualization
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Shield className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Grant Timeline Management</h3>
                <p className="text-sm text-muted-foreground">
                  Backwards planning with 90/60/30-day milestone tracking
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                <Monitor className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-medium">Microsoft 365 Integration</h3>
                <p className="text-sm text-muted-foreground">
                  Seamless organizational data access and analysis
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pt-4">
            <Badge variant="secondary" className="text-xs">
              Enterprise Ready
            </Badge>
            <Badge variant="secondary" className="text-xs">
              SOC 2 Compliant
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Real-time Analytics
            </Badge>
          </div>
        </div>
      </div>
    </div>
  );
}