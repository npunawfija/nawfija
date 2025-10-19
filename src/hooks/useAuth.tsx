import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, userData?: any) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string, userData?: any) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      // Construct the name from userData
      const name = userData?.firstName && userData?.lastName 
        ? `${userData.firstName} ${userData.lastName}`
        : userData?.firstName || userData?.lastName || '';
      
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: { ...userData, name }
        }
      });

      if (error) {
        console.error('Sign up error:', error);
        
        // Handle specific Supabase errors
        if (error.message.includes('User already registered')) {
          throw new Error('An account with this email already exists. Please sign in instead.');
        } else if (error.message.includes('Password should be at least')) {
          throw new Error('Password must be at least 6 characters long.');
        } else if (error.message.includes('Email address is invalid')) {
          throw new Error('Please enter a valid email address.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many signup attempts. Please wait a moment before trying again.');
        } else if (error.message.includes('Database error saving new user')) {
          throw new Error('Failed to create account. Please try again or contact support.');
        }
        
        throw error;
      }

      toast({
        title: "Sign up successful!",
        description: "Please check your email to verify your account.",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign up exception:', error);
      
      const errorMessage = error.message || 'Failed to create account. Please try again.';
      
      toast({
        title: "Sign up failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Sign in error:', error);
        
        // Handle specific Supabase errors
        if (error.message.includes('Invalid login credentials')) {
          throw new Error('Invalid email or password. Please check your credentials and try again.');
        } else if (error.message.includes('Email not confirmed')) {
          throw new Error('Please check your email and click the confirmation link before signing in.');
        } else if (error.message.includes('Too many requests')) {
          throw new Error('Too many sign-in attempts. Please wait a moment before trying again.');
        } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        
        throw error;
      }

      toast({
        title: "Welcome back!",
        description: "You have been signed in successfully.",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Sign in exception:', error);
      
      const errorMessage = error.message || 'Sign in failed. Please try again.';
      
      toast({
        title: "Sign in failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Check if a session exists first to avoid noisy 'session_not_found' errors
      const { data: { session: currentSession } } = await supabase.auth.getSession();

      // If there's no active session, treat as already signed out
      if (!currentSession) {
        setSession(null);
        setUser(null);
        toast({
          title: "Signed out",
          description: "You have been signed out successfully.",
        });
        return;
      }

      const { error } = await supabase.auth.signOut();

      if (error) {
        // Gracefully handle missing session from server as a successful sign-out on client
        const msg = (error.message || '').toLowerCase();
        if (msg.includes('session not found') || (error as any).status === 403) {
          setSession(null);
          setUser(null);
          toast({
            title: "Signed out",
            description: "You have been signed out successfully.",
          });
          return;
        }
        console.error('Sign out error:', error);
        throw error;
      }

      toast({
        title: "Signed out",
        description: "You have been signed out successfully.",
      });
    } catch (error: any) {
      console.error('Sign out exception:', error);

      const errorMessage = error.message || 'Failed to sign out. Please try again.';

      toast({
        title: "Sign out failed",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const redirectUrl = `${window.location.origin}/reset-password`;
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });

      if (error) {
        console.error('Password reset error:', error);
        
        // Handle specific Supabase errors
        if (error.message.includes('Email address is invalid')) {
          throw new Error('Please enter a valid email address.');
        } else if (error.message.includes('User not found')) {
          throw new Error('No account found with this email address.');
        } else if (error.message.includes('rate limit')) {
          throw new Error('Too many reset requests. Please wait before trying again.');
        } else if (error.message.includes('Network error') || error.message.includes('fetch')) {
          throw new Error('Network error. Please check your connection and try again.');
        }
        
        throw error;
      }

      toast({
        title: "Password reset email sent",
        description: "Check your email for instructions to reset your password.",
      });

      return { error: null };
    } catch (error: any) {
      console.error('Password reset exception:', error);
      
      const errorMessage = error.message || 'Failed to send password reset email. Please try again.';
      
      toast({
        title: "Password reset failed",
        description: errorMessage,
        variant: "destructive",
      });
      return { error };
    }
  };

  const value = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};