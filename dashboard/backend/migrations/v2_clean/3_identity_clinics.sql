-- ==========================================
-- 3. IDENTITY & CLINIC SETUP
-- MediNest v2.0 Modular Architecture
-- ==========================================

-- 1. Clinics Table
CREATE TABLE IF NOT EXISTS clinics (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    name_hindi TEXT,
    phone TEXT NOT NULL,
    address TEXT,
    tagline TEXT DEFAULT 'Quality Healthcare for All',
    email TEXT,
    owner_user_id UUID NOT NULL, -- Links to auth.users
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'pending', 'suspended')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Doctors Table (Global Registry)
CREATE TABLE IF NOT EXISTS doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    qualification TEXT,
    contact TEXT,
    specialty TEXT DEFAULT 'General Consultant',
    registration_number TEXT,
    license_expiry_date DATE,
    profile_photo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Clinic-Doctor Junction (Context-Specific)
CREATE TABLE IF NOT EXISTS clinic_doctors (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    clinic_id UUID REFERENCES clinics(id) ON DELETE CASCADE,
    doctor_id UUID REFERENCES doctors(id) ON DELETE CASCADE,
    display_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    is_admin BOOLEAN DEFAULT false,
    joined_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(clinic_id, doctor_id)
);

-- 4. Triggers for updated_at
CREATE TRIGGER tr_clinics_updated_at BEFORE UPDATE ON clinics FOR EACH ROW EXECUTE FUNCTION handle_updated_at();
CREATE TRIGGER tr_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION handle_updated_at();

-- 5. Row Level Security (RLS)
ALTER TABLE clinics ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE clinic_doctors ENABLE ROW LEVEL SECURITY;

-- Policies for Clinics
CREATE POLICY "Users can view their own clinic" ON clinics FOR SELECT USING (auth.uid() = owner_user_id);
CREATE POLICY "Users can update their own clinic" ON clinics FOR UPDATE USING (auth.uid() = owner_user_id);

-- Policies for Doctors (Readable by authenticated users)
CREATE POLICY "Authenticated users can view doctors" ON doctors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert doctors" ON doctors FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update doctors" ON doctors FOR UPDATE TO authenticated USING (true);

-- Policies for Clinic_Doctors
CREATE POLICY "Clinic members can view members" ON clinic_doctors FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM clinics WHERE id = clinic_id AND owner_user_id = auth.uid())
);
CREATE POLICY "Clinic owners can manage members" ON clinic_doctors FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM clinics WHERE id = clinic_id AND owner_user_id = auth.uid())
);
