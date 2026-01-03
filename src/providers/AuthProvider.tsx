'use client';

import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { User, Session } from '@supabase/supabase-js';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
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
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Hanya berjalan di client side
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        // Check session pertama kali
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        // Setup listener untuk perubahan auth state
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            console.log('Auth state changed:', event);
            setSession(newSession);
            setUser(newSession?.user ?? null);
            
            if (event === 'SIGNED_IN') {
              router.push('/dashboard');
            } else if (event === 'SIGNED_OUT') {
              router.push('/login');
            }
          }
        );

        return () => subscription.unsubscribe();
      } catch (error) {
        console.error('Error initializing auth:', error);
      } finally {
        setIsLoading(false);
      }
    };

    initializeAuth();
  }, [router]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      return { data, error };
    } catch (error: any) {
      console.error('Sign in error:', error);
      return { data: null, error };
    }
  };

  const signUp = async (userData: SignUpData) => {
    try {
      // 1. Sign up di auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) throw authError;

      // 2. Cari puskesmas berdasarkan kecamatan
      const { data: puskesmas } = await supabase
        .from('puskesmas')
        .select('id')
        .eq('kecamatan', userData.kecamatan)
        .single();

      // 3. Insert ke tabel users (bisa saja gagal, tapi jangan throw error)
      if (authData.user?.id) {
        await supabase
          .from('users')
          .insert({
            id: authData.user.id,
            email: userData.email,
            nama: userData.nama,
            nik: userData.nik,
            phone: userData.phone,
            kecamatan: userData.kecamatan,
            kelurahan: userData.kelurahan,
            puskesmas_id: puskesmas?.id,
            role: 'warga'
          })
          .then(result => {
            if (result.error) {
              console.warn('Warning: User created in auth but failed to insert in users table:', result.error);
            }
          });
      }

      return { data: authData, error: null };
    } catch (error: any) {
      console.error('Sign up error:', error);
      return { data: null, error };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
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

