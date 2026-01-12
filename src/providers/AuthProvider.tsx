'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useRouter, usePathname } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  profile: any | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (data: SignUpData) => Promise<any>;
  signOut: () => Promise<void>;
};

type SignUpData = {
  email: string;
  password: string;
  nama: string;
  nik: string;
  phone: string;
  kecamatan: string;
  kelurahan: string;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  // ✅ FUNGSI CEPAT DETECT ROLE DARI EMAIL (TANPA QUERY DATABASE)
  const detectRoleFromEmail = (email: string) => {
    const emailLower = email.toLowerCase();
    
    // LOGIC SEDERHANA:
    if (emailLower.includes('admin')) {
      return 'admin';
    } else if (emailLower.includes('puskesmas') || emailLower.includes('pkm')) {
      return 'puskesmas';
    } else {
      return 'warga';
    }
  };

  // ✅ FUNGSI CEPAT UNTUK DAPATKAN PROFILE (TANPA BLOCKING)
  const getQuickProfile = (user: User) => {
    const email = user.email?.toLowerCase() || '';
    const role = detectRoleFromEmail(email);
    
    // PROFILE DASAR DARI EMAIL
    const baseProfile = {
      id: user.id,
      email: user.email,
      nama: user.email?.split('@')[0] || 'User',
      role: role,
      kecamatan: 'Semarang Barat' // Default
    };

    // TAMBAHAN UNTUK PUSKESMAS
    if (role === 'puskesmas') {
      return {
        ...baseProfile,
        puskesmas_id: user.id, // Asumsi ID puskesmas = user id
        nama: `Puskesmas ${user.email?.split('@')[0] || ''}`,
        alamat: 'Jl. Puskesmas No. 1',
        phone: '021-1234567'
      };
    }

    return baseProfile;
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        console.log('🚀 Initializing auth...');
        
        // 1. GET SESSION (CEPAT)
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Session error:', sessionError);
          setIsLoading(false);
          return;
        }
        
        console.log('✅ Session loaded:', initialSession?.user?.email);
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // 2. JIKA ADA USER, SET PROFILE CEPAT
        if (initialSession?.user) {
          console.log('🔄 Setting quick profile...');
          const quickProfile = getQuickProfile(initialSession.user);
          setProfile(quickProfile);
          console.log('✅ Profile set:', quickProfile.role);
          
          // 3. REDIRECT CEPAT BERDASARKAN EMAIL
          const currentPath = pathname;
          const publicPages = ['/', '/login', '/register', '/auth/callback'];
          
          if (publicPages.includes(currentPath)) {
            console.log('📍 At public page, redirecting...');
            setTimeout(() => {
              if (quickProfile.role === 'admin') {
                router.replace('/admin');
              } else if (quickProfile.role === 'puskesmas') {
                router.replace('/puskesmas');
              } else {
                router.replace('/dashboard');
              }
            }, 100); // Delay kecil
          }
        } else {
          setProfile(null);
        }

        // 4. SETUP AUTH LISTENER
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          async (event, newSession) => {
            console.log('🔄 Auth state:', event);
            
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_IN' && newSession?.user) {
              // SET PROFILE CEPAT
              const quickProfile = getQuickProfile(newSession.user);
              setProfile(quickProfile);
              
              // REDIRECT CEPAT
              setTimeout(() => {
                if (quickProfile.role === 'admin') {
                  router.replace('/admin');
                } else if (quickProfile.role === 'puskesmas') {
                  router.replace('/puskesmas');
                } else {
                  router.replace('/dashboard');
                }
              }, 100);
              
            } else if (event === 'SIGNED_OUT') {
              setProfile(null);
              router.push('/login');
            }
          }
        );

        return () => subscription.unsubscribe();
        
      } catch (error) {
        console.error('❌ Auth init error:', error);
      } finally {
        // TIDAK PERLU SET TIMEOUT, LANGSUNG SET LOADING FALSE
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [router, pathname]);

  // ✅ SIGN IN YANG CEPAT
  const signIn = async (email: string, password: string) => {
    try {
      console.log('🔑 Attempting login for:', email);
      
      const startTime = Date.now();
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.toLowerCase().trim(),
        password,
      });

      const authTime = Date.now() - startTime;
      console.log(`✅ Auth completed in ${authTime}ms`);
      
      if (error) {
        console.error('❌ Login error:', error);
        return { data: null, error };
      }

      console.log('✅ Login successful for:', data.user?.email);
      
      // SET PROFILE CEPAT
      const quickProfile = getQuickProfile(data.user);
      setProfile(quickProfile);
      
      // REDIRECT CEPAT
      console.log('🚀 Quick redirect to:', quickProfile.role);
      if (quickProfile.role === 'admin') {
        router.push('/admin');
      } else if (quickProfile.role === 'puskesmas') {
        router.push('/puskesmas');
      } else {
        router.push('/dashboard');
      }

      return { data, error: null };
      
    } catch (error: any) {
      console.error('❌ Sign in error:', error);
      return { data: null, error };
    }
  };

  // ✅ SIGN UP (SEDERHANA)
  const signUp = async (userData: SignUpData) => {
    console.log('🚀 Quick signup for:', userData.email);
    
    try {
      // 1. Auth signup
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('No user returned');

      console.log('✅ Auth success');
      
      // 2. Set profile cepat
      const quickProfile = {
        id: authData.user.id,
        email: userData.email,
        nama: userData.nama,
        role: 'warga',
        kecamatan: userData.kecamatan,
        kelurahan: userData.kelurahan
      };
      
      setProfile(quickProfile);
      
      // 3. Redirect ke dashboard
      router.push('/dashboard');
      
      // 4. Return success
      return { 
        data: { 
          user: authData.user,
          profile: quickProfile
        }, 
        error: null 
      };
      
    } catch (error: any) {
      console.error('❌ Quick signup failed:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      setProfile(null);
      router.push('/login');
    } catch (error) {
      console.error('❌ Sign out error:', error);
    }
  };

  // ✅ LOADING STATE YANG LEBIH CEPAT
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-br from-blue-50 to-white">
        <div className="relative mb-4">
          <div className="w-12 h-12 border-3 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
        
        <h2 className="text-lg font-semibold text-blue-700 mb-1">
          Air Bersih
        </h2>
        <p className="text-sm text-gray-500">
          Memuat aplikasi...
        </p>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      session, 
      profile,
      isLoading, 
      signIn, 
      signUp, 
      signOut 
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};