'use client';

import { useState, useEffect } from 'react';
import TopBar from '@/components/TopBar';
import { useClinic } from '@/context/ClinicContext';
import { createClient } from '@/lib/supabase/client';
import styles from './page.module.css';

interface BillRecord {
  id: string;
  patient_name: string;
  phone: string;
  amount: number;
  date: string;
}

export default function SearchPage() {
  const { clinic } = useClinic();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<BillRecord[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const supabase = createClient();

  const handleSearch = async () => {
    if (!query) { setResults([]); return; }
    if (!clinic) return;

    setIsSearching(true);
    setHasSearched(true);
    
    try {
      const { data, error } = await supabase
        .from('receipts')
        .select('*')
        .eq('clinic_id', clinic.id)
        .or(`patient_name.ilike.%${query}%,patient_phone.ilike.%${query}%,receipt_number.ilike.%${query}%`)
        .order('printed_at', { ascending: false });

      if (error) throw error;

      if (data) {
        setResults(data.map(r => ({
          id: r.receipt_number,
          patient_name: r.patient_name,
          phone: r.patient_phone,
          amount: r.total_amount,
          date: r.printed_at
        })));
      }
    } catch (err: any) {
      console.error('Search error:', err);
      alert('Error searching records: ' + err.message);
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className={styles.page}>
      <TopBar title="Search Medical Records" backHref="/portal/front-desk" />
      
      <main className={styles.main}>
        <div className={styles.searchBox}>
           <div className={styles.searchRow}>
             <input 
               type="text" 
               className={styles.searchInput} 
               placeholder="Search by NAME, 10-DIGIT PHONE, or RECEIPT NO..."
               value={query}
               onChange={(e) => {
                 const val = e.target.value.toUpperCase();
                 setQuery(val);
               }}
               maxLength={15} // Allowing more for names/receipts but hinting 10 for phones
             />
             <button className="btn-primary" onClick={handleSearch}>Search</button>
           </div>
        </div>

        <div className={styles.resultsArea}>
           <div className={styles.sectionTitle}>
              Search Results
           </div>

           {hasSearched && results.length === 0 && (
             <div className={styles.emptyState}>
               <div className={styles.emptyIcon}>🔍</div>
               <h3>No records found</h3>
               <p>Try searching with a different name or phone number.</p>
             </div>
           )}

           {results.length > 0 && (
             <div className={styles.resultsList}>
               {results.map((record) => (
                 <div key={record.id} className={styles.resultCard}>
                    <div className={styles.resultInfo}>
                       <div className={styles.resName}>{record.patient_name}</div>
                       <div className={styles.resMeta}>
                         <span>📞 {record.phone}</span>
                         <span>📅 {new Date(record.date).toLocaleDateString()}</span>
                       </div>
                    </div>
                    <div className={styles.resAmount}>
                       ₹{record.amount}
                       <div className={styles.resId}>{record.id}</div>
                    </div>
                    <div className={styles.resActions}>
                       <button className="btn-secondary" style={{ padding: '8px 12px', fontSize: 13 }}>View/Print</button>
                    </div>
                 </div>
               ))}
             </div>
           )}
        </div>
      </main>
    </div>
  );
}
