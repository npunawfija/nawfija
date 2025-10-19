import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/hooks/useAuth';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthFormData {
  email: string;
  password: string;
  confirmPassword?: string;
  firstName?: string;
  lastName?: string;
}

const Auth = () => {
  const [searchParams] = useSearchParams();
  const [mode, setMode] = useState<'signin' | 'signup' | 'reset' | 'admin'>(
    (searchParams.get('mode') as 'signin' | 'signup' | 'reset' | 'admin') || 'signin'
  );
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const { signIn, signUp, resetPassword, user, loading } = useAuth();
  const navigate = useNavigate();

  const { register, handleSubmit, formState: { errors, isSubmitting }, watch, reset } = useForm<AuthFormData>();
  const [adminStep, setAdminStep] = useState<'request' | 'verify'>('request');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminCode, setAdminCode] = useState('');


  // Redirect if already authenticated
  useEffect(() => {
    if (user && !loading) {
      if (mode === 'admin') {
        navigate('/admin');
      } else {
        navigate('/');
      }
    }
  }, [user, loading, navigate, mode]);

  const onSubmit = async (data: AuthFormData) => {
    try {
      // Admin 2FA flow
      if (mode === 'admin') {
        if (adminStep === 'request') {
          try {
            // Ensure this email belongs to an admin or super_user before sending code
            const { data: isAdminEmail, error: adminCheckError } = await supabase
              .rpc('is_admin_email', { p_email: data.email });
            
            if (adminCheckError) {
              console.error('Admin check error:', adminCheckError);
              throw new Error('Failed to verify admin status. Please try again.');
            }
            
            if (!isAdminEmail) {
              toast({
                title: 'Access denied',
                description: 'This email is not associated with an admin account.',
                variant: 'destructive',
              });
              return;
            }

            const { error } = await supabase.auth.signInWithOtp({
              email: data.email,
              options: { shouldCreateUser: false },
            });
            
            if (error) {
              console.error('OTP send error:', error);
              if (error.message.includes('rate limit')) {
                throw new Error('Too many requests. Please wait a moment before trying again.');
              }
              throw new Error('Failed to send verification code. Please try again.');
            }

            setAdminEmail(data.email);
            setAdminStep('verify');
            toast({ title: 'Verification code sent', description: 'Check your email for a 6-digit code.' });
          } catch (error: any) {
            console.error('Admin request error:', error);
            toast({
              title: 'Admin verification failed',
              description: error.message || 'Failed to process admin verification request.',
              variant: 'destructive',
            });
          }
        } else {
          try {
            const { error } = await supabase.auth.verifyOtp({
              email: adminEmail,
              token: adminCode,
              type: 'email',
            });
            
            if (error) {
              console.error('OTP verify error:', error);
              if (error.message.includes('invalid') || error.message.includes('expired')) {
                throw new Error('Invalid or expired verification code. Please request a new one.');
              }
              throw new Error('Verification failed. Please check your code and try again.');
            }

            // Confirm role after verification
            const { data: me, error: userError } = await supabase.auth.getUser();
            if (userError) {
              console.error('Get user error:', userError);
              throw new Error('Failed to verify user session.');
            }

            const authId = me?.user?.id;
            if (!authId) {
              throw new Error('User session is invalid.');
            }

            const { data: userRow, error: roleError } = await supabase
              .from('users')
              .select('role')
              .eq('auth_id', authId)
              .maybeSingle();

            if (roleError) {
              console.error('Role check error:', roleError);
              throw new Error('Failed to verify admin permissions.');
            }

            if (!userRow || (userRow.role !== 'admin' && userRow.role !== 'super_user')) {
              toast({ 
                title: 'Access denied', 
                description: 'Account is not an admin.', 
                variant: 'destructive' 
              });
              await supabase.auth.signOut();
              return;
            }

            toast({ title: '2FA verified', description: 'Welcome to the admin dashboard.' });
            navigate('/admin');
            reset();
          } catch (error: any) {
            console.error('Admin verify error:', error);
            toast({
              title: 'Verification failed',
              description: error.message || 'Failed to verify admin code.',
              variant: 'destructive',
            });
            // Reset admin step on verification failure
            setAdminStep('request');
            setAdminCode('');
          }
        }
        return;
      }

      // Regular auth flows
      let result;
      try {
        if (mode === 'signup') {
          if (data.password !== data.confirmPassword) {
            toast({
              title: 'Password mismatch',
              description: 'Passwords do not match. Please check and try again.',
              variant: 'destructive',
            });
            return;
          }
          result = await signUp(data.email, data.password, {
            firstName: data.firstName,
            lastName: data.lastName,
          });
        } else if (mode === 'signin') {
          result = await signIn(data.email, data.password);
        } else if (mode === 'reset') {
          result = await resetPassword(data.email);
        }

        // Handle auth operation results
        if (result?.error) {
          console.error('Auth operation error:', result.error);
          
          // Handle specific error types
          let errorMessage = 'An unexpected error occurred. Please try again.';
          
          if (result.error.message.includes('Invalid login credentials')) {
            errorMessage = 'Invalid email or password. Please check your credentials.';
          } else if (result.error.message.includes('Email not confirmed')) {
            errorMessage = 'Please check your email and click the confirmation link before signing in.';
          } else if (result.error.message.includes('User already registered')) {
            errorMessage = 'An account with this email already exists. Please sign in instead.';
          } else if (result.error.message.includes('Password should be at least')) {
            errorMessage = 'Password must be at least 6 characters long.';
          } else if (result.error.message.includes('rate limit')) {
            errorMessage = 'Too many attempts. Please wait a moment before trying again.';
          } else if (result.error.message.includes('network')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          }
          
          toast({
            title: `${mode === 'signup' ? 'Sign up' : mode === 'signin' ? 'Sign in' : 'Password reset'} failed`,
            description: errorMessage,
            variant: 'destructive',
          });
          return;
        }

        // Success handling
        if (mode === 'signup') {
          toast({
            title: 'Account created successfully!',
            description: 'Please check your email to verify your account before signing in.',
          });
          setMode('signin');
        } else if (mode === 'signin') {
          navigate('/');
        } else if (mode === 'reset') {
          toast({
            title: 'Password reset email sent',
            description: 'Check your email for instructions to reset your password.',
          });
          setMode('signin');
        }
        reset();
      } catch (authError: any) {
        console.error('Auth flow error:', authError);
        toast({
          title: 'Authentication error',
          description: authError.message || 'Failed to process authentication request.',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Unexpected auth error:', error);
      toast({ 
        title: 'Unexpected error', 
        description: 'Something went wrong. Please try again or contact support if the issue persists.', 
        variant: 'destructive' 
      });
    }
  };

  const switchMode = (newMode: 'signin' | 'signup' | 'reset' | 'admin') => {
    setMode(newMode);
    reset();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-primary/5 via-background to-accent/5">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Link>
          <div className="flex justify-center mb-6">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary-glow text-primary-foreground font-bold text-xl">
              N
            </div>
          </div>
        </div>

        <Card className="shadow-lg border-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">
              {mode === 'signin' && 'Welcome Back'}
              {mode === 'signup' && 'Join Nawfija Community'}
              {mode === 'reset' && 'Reset Password'}
              {mode === 'admin' && 'Admin Sign In'}
            </CardTitle>
            <CardDescription>
              {mode === 'signin' && 'Sign in to your account to continue'}
              {mode === 'signup' && 'Create your account to get started'}
              {mode === 'reset' && 'Enter your email to reset your password'}
              {mode === 'admin' && 'Admin 2FA: Enter your email to receive a verification code'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {mode === 'signup' && (
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">First Name</Label>
                    <Input
                      id="firstName"
                      {...register('firstName', { required: mode === 'signup' })}
                      placeholder="John"
                    />
                    {errors.firstName && (
                      <p className="text-sm text-destructive">First name is required</p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Last Name</Label>
                    <Input
                      id="lastName"
                      {...register('lastName', { required: mode === 'signup' })}
                      placeholder="Doe"
                    />
                    {errors.lastName && (
                      <p className="text-sm text-destructive">Last name is required</p>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...register('email', { 
                    required: 'Email is required',
                    pattern: {
                      value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                      message: 'Invalid email address'
                    }
                  })}
                  placeholder="john@example.com"
                />
                {errors.email && (
                  <p className="text-sm text-destructive">{errors.email.message}</p>
                )}
                {mode === 'admin' && adminStep === 'request' && (
                  <p className="text-xs text-muted-foreground">We'll email a 6-digit verification code to this address.</p>
                )}
              </div>

              {mode === 'admin' && adminStep === 'verify' && (
                <div className="space-y-2">
                  <Label htmlFor="adminCode">Verification Code</Label>
                  <Input
                    id="adminCode"
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                    placeholder="Enter 6-digit code"
                  />
                  <p className="text-xs text-muted-foreground">Code sent to {adminEmail}. Check your inbox and spam folder.</p>
                </div>
              )}

              {(mode === 'signin' || mode === 'signup') && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      {...register('password', { 
                        required: 'Password is required',
                        minLength: {
                          value: 6,
                          message: 'Password must be at least 6 characters'
                        }
                      })}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.password && (
                    <p className="text-sm text-destructive">{errors.password.message}</p>
                  )}
                </div>
              )}

              {mode === 'signup' && (
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      {...register('confirmPassword', { 
                        required: 'Please confirm your password',
                        validate: (value) => value === watch('password') || 'Passwords do not match'
                      })}
                      placeholder="••••••••"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
                  )}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <div className="flex items-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    {mode === 'signin' && 'Sign In'}
                    {mode === 'signup' && 'Create Account'}
                    {mode === 'reset' && 'Send Reset Email'}
                    {mode === 'admin' && 'Sign In as Admin'}
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6">
              <Separator />
              <div className="mt-6 text-center text-sm">
                {mode === 'signin' && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Don't have an account?{' '}
                      <button
                        onClick={() => switchMode('signup')}
                        className="text-primary hover:underline font-medium"
                      >
                        Sign up
                      </button>
                    </p>
                    <p className="text-muted-foreground">
                      Forgot your password?{' '}
                      <button
                        onClick={() => switchMode('reset')}
                        className="text-primary hover:underline font-medium"
                      >
                        Reset it
                      </button>
                    </p>
                    <p className="text-muted-foreground">
                      Administrator?{' '}
                      <button
                        onClick={() => switchMode('admin')}
                        className="text-primary hover:underline font-medium"
                      >
                        Admin Sign In
                      </button>
                    </p>
                  </div>
                )}
                {mode === 'admin' && (
                  <div className="space-y-2">
                    <p className="text-muted-foreground">
                      Regular user?{' '}
                      <button
                        onClick={() => switchMode('signin')}
                        className="text-primary hover:underline font-medium"
                      >
                        User Sign In
                      </button>
                    </p>
                    <p className="text-muted-foreground">
                      Forgot your password?{' '}
                      <button
                        onClick={() => switchMode('reset')}
                        className="text-primary hover:underline font-medium"
                      >
                        Reset it
                      </button>
                    </p>
                  </div>
                )}
                {mode === 'signup' && (
                  <p className="text-muted-foreground">
                    Already have an account?{' '}
                    <button
                      onClick={() => switchMode('signin')}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                )}
                {mode === 'reset' && (
                  <p className="text-muted-foreground">
                    Remember your password?{' '}
                    <button
                      onClick={() => switchMode('signin')}
                      className="text-primary hover:underline font-medium"
                    >
                      Sign in
                    </button>
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Auth;