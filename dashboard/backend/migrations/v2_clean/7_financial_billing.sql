-- ==========================================
-- 7. FINANCIAL BILLING: RECEIPTS
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Receipts Table
CREATE TABLE IF NOT EXISTS receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID NOT NULL REFERENCES clinics(id) ON DELETE CASCADE,
    receipt_number TEXT NOT NULL,
    
    patient_name TEXT NOT NULL,
    patient_phone TEXT,
    patient_age TEXT,
    patient_gender TEXT,
    doctor_name TEXT,
    
    payment_mode TEXT NOT NULL DEFAULT 'Cash' 
        CHECK (payment_mode IN ('Cash', 'UPI', 'Card', 'Other')),
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    items_json JSONB DEFAULT '[]'::jsonb, -- List of services rendered
    
    printed_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Financial Indexes
CREATE INDEX idx_receipts_clinic ON receipts(clinic_id);
CREATE INDEX idx_receipts_number ON receipts(receipt_number);
CREATE INDEX idx_receipts_date ON receipts(printed_at);

-- 3. Row Level Security (RLS)
ALTER TABLE receipts ENABLE ROW LEVEL SECURITY;

-- Scoped to clinic owners
CREATE POLICY "Clinic owners can manage receipts" ON receipts
USING (EXISTS (SELECT 1 FROM clinics WHERE id = receipts.clinic_id AND owner_user_id = auth.uid()));
