'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useClinic } from '@/context/ClinicContext';
import { createClient } from '@/lib/supabase/client';
import TopBar from '@/components/TopBar';
import styles from './view.module.css';

interface ServiceItem {
  desc: string;
  qty: number;
  amt: number;
}

interface ReceiptData {
  id: string;
  receipt_number: string;
  patient_name: string;
  patient_phone: string;
  patient_age?: string;
  patient_gender?: string;
  doctor_name: string;
  payment_mode: string;
  total_amount: number;
  items_json: string;
  printed_at: string;
  clinic_id: string;
  created_at?: string;
}

export default function WrappedReceiptView() {
  return (
    <Suspense fallback={<div style={{ padding: 100, textAlign: 'center', color: 'var(--ink-l)' }}>Loading preview...</div>}>
      <ReceiptView />
    </Suspense>
  );
}

function ReceiptView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const { clinic } = useClinic();
  
  const [receipt, setReceipt] = useState<ReceiptData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [parsedItems, setParsedItems] = useState<ServiceItem[]>([]);

  useEffect(() => {
    if (!id) {
      setError('Missing receipt ID.');
      setLoading(false);
      return;
    }

    const fetchReceipt = async () => {
      try {
        const supabase = createClient();
        const { data, error: dbError } = await supabase
          .from('receipts')
          .select('*')
          .eq('id', id)
          .eq('clinic_id', clinic?.id ?? '')  // ← enforce clinic ownership
          .single();

        if (dbError) throw dbError;
        if (!data) throw new Error('Receipt not found.');

        setReceipt(data);
        
        // Parse items_json
        let items: ServiceItem[] = [];
        if (data.items_json) {
          try {
            items = typeof data.items_json === 'string' ? JSON.parse(data.items_json) : data.items_json;
          } catch (e) {
            console.error('Failed to parse items_json', e);
          }
        }
        setParsedItems(items);
      } catch (err: any) {
        console.error('Error fetching receipt:', err);
        setError(err.message || 'Failed to load receipt.');
      } finally {
        setLoading(false);
      }
    };

    fetchReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className={styles.page}>
        <TopBar title="View Receipt" backHref="/portal/record-search" />
        <div className={styles.loaderArea}>
          <div className={styles.spinner}></div>
          <p>Retrieving secure receipt details...</p>
        </div>
      </div>
    );
  }

  if (error || !receipt) {
    return (
      <div className={styles.page}>
        <TopBar title="View Receipt" backHref="/portal/record-search" />
        <div className={styles.errorArea}>
          <div className={styles.errorIcon}>⚠️</div>
          <h3>Failed to load receipt</h3>
          <p>{error || 'An unexpected error occurred.'}</p>
          <button className="btn-primary" onClick={() => router.push('/portal/record-search')}>
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const subtotal = parsedItems.reduce((sum, item) => sum + (item.qty * item.amt), 0);
  const discount = subtotal - receipt.total_amount;

  return (
    <div className={styles.page}>
      <TopBar title={`Receipt ${receipt.receipt_number}`} backHref="/portal/record-search" />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <div className={styles.receiptCard} id="receipt-print-area">
            <div className={styles.rcptHeader}>
              <h2>{clinic?.name || 'MediNest Clinic'}</h2>
              <p>{clinic?.address || 'Location Details'}</p>
              {clinic?.phone && <p>📞 {clinic.phone}</p>}
            </div>
            
            <div className={styles.rcptTitle}>CASH RECEIPT</div>

            <div className={styles.rcptInfo}>
              <div className={styles.rcptRow}>
                <span>Patient:</span> <b>{receipt.patient_name}</b>
              </div>
              <div className={styles.rcptRow}>
                <span>Age/Sex:</span> <b>{receipt.patient_age ? `${receipt.patient_age}Y` : '-'} / {receipt.patient_gender ? receipt.patient_gender[0] : '-'}</b>
              </div>
              <div className={styles.rcptRow}>
                <span>Receipt No:</span> <b>{receipt.receipt_number}</b>
              </div>
              <div className={styles.rcptRow}>
                <span>Date:</span> <b>{new Date(receipt.printed_at || receipt.created_at || '').toLocaleDateString('en-IN')}</b>
              </div>
              {receipt.doctor_name && (
                <div className={styles.rcptRow} style={{ gridColumn: 'span 2' }}>
                  <span>Consultant:</span> <b>{receipt.doctor_name}</b>
                </div>
              )}
            </div>

            <table className={styles.rcptTable}>
              <thead>
                <tr>
                  <th style={{ width: 40, textAlign: 'center' }}>#</th>
                  <th>Description</th>
                  <th style={{ width: 60, textAlign: 'center' }}>Qty</th>
                  <th style={{ width: 100, textAlign: 'right' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {parsedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                    <td>{item.desc}</td>
                    <td style={{ textAlign: 'center' }}>{item.qty}</td>
                    <td style={{ textAlign: 'right' }}>₹{item.amt * item.qty}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className={styles.rcptTotals}>
              <div className={styles.rcptTotRow}>
                <span>Subtotal:</span>
                <span>₹{subtotal}</span>
              </div>
              {discount > 0 && (
                <div className={styles.rcptTotRow} style={{ color: 'var(--danger)' }}>
                  <span>Discount:</span>
                  <span>-₹{discount}</span>
                </div>
              )}
              <div className={`${styles.rcptTotRow} ${styles.rcptGrandRow}`}>
                <span>Total ({receipt.payment_mode}):</span>
                <span>₹{receipt.total_amount}</span>
              </div>
            </div>

            <div className={styles.rcptFooter}>
              Thank you! Wishing you a speedy recovery.
            </div>
          </div>

          <div className={styles.actions}>
            <button className="btn-primary" onClick={handlePrint} style={{ flex: 1 }}>
              🖨️ Print Receipt
            </button>
            <button className="btn-secondary" onClick={() => router.push('/portal/record-search')}>
              Back to Records
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
