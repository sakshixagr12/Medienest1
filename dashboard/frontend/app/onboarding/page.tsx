'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import { normalizeDoctorName } from '@/lib/utils';
import styles from './page.module.css';

interface Doctor {
  name: string;
  qualification: string;
  contact: string;
  specialty: string;
  registration_number: string;
  license_expiry_date?: string;
  profile_photo_url?: string;
  is_active: boolean;
  display_order: number;
}

export default function OnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const [step, setStep] = useState(1);
  const progress = step === 1 ? 33 : step === 2 ? 66 : 100;

  // Step 1 state
  const [clinicName, setClinicName] = useState('');
  const [clinicNameHindi, setClinicNameHindi] = useState('');
  const [phone, setPhone] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');
  const [tagline, setTagline] = useState('');
  const [step1Error, setStep1Error] = useState('');

  // Step 2 state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [docName, setDocName] = useState('');
  const [docQual, setDocQual] = useState('');
  const [docContact, setDocContact] = useState('');
  const [docSpecialty, setDocSpecialty] = useState('');
  const [docRegNumber, setDocRegNumber] = useState('');
  const [docExpiry, setDocExpiry] = useState('');
  const [docPhoto, setDocPhoto] = useState('');
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [step2Error, setStep2Error] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const goStep2 = () => {
    if (!clinicName) { setStep1Error('Clinic name is required.'); return; }
    if (!phone) { setStep1Error('Phone number is required.'); return; }
    setStep1Error('');
    setStep(2);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const addDoctor = () => {
    if (!docName.trim()) { setStep2Error('Doctor name is required.'); return; }
    if (!docRegNumber.trim()) { setStep2Error('Medical License Number is required.'); return; }
    
    const normalizedName = normalizeDoctorName(docName);

    const docData: Doctor = {
      name: normalizedName,
      qualification: docQual.trim(),
      contact: docContact.trim(),
      specialty: docSpecialty.trim() || 'General Medicine',
      registration_number: docRegNumber.trim(),
      license_expiry_date: docExpiry || undefined,
      profile_photo_url: docPhoto || undefined,
      is_active: true,
      display_order: editingIndex !== null ? doctors[editingIndex].display_order : doctors.length,
    };

    if (editingIndex !== null) {
      setDoctors(prev => {
        const updated = [...prev];
        updated[editingIndex] = docData;
        return updated;
      });
      setEditingIndex(null);
    } else {
      setDoctors(prev => [...prev, docData]);
    }

    setDocName(''); 
    setDocQual(''); 
    setDocContact(''); 
    setDocSpecialty('');
    setDocRegNumber('');
    setDocExpiry('');
    setDocPhoto('');
    setStep2Error('');
  };

  const prepareEdit = (i: number) => {
    const d = doctors[i];
    setDocName(d.name);
    setDocQual(d.qualification);
    setDocContact(d.contact);
    setDocSpecialty(d.specialty);
    setDocRegNumber(d.registration_number);
    setDocExpiry(d.license_expiry_date || '');
    setDocPhoto(d.profile_photo_url || '');
    setEditingIndex(i);
    setStep2Error('');
    window.scrollTo({ top: 400, behavior: 'smooth' }); // Scroll to form
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setDocName(''); 
    setDocQual(''); 
    setDocContact(''); 
    setDocSpecialty('');
    setDocRegNumber('');
    setDocExpiry('');
    setDocPhoto('');
    setStep2Error('');
  };

  const removeDoctor = (i: number) => {
    setDoctors(prev => prev.filter((_, idx) => idx !== i).map((d, j) => ({ ...d, display_order: j })));
  };

  const handleSubmit = async () => {
    if (doctors.length === 0 && !confirm('You have not added any doctors. Continue without adding?')) return;
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.replace('/auth'); return; }

      const fullAddress = [address, city].filter(Boolean).join(', ');
      const { data: clinic, error: clinicErr } = await supabase.from('clinics').insert({
        name: clinicName,
        name_hindi: clinicNameHindi || null,
        phone, address: fullAddress,
        tagline: tagline || 'Quality Healthcare for All',
        email: user.email,
        owner_user_id: user.id,
        status: 'pending',
      }).select().single();

      if (clinicErr) throw clinicErr;

      if (doctors.length > 0) {
        for (const d of doctors) {
          // 1. Insert into global doctors registry
          const { data: docRecord, error: docErr } = await supabase.from('doctors').insert({
            name: d.name,
            qualification: d.qualification,
            contact: d.contact,
            specialty: d.specialty,
            registration_number: d.registration_number,
            license_expiry_date: d.license_expiry_date,
            profile_photo_url: d.profile_photo_url
          }).select().single();
          
          if (docErr) throw docErr;

          // 2. Map doctor to this specific clinic context
          const { error: assocErr } = await supabase.from('clinic_doctors').insert({
            clinic_id: clinic.id,
            doctor_id: docRecord.id,
            display_order: d.display_order,
            is_active: d.is_active
          });
          
          if (assocErr) throw assocErr;
        }
      }

      setStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err: any) {
      setStep2Error(err.message || 'Submission failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className={styles.page}>
      
      {/* ---------------- SIDEBAR ---------------- */}
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <div className={styles.brandLogo}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18"/><path d="M15 3v18"/><path d="M3 9h18"/><path d="M3 15h18"/></svg>
          </div>
          <div className={styles.brandText}>
            <h1>MediNest<br/>Onboarding</h1>
            <p>Setting up your sanctuary</p>
          </div>
        </div>

        <nav className={styles.navMenu}>
          <div 
            className={`${styles.navItem} ${step === 1 ? styles.navItemActive : ''}`}
            onClick={() => step !== 3 && setStep(1)}
            style={{ cursor: step !== 3 ? 'pointer' : 'default' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
            Clinic Setup
          </div>
          <div 
            className={`${styles.navItem} ${step === 2 ? styles.navItemActive : ''}`}
            onClick={() => step === 1 ? goStep2() : undefined}
            style={{ cursor: step === 1 ? 'pointer' : 'default' }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
            Team Members
          </div>
          <div className={`${styles.navItem} ${step === 3 ? styles.navItemActive : ''}`}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Status
          </div>
        </nav>

        <div className={styles.sidebarFooter}>
          <button className={styles.btnSaveProgress}>Save Progress</button>
        </div>
      </aside>

      {/* ---------------- MAIN CONTENT ---------------- */}
      <main className={styles.mainArea}>
        
        {/* Top Header */}
        <header className={styles.topHeader}>
          <Link href="/" className={styles.logoTitle}>MediNest</Link>
          <div className={styles.headerRight}>
            <div className={styles.stepIndicator}>
              STEP 0{Math.min(step, 3)} / 03
              <div className={styles.stepBar}>
                <div className={styles.stepFill} style={{ width: `${progress}%` }}></div>
              </div>
            </div>
            <Link href="/support" className={styles.iconCircle} title="Help & Support">?</Link>
            <Link href="/auth?tab=login" className={styles.iconCircle} title="Clinic Login">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
            </Link>
          </div>
        </header>

        {/* ---------------- STEP 1: CLINIC SETUP ---------------- */}
        {step === 1 && (
          <div className={styles.formContainer}>
            <div className={styles.heroImage}>
              🏥
            </div>
            <h2 className={styles.pageTitle}>Tell us about your clinic</h2>
            <p className={styles.pageSubtitle}>Establish your clinic's digital presence. This information will be visible to patients and used for billing.</p>
            
            <div className={styles.formCard}>
              {step1Error && <div className={styles.errMsg}>{step1Error}</div>}
              
              <div className={styles.formGrid}>
                <div className={styles.formField}>
                  <label>Clinic/Hospital Name <span style={{color: '#ef4444'}}>*</span></label>
                  <input className={styles.inputBox} value={clinicName} onChange={e => setClinicName(e.target.value)} placeholder="e.g. Serenity Wellness Center" autoFocus />
                </div>
                
                <div className={styles.formField}>
                  <label>Clinic Name in Hindi <span>(Optional)</span></label>
                  <input className={styles.inputBox} value={clinicNameHindi} onChange={e => setClinicNameHindi(e.target.value)} placeholder="e.g. सेरेनिटी वेलनेस सेंटर" />
                </div>
                
                <div className={styles.formField}>
                  <label>Phone Number <span style={{color: '#ef4444'}}>*</span></label>
                  <div className={styles.inputWithIcon}>
                    <span className={styles.prefixIcon}>+91</span>
                    <input className={styles.inputBox} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="98765 43210" />
                  </div>
                </div>
                
                <div className={styles.formField}>
                  <label>City/Location <span style={{color: '#ef4444'}}>*</span></label>
                  <div className={styles.inputWithIcon}>
                    <input className={styles.inputBox} value={city} onChange={e => setCity(e.target.value)} placeholder="e.g. South Delhi" />
                    <svg className={styles.suffixIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="3"/></svg>
                  </div>
                </div>
                
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label>Full Address <span style={{color: '#ef4444'}}>*</span></label>
                  <textarea className={styles.inputBox} rows={2} value={address} onChange={e => setAddress(e.target.value)} placeholder="Street name, landmark, and postal code"></textarea>
                </div>
                
                <div className={`${styles.formField} ${styles.fullWidth}`}>
                  <label>Clinic Tagline <span>(Optional)</span></label>
                  <input className={styles.inputBox} value={tagline} onChange={e => setTagline(e.target.value)} placeholder="e.g. Compassionate Care for Every Soul" />
                </div>
              </div>

              <div className={styles.formFooter}>
                <button className={styles.btnNext} onClick={goStep2}>
                  Next: Add Doctors 
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
                </button>
                <div className={styles.footerHelp}>
                  <strong>Need help?</strong> Contact our support team for assistance with clinic registration.
                </div>
              </div>
            </div>

            <div className={styles.pageBottomBadge}>
               <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z"/></svg> 
               SECURE HIPAA COMPLIANT CLOUD
            </div>
          </div>
        )}

        {/* ---------------- STEP 2: DOCTORS SUMMARY ---------------- */}
        {step === 2 && (
          <div className={styles.formContainer}>
            <div className={styles.heroImage}>👨‍⚕️</div>
            <h2 className={styles.pageTitle}>Add your doctors</h2>
            <p className={styles.pageSubtitle}>List the practitioners who will be using this sanctuary. You can update this later from your settings page.</p>

            <div className={styles.formCard}>
              {step2Error && <div className={styles.errMsg}>{step2Error}</div>}
              
              <div className={styles.doctorsList}>
                {doctors.map((d, i) => (
                    <div key={i} className={styles.doctorListItem}>
                      <div style={{ flex: 1 }}>
                        <strong>Dr. {d.name}</strong> • {d.specialty}
                        <div style={{ fontSize: 12, color: '#6b7280', marginTop: 4 }}>
                          {d.qualification} | {d.contact} | Reg: {d.registration_number}
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button 
                          onClick={() => prepareEdit(i)} 
                          style={{ border: 'none', background: '#e0f2fe', color: '#0284c7', borderRadius: 8, padding: '4px 12px', cursor: 'pointer', fontWeight: 600, fontSize: 13 }}
                        >
                          Edit
                        </button>
                        <button 
                          onClick={() => removeDoctor(i)} 
                          style={{ border: 'none', background: '#fee2e2', color: '#ef4444', borderRadius: 8, width: 32, height: 32, cursor: 'pointer', fontWeight: 600 }}
                        >
                          X
                        </button>
                      </div>
                    </div>
                ))}
              </div>

              <div className={styles.addDoctorForm} style={{ border: editingIndex !== null ? '2px solid #0284c7' : 'none', background: editingIndex !== null ? '#f0f9ff' : 'transparent' }}>
                 <h3 style={{ margin: '0 0 16px', fontSize: 14 }}>
                   {editingIndex !== null ? '📝 Edit Doctor Details' : '+ Add New Doctor'}
                 </h3>
                 <div className={styles.formGrid}>
                    <div className={styles.formField}>
                        <label>Doctor's Name</label>
                        <input className={styles.inputBox} value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Pradeep Kumar" />
                    </div>
                    <div className={styles.formField}>
                        <label>Specialty</label>
                        <input className={styles.inputBox} value={docSpecialty} onChange={e => setDocSpecialty(e.target.value)} placeholder="e.g. Pediatrics" />
                    </div>
                    <div className={styles.formField}>
                        <label>Qualification</label>
                        <input className={styles.inputBox} value={docQual} onChange={e => setDocQual(e.target.value)} placeholder="e.g. MBBS, MD" />
                    </div>
                    <div className={styles.formField}>
                        <label>Contact Number</label>
                        <input className={styles.inputBox} value={docContact} onChange={e => setDocContact(e.target.value)} placeholder="98XXXXXXXX" />
                    </div>
                    <div className={styles.formField}>
                        <label>Medical License No. <span style={{color: '#ef4444'}}>*</span></label>
                        <input className={styles.inputBox} value={docRegNumber} onChange={e => setDocRegNumber(e.target.value)} placeholder="e.g. MCI-12345" />
                    </div>
                    <div className={styles.formField}>
                        <label>License Expiry Date</label>
                        <input className={styles.inputBox} type="date" value={docExpiry} onChange={e => setDocExpiry(e.target.value)} />
                    </div>
                    <div className={`${styles.formField} ${styles.fullWidth}`}>
                        <label>Profile Photo URL <span>(Optional)</span></label>
                        <input className={styles.inputBox} value={docPhoto} onChange={e => setDocPhoto(e.target.value)} placeholder="https://example.com/photo.jpg" />
                    </div>
                 </div>
                 <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
                   <button 
                     onClick={addDoctor} 
                     style={{ 
                       background: editingIndex !== null ? '#0284c7' : '#e5e7eb', 
                       color: editingIndex !== null ? '#ffffff' : '#1f2937', 
                       padding: '12px 24px', 
                       borderRadius: 20, 
                       border: 'none', 
                       fontWeight: 600, 
                       cursor: 'pointer' 
                     }}
                   >
                     {editingIndex !== null ? 'Update Detail' : '+ Add to List'}
                   </button>
                   {editingIndex !== null && (
                     <button 
                       onClick={cancelEdit} 
                       style={{ background: 'transparent', color: '#6b7280', padding: '12px 24px', borderRadius: 20, border: '1px solid #e5e7eb', fontWeight: 600, cursor: 'pointer' }}
                     >
                       Cancel
                     </button>
                   )}
                 </div>
              </div>

              <div className={styles.formFooter} style={{ justifyContent: 'flex-start' }}>
                <button className={styles.btnSecondary} onClick={() => setStep(1)}>← Back</button>
                <button className={styles.btnNext} onClick={handleSubmit} disabled={submitting}>
                  {submitting ? 'Submitting...' : 'Submit for Approval'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ---------------- STEP 3: WAITLIST STATUS ---------------- */}
        {step === 3 && (
          <div className={styles.formContainer}>
            <br/><br/>
            <div className={styles.waitlistIconBox}>
              <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20"/><path d="M5 2h14"/><path d="M5 22h14"/><path d="M5 6l7 7-7 7"/><path d="M19 6l-7 7 7 7"/></svg>
            </div>
            
            <div className={styles.statusPill}>
               STATUS: PENDING APPROVAL
            </div>

            <h2 className={styles.pageTitle} style={{ fontSize: 40, marginBottom: 16 }}>You're on the waitlist!</h2>
            <p className={styles.pageSubtitle}>Thank you for choosing MediNest. Our clinical excellence team is currently reviewing your registration to ensure your sanctuary meets our high-trust standards.</p>

            <div className={styles.waitlistGrid}>
               <div className={styles.waitCard}>
                  <div className={styles.waitCardIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><polyline points="9 12 11 14 15 10"/></svg>
                  </div>
                  <h4>Quality Audit</h4>
                  <p>We verify all credentials to maintain a secure environment for every patient.</p>
               </div>
               
               <div className={styles.waitCard}>
                  <div className={styles.waitCardIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                  </div>
                  <h4>24h Response</h4>
                  <p>Most clinic approvals are processed within one business day.</p>
               </div>

               <div className={styles.waitCard}>
                  <div className={styles.waitCardIcon}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                  </div>
                  <h4>Next Steps</h4>
                  <p>Check your inbox for a confirmation link once approval is complete.</p>
               </div>
            </div>

            <div className={styles.waitActions}>
               <button className={styles.btnSolid} onClick={() => window.location.href = 'mailto:concierge@medinest.com'}>Visit Support Center</button>
               <button className={styles.btnGray} onClick={() => setStep(1)}>View Registration Info</button>
            </div>

            <div className={styles.contactInfo} style={{ marginTop: 60 }}>
               Questions about your application? Contact our onboarding concierge at <strong>concierge@medinest.com</strong>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
