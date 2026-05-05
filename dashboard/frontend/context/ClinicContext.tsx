'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { createClient } from '@/lib/supabase/client';

interface Doctor {
  id: string;
  name: string;
  qualification?: string;
  specialty?: string;
  contact?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  registration_number?: string;
  license_expiry_date?: string;
  profile_photo_url?: string;
  experience_years?: number;
  timings?: string;
  is_active: boolean;
  display_order: number;
}

interface Clinic {
  id: string;
  name: string;
  name_hindi?: string;
  phone?: string;
  address?: string;
  tagline?: string;
  email: string;
  status: 'pending' | 'active' | 'suspended';
  owner_user_id: string;
  created_at: string;
}

interface ClinicContextType {
  clinic: Clinic | null;
  doctors: Doctor[];
  loading: boolean;
  user: any;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

const ClinicContext = createContext<ClinicContextType>({
  clinic: null,
  doctors: [],
  loading: true,
  user: null,
  refresh: async () => {},
  signOut: async () => {},
});

export function ClinicProvider({ children }: { children: ReactNode }) {
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  const supabase = createClient();

  const refresh = async () => {
    setLoading(true);
    try {
      // First check local session (fast)
      const { data: { session } } = await supabase.auth.getSession();
      let currentUser = session?.user || null;
      console.log('🔍 ClinicContext: getSession user:', currentUser?.email || 'null');

      // If no local session, verify with server (thorough)
      if (!currentUser) {
        const { data: { user: verifiedUser } } = await supabase.auth.getUser();
        currentUser = verifiedUser;
        console.log('🔍 ClinicContext: getUser (verified) user:', currentUser?.email || 'null');
      }
      
      setUser(currentUser);
      if (!currentUser) {
        setClinic(null);
        setDoctors([]);
        return;
      }

      console.log('👤 ClinicContext: User found, fetching clinic data...', currentUser.id);
      const { data: clinicData, error: clinicError } = await supabase
        .from('clinics')
        .select('*')
        .eq('owner_user_id', currentUser.id)
        .single();

      if (clinicError) {
        if (clinicError.code !== 'PGRST116') {
          console.error('❌ ClinicContext: Clinic fetch error:', clinicError);
        }
        setClinic(null);
      } else {
        console.log('🏥 ClinicContext: Clinic data loaded:', clinicData.name);
        setClinic(clinicData);

        const { data: doctorData, error: docError } = await supabase
          .from('clinic_doctors')
          .select('*, doctors(*)')
          .eq('clinic_id', clinicData.id)
          .eq('is_active', true)
          .order('display_order');
        
        if (docError) console.error('❌ ClinicContext: Doctors fetch error:', docError);
        
        // Flatten the joined data for easier frontend consumption
        const flattenedDoctors = (doctorData || []).map((entry: any) => ({
          ...entry,
          ...(entry.doctors || {}),
          id: entry.id, // Keep the clinic_doctor record ID as the primary reference
          doctor_id: entry.doctor_id // Explicitly keep the global doctor ID
        }));
        
        setDoctors(flattenedDoctors);
      }
    } catch (e: any) {
      console.error('🔥 ClinicContext: Critical error in refresh:', e);
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      await supabase.auth.signOut();
      // Redirect to landing page
      window.location.href = '/';
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  useEffect(() => {
    refresh();

    // Listen for auth changes to sync state instantly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      console.log('🔔 ClinicContext: Auth Event:', event);
      if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED', 'TOKEN_REFRESHED', 'INITIAL_SESSION'].includes(event)) {
        refresh();
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <ClinicContext.Provider value={{ clinic, doctors, loading, user, refresh, signOut }}>
      {children}
    </ClinicContext.Provider>
  );
}

export const useClinic = () => useContext(ClinicContext);
