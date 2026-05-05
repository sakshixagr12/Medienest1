import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useClinic } from '@/context/ClinicContext';
import { createClient } from '@/lib/supabase/client';
import { displayDoctorName } from '@/lib/utils';
import styles from './DashboardTopBar.module.css';

export default function DashboardTopBar({ onMenuOpen }: { onMenuOpen?: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const doctorNameParam = searchParams.get('doctorName');
  const { doctors, clinic } = useClinic();
  
  // Search State
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);

  // Notification State
  const [showNotifs, setShowNotifs] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [notifLoading, setNotifLoading] = useState(false);
  const [notifError, setNotifError] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    if (!clinic?.id) return;
    setNotifLoading(true);
    setNotifError(false);
    try {
      const response = await fetch(`http://localhost:4001/api/notifications?clinic_id=${clinic.id}`);
      const result = await response.json();
      if (result.success) {
        setNotifications(result.data);
      } else {
        setNotifError(true);
      }
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      setNotifError(true);
    } finally {
      setNotifLoading(false);
    }
  };

  useEffect(() => {
    if (showNotifs) {
      fetchNotifications();
    }
  }, [showNotifs, clinic?.id]);

  const getTimeAgo = (dateString: string) => {
    const now = new Date();
    const then = new Date(dateString);
    const diffInSeconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} mins ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    return `${Math.floor(diffInSeconds / 86400)} days ago`;
  };

  useEffect(() => {
    const searchPatients = async () => {
      if (query.length < 2) {
        setResults([]);
        setShowResults(false);
        return;
      }

      setIsSearching(true);
      setShowResults(true);
      const supabase = createClient();
      
      const { data, error } = await supabase
        .from('patients')
        .select('id, name, age, gender, contact')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (!error && data) {
        setResults(data);
      }
      setIsSearching(false);
    };

    const timer = setTimeout(searchPatients, 300);
    return () => clearTimeout(timer);
  }, [query]);
  
  // Find doctor object by name from param, or fallback to first doctor
  const currentDoctor = (doctorNameParam && doctors.find(d => d.name === doctorNameParam)) || 
                       (doctors && doctors.length > 0 ? doctors[0] : null);

  const displayName = currentDoctor ? displayDoctorName(currentDoctor.name) : 'Dr. Consultant';
  const displayQual = currentDoctor?.qualification || 'Medical Professional';

  return (
    <header className={styles.topBar}>
      {/* Hamburger button - mobile only */}
      <button className={styles.menuBtn} onClick={onMenuOpen} aria-label="Open menu">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
      </button>

      <div className={styles.searchWrapper}>
        <svg className={styles.searchIcon} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
        <input 
          className={styles.searchInput} 
          type="text" 
          placeholder="Search patients by name..." 
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
        />

        {showResults && (
          <div className={styles.searchResults}>
            {isSearching ? (
              <div className={styles.noResults}>Searching for '{query}'...</div>
            ) : results.length > 0 ? (
              results.map(patient => (
                <a 
                  key={patient.id} 
                  href={`/portal/doctor/patients/${patient.id}`}
                  className={styles.resultItem}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setShowResults(false)}
                >
                  <div className={styles.resAvatar}>
                    {patient.name.charAt(0)}
                  </div>
                  <div className={styles.resInfo}>
                    <p className={styles.resName}>{patient.name}</p>
                    <p className={styles.resDetails}>
                      {patient.age || 'N/A'} Yrs • {patient.gender || 'N/A'} • {patient.contact || 'No Contact'}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><polyline points="9 18 15 12 9 6"></polyline></svg>
                </a>
              ))
            ) : (
              <div className={styles.noResults}>No patients found matching '{query}'</div>
            )}
          </div>
        )}
      </div>

      <div className={styles.actions}>
        <div className={styles.iconGroup} ref={notifRef}>
          <div className={styles.notifContainer}>
            <button 
              className={styles.iconBtn} 
              title="Notifications" 
              onClick={() => setShowNotifs(!showNotifs)}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
              {notifications.length > 0 && <div className={styles.notifBadge} />}
            </button>

            {showNotifs && (
              <div className={styles.notifDropdown}>
                <div className={styles.notifHeader}>
                  <h4>Notifications</h4>
                  <span>Recent Activity</span>
                </div>
                <div className={styles.notifList}>
                  {notifLoading ? (
                    <div className={styles.notifStatus}>Loading activity...</div>
                  ) : notifError ? (
                    <div className={styles.notifStatus}>Failed to load notifications.</div>
                  ) : notifications.length > 0 ? (
                    notifications.map(n => (
                      <div key={n.id} className={styles.notifItem}>
                        <div className={styles.notifIcon} style={{ background: n.bg }}>
                          {n.icon === 'person_add' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><line x1="19" y1="8" x2="19" y2="14"></line><line x1="22" y1="11" x2="16" y2="11"></line></svg>}
                          {n.icon === 'description' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>}
                          {n.icon === 'assessment' && <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="3" y1="9" x2="21" y2="9"></line><line x1="9" y1="21" x2="9" y2="9"></line></svg>}
                        </div>
                        <div className={styles.notifText}>
                          <h5>{n.title}</h5>
                          <p>{n.desc}</p>
                          <p className={styles.notifTime}>{getTimeAgo(n.time)}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className={styles.notifStatus}>No recent activity yet.</div>
                  )}
                </div>
              </div>
            )}
          </div>
          <button className={styles.iconBtn} title="Prescriptions" onClick={() => router.push('/portal/digital-prescription')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          </button>
        </div>
        
        <div className={styles.divider} />

        <div className={styles.profile} title="Doctor Profile">
          <div className={styles.profileInfo}>
            <p className={styles.userName}>{displayName}</p>
            <p className={styles.userRole}>{displayQual}</p>
          </div>
          <div className={styles.avatarPlaceholder}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
          </div>
        </div>
      </div>
    </header>
  );
}
