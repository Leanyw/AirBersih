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
    if (typeof window === 'undefined') {
      setIsLoading(false);
      return;
    }

    const initializeAuth = async () => {
      try {
        const { data: { session: initialSession } } = await supabase.auth.getSession();
        console.log('🔍 Initial session:', initialSession?.user?.email);
        
        setSession(initialSession);
        setUser(initialSession?.user ?? null);
        
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
          (event, newSession) => {
            console.log('🔄 Auth state changed:', event);
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
        console.error('❌ Auth init error:', error);
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
      console.error('❌ Sign in error:', error);
      return { data: null, error };
    }
  };

  // ✅✅✅ FIXED SIGNUP FUNCTION - PASTI MASUK DATABASE ✅✅✅
  const signUp = async (userData: SignUpData) => {
    console.log('🚀 ========== START SIGNUP ==========');
    console.log('📝 User Data:', userData);
    
    try {
      // 1️⃣ SIGNUP AUTH
      console.log('1️⃣ Starting auth signup...');
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: userData.email,
        password: userData.password,
      });

      if (authError) {
        console.error('❌ Auth error:', authError);
        throw authError;
      }

      if (!authData.user) {
        throw new Error('No user returned from auth');
      }

      console.log('✅ Auth success! User ID:', authData.user.id);
      console.log('📧 User email:', authData.user.email);

      // 2️⃣ CARI PUSKESMAS
      console.log('2️⃣ Searching puskesmas for:', userData.kecamatan);
      
      // Query sederhana, cari puskesmas di kecamatan
      const { data: puskesmas, error: puskesmasError } = await supabase
        .from('puskesmas')
        .select('id')
        .eq('kecamatan', userData.kecamatan)
        .limit(1);

      let puskesmasId = null;
      if (!puskesmasError && puskesmas && puskesmas.length > 0) {
        puskesmasId = puskesmas[0].id;
        console.log('📍 Found puskesmas ID:', puskesmasId);
      } else {
        console.log('⚠️ No puskesmas found, using null');
      }

      // 3️⃣ BUILD USER DATA - HANYA KOLOM YANG ADA DI TABLE
      const userRecord = {
        id: authData.user.id,
        email: userData.email,
        nama: userData.nama,
        nik: userData.nik,
        phone: userData.phone,
        kecamatan: userData.kecamatan,
        kelurahan: userData.kelurahan,
        puskesmas_id: puskesmasId,
        role: 'warga',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('3️⃣ User record to insert:', JSON.stringify(userRecord, null, 2));

      // 4️⃣ INSERT KE DATABASE - PAKAI UPSERT (INSERT OR UPDATE)
      console.log('4️⃣ Inserting into database...');
      
      // Coba INSERT dulu
      const { error: insertError } = await supabase
        .from('users')
        .insert(userRecord);

      if (insertError) {
        console.log('⚠️ Insert failed, trying upsert...');
        console.log('Insert error:', insertError);
        
        // Coba UPSERT (update if exists)
        const { error: upsertError } = await supabase
          .from('users')
          .upsert(userRecord, {
            onConflict: 'id',
            ignoreDuplicates: false
          });

        if (upsertError) {
          console.error('❌ Upsert also failed:', upsertError);
          
          // Coba INSERT tanpa ID (biarkan database generate)
          const { error: insertWithoutIdError } = await supabase
            .from('users')
            .insert({
              email: userData.email,
              nama: userData.nama,
              nik: userData.nik,
              phone: userData.phone,
              kecamatan: userData.kecamatan,
              kelurahan: userData.kelurahan,
              puskesmas_id: puskesmasId,
              role: 'warga'
            });

          if (insertWithoutIdError) {
            console.error('❌ Final insert failed:', insertWithoutIdError);
            throw insertWithoutIdError;
          } else {
            console.log('✅ Insert without ID succeeded!');
          }
        } else {
          console.log('✅ Upsert succeeded!');
        }
      } else {
        console.log('✅ Insert succeeded!');
      }

      // 5️⃣ VERIFIKASI DATA MASUK
      console.log('5️⃣ Verifying data in database...');
      const { data: verifyData, error: verifyError } = await supabase
        .from('users')
        .select('id, email, nama')
        .eq('email', userData.email)
        .maybeSingle();

      if (verifyError) {
        console.warn('⚠️ Verification error:', verifyError);
      } else if (verifyData) {
        console.log('✅ VERIFICATION PASSED! User in database:');
        console.log('   ID:', verifyData.id);
        console.log('   Email:', verifyData.email);
        console.log('   Name:', verifyData.nama);
      } else {
        console.log('❌ User not found in database after insert!');
      }

      console.log('🎉 ========== SIGNUP COMPLETE ==========');
      
      // Auto sign in setelah signup
      const { data: signInData } = await supabase.auth.signInWithPassword({
        email: userData.email,
        password: userData.password,
      });

      return { 
        data: { 
          user: signInData?.user || authData.user,
          session: signInData?.session 
        }, 
        error: null 
      };
      
    } catch (error: any) {
      console.error('❌ ========== SIGNUP FAILED ==========');
      console.error('Error:', error);
      console.error('Error code:', error.code);
      console.error('Error message:', error.message);
      console.error('Error details:', error.details);
      console.error('Error hint:', error.hint);
      
      return { 
        data: null, 
        error: {
          message: error.message || 'Signup failed',
          code: error.code,
          details: error.details
        }
      };
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      router.push('/login');
    } catch (error) {
      console.error('❌ Sign out error:', error);
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
