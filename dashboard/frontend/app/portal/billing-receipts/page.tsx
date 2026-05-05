'use client';

import { useState } from 'react';
import TopBar from '@/components/TopBar';
import { useClinic } from '@/context/ClinicContext';
import { createClient } from '@/lib/supabase/client';
import { API_BASE_URL, authenticatedFetch } from '@/lib/api';
import styles from './page.module.css';

interface ServiceItem {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export default function BillingPage() {
  const { clinic, doctors } = useClinic();
  const [phone, setPhone] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState('Male');
  const [doctor, setDoctor] = useState('');
  
  const [regNo, setRegNo] = useState('');
  const [items, setItems] = useState<ServiceItem[]>([
    { id: '1', name: 'Consultation', qty: 1, price: 500 }
  ]);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState('Cash');
  const [isSaving, setIsSaving] = useState(false);

  const addItem = () => {
    setItems([...items, { id: Date.now().toString(), name: '', qty: 1, price: 0 }]);
  };

  const updateItem = (id: string, field: keyof ServiceItem, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const subtotal = items.reduce((sum, item) => sum + (item.qty * item.price), 0);
  const total = subtotal - discount;

  const handleSave = async () => {
    if (!name || items.length === 0) {
      alert('Please fill patient name and add at least one service.');
      return;
    }

    if (!clinic?.id) {
       alert('Clinic information not loaded. Please wait for the page to fully load.');
       return;
    }
    
    setIsSaving(true);
    const supabase = createClient();
    
    try {
      const receiptNo = `REC-${Date.now().toString().slice(-6)}`;
      const receiptData = {
        receipt_number: receiptNo,
        patient_name: name,
        patient_phone: phone,
        patient_age: age,
        patient_gender: gender,
        doctor_name: doctor,
        payment_mode: paymentMode,
        total_amount: total,
        items_json: JSON.stringify(items.map(it => ({ desc: it.name, qty: it.qty, amt: it.price }))),
        printed_at: new Date().toISOString(),
        clinic_id: clinic.id
      };

      const response = await authenticatedFetch(`${API_BASE_URL}/api/analytics/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ receiptData })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
      
      alert(`Receipt ${receiptNo} saved successfully!`);
      window.print();
    } catch (err: any) {
      console.error('❌ Secure Save Failure:', err);
      alert('Failed to save receipt: ' + (err.message || 'Check backend connection.'));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className={styles.page}>
      <TopBar title="New Bill & Receipt" backHref="/portal/front-desk" />
      
      <main className={styles.main}>
        <div className={styles.grid}>
          {/* Form Side */}
          <div className={styles.formPanel}>
            <div className={styles.panelBlock}>
              <h3 className={styles.blockTitle}>Patient Details</h3>
              <div className="field">
                <label>Phone Number (10-digits)</label>
                <input 
                  type="tel" 
                  value={phone} 
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                    setPhone(val);
                  }} 
                  placeholder="e.g. 9876543210" 
                  maxLength={10}
                />
              </div>
              <div className="field">
                <label>Patient Name</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value.toUpperCase())} 
                  placeholder="e.g. RAHUL KUMAR" 
                />
              </div>
              <div className={styles.row2}>
                <div className="field">
                  <label>Age</label>
                  <input 
                    type="number" 
                    value={age} 
                    onChange={(e) => setAge(e.target.value)} 
                    placeholder="Years" 
                  />
                </div>
                <div className="field">
                  <label>Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)}>
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>
              <div className="field">
                 <label>Consulting Doctor</label>
                 <select value={doctor} onChange={e => setDoctor(e.target.value)}>
                   <option value="">Select Doctor...</option>
                   {doctors.map(d => (
                     <option key={d.id} value={d.name}>{d.name}</option>
                   ))}
                 </select>
              </div>
            </div>

            <div className={styles.panelBlock}>
              <h3 className={styles.blockTitle}>Services & Charges</h3>
              
              {items.map((item, index) => (
                <div key={item.id} className={styles.itemRow}>
                  <div className={styles.itemIndex}>{index + 1}</div>
                  <div className="field" style={{ flex: 2, marginBottom: 0 }}>
                    <input 
                      type="text" 
                      value={item.name} 
                      onChange={(e) => updateItem(item.id, 'name', e.target.value)} 
                      placeholder="Service name (e.g. Consultation)" 
                    />
                  </div>
                  <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <input 
                      type="number" 
                      value={item.qty} 
                      onChange={(e) => updateItem(item.id, 'qty', parseInt(e.target.value) || 0)} 
                      placeholder="Qty" 
                    />
                  </div>
                  <div className="field" style={{ flex: 1, marginBottom: 0 }}>
                    <input 
                      type="number" 
                      value={item.price} 
                      onChange={(e) => updateItem(item.id, 'price', parseInt(e.target.value) || 0)} 
                      placeholder="Price" 
                    />
                  </div>
                  <button className={styles.btnRemove} onClick={() => removeItem(item.id)}>×</button>
                </div>
              ))}

              <button className={styles.btnAddItem} onClick={addItem}>+ Add Service</button>
            </div>

            <div className={styles.panelBlock}>
               <h3 className={styles.blockTitle}>Payment</h3>
               <div className={styles.row2}>
                 <div className="field">
                    <label>Discount (₹)</label>
                    <input 
                      type="number" 
                      value={discount} 
                      onChange={(e) => setDiscount(parseInt(e.target.value) || 0)} 
                    />
                 </div>
                 <div className="field">
                   <label>Payment Mode</label>
                   <select value={paymentMode} onChange={e => setPaymentMode(e.target.value)}>
                     <option>Cash</option>
                     <option>UPI</option>
                     <option>Card</option>
                   </select>
                 </div>
               </div>
            </div>
          </div>

          {/* Preview Side */}
          <div className={styles.previewPanel}>
             <div className={styles.receiptCard} id="receipt-preview">
                <div className={styles.rcptHeader}>
                   <h2>{clinic?.name}</h2>
                   <p>{clinic?.address}</p>
                   <p>{clinic?.phone}</p>
                </div>
                <div className={styles.rcptTitle}>CASH RECEIPT</div>

                <div className={styles.rcptInfo}>
                  <div className={styles.rcptRow}><span>Patient:</span> <b>{name || '(Not entered)'}</b></div>
                  <div className={styles.rcptRow}><span>Age/Sex:</span> <b>{age ? `${age}Y` : '-'} / {gender[0]}</b></div>
                  {doctor && <div className={styles.rcptRow}><span>Doctor:</span> <b>{doctor}</b></div>}
                  <div className={styles.rcptRow}><span>Date:</span> <b>{new Date().toLocaleDateString('en-IN')}</b></div>
                </div>

                <table className={styles.rcptTable}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: 'center' }}>#</th>
                      <th>Description</th>
                      <th style={{ textAlign: 'center' }}>Qty</th>
                      <th style={{ textAlign: 'right' }}>Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, idx) => (
                      <tr key={item.id}>
                        <td style={{ textAlign: 'center' }}>{idx + 1}</td>
                        <td>{item.name || '---'}</td>
                        <td style={{ textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ textAlign: 'right' }}>₹{item.price * item.qty}</td>
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
                     <span>Total ({paymentMode}):</span>
                     <span>₹{total}</span>
                   </div>
                </div>
                <div className={styles.rcptFooter}>
                  Thank you! Wishing you a speedy recovery.
                </div>
             </div>

             <div className={styles.actionBtns}>
                <button className="btn-primary" onClick={handleSave} style={{ flex: 1 }}>Save & Print</button>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}
