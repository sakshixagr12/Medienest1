'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import { useClinic } from '@/context/ClinicContext';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface Service {
  id: string;
  name: string;
  fee: number;
  category: string;
  doctor?: string;
}

export default function SettingsPage() {
  const { clinic, doctors, refresh } = useClinic();
  
  // Clinic Details State
  const [clinicName, setClinicName] = useState(clinic?.name || '');
  const [address, setAddress] = useState(clinic?.address || '');
  const [tagline, setTagline] = useState(clinic?.tagline || '');

  // Doctor Details State (Primary Doctor)
  const [docName, setDocName] = useState('');
  const [docQual, setDocQual] = useState('');
  const [docSpec, setDocSpec] = useState('');

  const [services, setServices] = useState<Service[]>([]);
  const [loadingServices, setLoadingServices] = useState(true);

  // Sync profile state when clinic data is available
  useEffect(() => {
    if (clinic) {
      setClinicName(clinic.name || '');
      setAddress(clinic.address || '');
      setTagline(clinic.tagline || '');
      fetchServices();
    }
    if (doctors && doctors.length > 0) {
      setDocName(doctors[0].name || '');
      setDocQual(doctors[0].qualification || '');
      setDocSpec(doctors[0].specialty || '');
    }
  }, [clinic, doctors]);

  const supabase = createClient();

  const fetchServices = async () => {
    if (!clinic) return;
    setLoadingServices(true);
    const { data } = await supabase
      .from('clinic_services')
      .select('*')
      .eq('clinic_id', clinic.id);
    setServices(data || []);
    setLoadingServices(false);
  };

  // Bottom Sheet State
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [sName, setSName] = useState('');
  const [sFee, setSFee] = useState('');
  const [sCat, setSCat] = useState('OPD');
  const [sDoc, setSDoc] = useState('');

  const saveClinicProfile = async () => {
    if (!clinic) return;
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ name: clinicName, address, tagline })
        .eq('id', clinic.id);
      if (error) throw error;
      alert('Hospital Details Saved!');
      refresh(); // Refresh global context
    } catch (e: any) {
      alert('Error: ' + e.message);
    }
  };

  const saveDoctorProfile = async () => {
    if (!doctors || doctors.length === 0) return;
    try {
      const { error } = await supabase
        .from('clinic_doctors')
        .update({ 
          name: docName, 
          qualification: docQual, 
          specialty: docSpec 
        })
        .eq('id', doctors[0].id);
      
      if (error) throw error;
      alert('Practitioner Profile Updated!');
      refresh();
    } catch (e: any) {
      alert('Error updating doctor profile: ' + e.message);
    }
  };


  const openSheet = () => {
    setIsSheetOpen(true);
    setSName(''); setSFee(''); setSCat('OPD'); setSDoc('');
  };

  const saveService = async () => {
    if (!sName || !sFee || !clinic) return;
    try {
      const { error } = await supabase
        .from('clinic_services')
        .insert([{
          name: sName,
          fee: parseInt(sFee),
          category: sCat,
          doctor_name: sDoc || null,
          clinic_id: clinic.id
        }]);
      if (error) throw error;
      fetchServices();
      setIsSheetOpen(false);
    } catch (e: any) {
      alert('Error adding service: ' + e.message);
    }
  };

  const deleteService = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      const { error } = await supabase
        .from('clinic_services')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchServices();
    } catch (e: any) {
      alert('Error deleting service: ' + e.message);
    }
  };

  return (
    <div className={styles.page}>
      <TopBar title="Clinic Settings" backHref="/portal/front-desk" />
      
      <main className={styles.main}>
        {/* Clinic Profile */}
        <div className={styles.sectionLabel}>Hospital Details</div>
        <div className={styles.box}>
          <div className={styles.row}>
            <span className={styles.rlabel}>Name</span>
            <input type="text" value={clinicName} onChange={e => setClinicName(e.target.value)} />
          </div>
          <div className={styles.row}>
            <span className={styles.rlabel}>Address</span>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
          </div>
          <div className={styles.row}>
            <span className={styles.rlabel}>Tagline</span>
            <input type="text" value={tagline} onChange={e => setTagline(e.target.value)} />
          </div>
        </div>
        <button className={styles.saveBtn} onClick={saveClinicProfile}>Save Hospital Details</button>

        {/* Doctor Profile */}
        <div className={styles.sectionLabel} style={{ marginTop: 32 }}>Practitioner Profile</div>
        <div className={styles.box}>
          <div className={styles.row}>
            <span className={styles.rlabel}>Full Name</span>
            <input type="text" value={docName} onChange={e => setDocName(e.target.value)} placeholder="e.g. Dr. Pradeep Jain" />
          </div>
          <div className={styles.row}>
            <span className={styles.rlabel}>Qualification</span>
            <input type="text" value={docQual} onChange={e => setDocQual(e.target.value)} placeholder="e.g. MBBS, MD (Medicine)" />
          </div>
          <div className={styles.row}>
            <span className={styles.rlabel}>Specialty</span>
            <input type="text" value={docSpec} onChange={e => setDocSpec(e.target.value)} placeholder="e.g. Cardiologist" />
          </div>
        </div>
        <button className={styles.saveBtn} onClick={saveDoctorProfile}>Update Practitioner Profile</button>


        {/* Services List */}
        <div className={styles.sectionLabel} style={{ marginTop: 32 }}>Clinical Services</div>
        <div className={styles.box}>
          {services.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: '#9ca3af', fontSize: 13 }}>No services added yet.</div>
          ) : (
            services.map(s => (
              <div key={s.id} className={styles.srvItem}>
                <div className={styles.srvInfo}>
                  <div className={styles.srvName}>{s.name}</div>
                  <div className={styles.srvMeta}>
                    <span className={styles.srvBadge}>{s.category}</span>
                    {s.doctor && <span>· {s.doctor}</span>}
                  </div>
                </div>
                <div className={styles.srvRight}>
                  <div className={styles.srvFee}>₹{s.fee}</div>
                  <button className={styles.btnDel} onClick={() => deleteService(s.id)}>×</button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* FAB */}
      <button className={styles.fab} onClick={openSheet}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" width="24" height="24">
          <line x1="12" y1="5" x2="12" y2="19"></line>
          <line x1="5" y1="12" x2="19" y2="12"></line>
        </svg>
      </button>

      {/* Bottom Sheet Modal */}
      <div className={`${styles.overlay} ${isSheetOpen ? styles.overlayOpen : ''}`} onClick={() => setIsSheetOpen(false)}></div>
      <div className={`${styles.sheet} ${isSheetOpen ? styles.sheetOpen : ''}`}>
        <div className={styles.sheetHandle}></div>
        <div className={styles.sheetTitle}>Add New Service</div>
        
        <div className="field">
          <label>Service Name</label>
          <input type="text" value={sName} onChange={e => setSName(e.target.value)} placeholder="e.g. ECG, X-Ray" />
        </div>
        
        <div className={styles.row2}>
          <div className="field">
            <label>Fee (₹)</label>
            <input type="number" value={sFee} onChange={e => setSFee(e.target.value)} placeholder="500" />
          </div>
          <div className="field">
            <label>Category</label>
            <select value={sCat} onChange={e => setSCat(e.target.value)}>
              <option>OPD</option>
              <option>Diagnostic</option>
              <option>Pharmacy</option>
              <option>IPD Stay</option>
              <option>Other</option>
            </select>
          </div>
        </div>

        <div className="field">
          <label>Doctor (Optional)</label>
          <select value={sDoc} onChange={e => setSDoc(e.target.value)}>
            <option value="">All Doctors</option>
            {doctors.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
          </select>
        </div>

        <button className={styles.sheetSave} onClick={saveService}>Add Service</button>
        <button className={styles.sheetCancel} onClick={() => setIsSheetOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
