'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useClinic } from '@/context/ClinicContext';
import DashboardLayout from '@/components/DashboardLayout';
import styles from './page.module.css';

export default function RegisterPatientPage() {
  const { clinic } = useClinic();
  const supabase = createClient();
  
  // Form State
  const [ptName, setPtName] = useState('');
  const [ptPhone, setPtPhone] = useState('');
  const [ptAge, setPtAge] = useState('');
  const [ptSex, setPtSex] = useState('Male');
  const [ptBloodGroup, setPtBloodGroup] = useState('');

  // UI State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Auto-fetch State
  const [foundPatients, setFoundPatients] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Auto-fetch logic
  useEffect(() => {
    const cleanPhone = ptPhone.replace(/\D/g, '');
    
    if (cleanPhone.length < 3 || !clinic) {
      setFoundPatients([]);
      setIsSearching(false);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const { data, error: searchError } = await supabase
          .from('patients')
          .select('*')
          .ilike('contact', `%${cleanPhone}%`)
          .eq('clinic_id', clinic.id)
          .limit(5);

        if (searchError) throw searchError;
        setFoundPatients(data || []);
      } catch (err) {
        console.error('Auto-fetch error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [ptPhone, clinic, supabase]);

  const handleSelectPatient = (p: any) => {
    setPtName(p.name || '');
    setPtPhone(p.contact || '');
    setPtAge(p.age || '');
    setPtSex(p.gender || 'Male');
    setPtBloodGroup(p.blood_group || '');
    setFoundPatients([]);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clinic) return;
    
    // Validation
    if (!ptName.trim()) { setError('Full name is required.'); return; }
    
    const cleanPhone = ptPhone.replace(/\D/g, '').slice(-10);
    if (cleanPhone.length !== 10) {
      setError('Please enter a valid 10-digit phone number.');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const normalizedName = ptName.trim().toUpperCase();
      const normalizedBlood = ptBloodGroup.trim().toUpperCase();

      // SMART DUPLICATE LOGIC:
      // 1. Check if EXACT match (Name + Phone) exists
      const { data: existing, error: pError } = await supabase
        .from('patients')
        .select('id')
        .eq('name', normalizedName)
        .eq('contact', cleanPhone)
        .eq('clinic_id', clinic.id)
        .limit(1);

      if (pError) throw pError;

      if (existing && existing.length > 0) {
        // UPDATE Existing
        const patientId = existing[0].id;
        const { error: upError } = await supabase
          .from('patients')
          .update({ 
            age: ptAge, 
            gender: ptSex, 
            blood_group: normalizedBlood 
          })
          .eq('id', patientId);
        
        if (upError) throw upError;
        setSuccess(`Profile Updated: ${normalizedName} successfully updated.`);
      } else {
        // CREATE NEW record (Allows family members with same phone but different names)
        const { error: insError } = await supabase
          .from('patients')
          .insert([{
            name: normalizedName,
            contact: cleanPhone,
            gender: ptSex,
            age: ptAge,
            blood_group: normalizedBlood,
            clinic_id: clinic.id
          }]);

        if (insError) throw insError;
        setSuccess(`Registration Success: ${normalizedName} is now in the database.`);
      }

      // Clear Form on success
      setPtName('');
      setPtPhone('');
      setPtAge('');
      setPtSex('Male');
      setPtBloodGroup('');
      
      setTimeout(() => setSuccess(null), 5000);

    } catch (err: any) {
      console.error('❌ Registration error:', err);
      setError(err.message || 'Failed to register patient.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.page}>
        <div className={styles.container}>
          <header className={styles.header}>
            <h1>Patient Registration</h1>
            <p>Onboard new patients or update family profiles with clinical accuracy.</p>
          </header>

          <div className={styles.card}>
            {success && (
              <div className={styles.successMsg}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
                {success}
              </div>
            )}

            {error && <div className={styles.errorMsg}>{error}</div>}

            <form onSubmit={handleRegister}>
              <div className={styles.formGrid}>
                {/* Section 1: Contact & Search */}
                <div className={styles.formField}>
                  <label>10-Digit Phone Number</label>
                  <div style={{ position: 'relative' }}>
                    <input 
                      type="tel" 
                      className={styles.inputBox} 
                      value={ptPhone} 
                      onChange={e => setPtPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                      placeholder="e.g. 9876543210"
                      maxLength={10}
                      autoComplete="off"
                    />
                    {/* Search Results */}
                    {(isSearching || foundPatients.length > 0) && (
                      <div className={styles.searchResults}>
                        {isSearching && <div className={styles.searchingLoader}>Syncing contacts...</div>}
                        {!isSearching && foundPatients.map(p => (
                          <div key={p.id} className={styles.resultItem} onClick={() => handleSelectPatient(p)}>
                            <div className={styles.resultIcon}>
                              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                            </div>
                            <div className={styles.resultInfo}>
                              <div className={styles.resultName}>{p.name}</div>
                              <div className={styles.resultMeta}>{p.gender}, {p.age}y • {p.contact}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Section 2: Full Name */}
                <div className={styles.formField}>
                  <label>Full Name (Uppercase)</label>
                  <input 
                    type="text" 
                    className={styles.inputBox} 
                    value={ptName} 
                    onChange={e => setPtName(e.target.value.toUpperCase())}
                    placeholder="Enter patient full name"
                  />
                </div>

                {/* Section 3: Vitals Group */}
                <div className={styles.vitalsRow}>
                  <div className={styles.formField}>
                    <label>Age</label>
                    <input type="number" className={styles.inputBox} value={ptAge} onChange={e => setPtAge(e.target.value)} placeholder="0" />
                  </div>
                  <div className={styles.formField}>
                    <label>Gender</label>
                    <select className={styles.inputBox} value={ptSex} onChange={e => setPtSex(e.target.value)}>
                      <option>Male</option>
                      <option>Female</option>
                      <option>Other</option>
                    </select>
                  </div>
                  <div className={styles.formField}>
                    <label>Blood Group</label>
                    <input type="text" className={styles.inputBox} value={ptBloodGroup} onChange={e => setPtBloodGroup(e.target.value.toUpperCase())} placeholder="O+" />
                  </div>
                </div>
              </div>

              <button type="submit" className={styles.submitBtn} disabled={isSubmitting}>
                {isSubmitting ? 'Securing Clinical Record...' : (
                  <>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/></svg>
                    Confirm Registration
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
