"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  ArrowLeft, Edit, Trash2, Phone, Mail, Hash, 
  Award, Clock, Calendar, MapPin, FileText, Activity, Users, FileSignature, AlertTriangle
} from "lucide-react";
import Link from "next/link";
import styles from "./page.module.css";

interface Nurse {
  id: string;
  employee_id: string;
  full_name: string;
  gender: string;
  date_of_birth?: string;
  phone: string;
  email?: string;
  qualification: string;
  registration_number?: string;
  department: string;
  primary_ward_id?: string;
  experience_years?: number;
  joining_date?: string;
  shift: string;
  status: string;
  photo_url?: string;
  address?: string;
  notes?: string;
}

interface Ward {
  id: string;
  ward_name: string;
}

export default function NurseProfilePage() {
  const params = useParams();
  const router = useRouter();
  const supabase = createClient();
  
  const [nurse, setNurse] = useState<Nurse | null>(null);
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Edit modal
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeactivateModalOpen, setIsDeactivateModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [formData, setFormData] = useState<Partial<Nurse>>({});

  useEffect(() => {
    fetchData();
  }, [params.id]);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [nurseRes, wardsRes] = await Promise.all([
        supabase.from("nurses").select("*").eq("id", params.id).single(),
        supabase.from("wards").select("id, ward_name")
      ]);

      if (nurseRes.error) throw nurseRes.error;
      
      setNurse(nurseRes.data);
      setFormData(nurseRes.data);
      setWards(wardsRes.data || []);
    } catch (e: any) {
      console.error("Error fetching nurse profile:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdateNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");

    try {
      const submitData = { ...formData };
      if (submitData.date_of_birth === "") submitData.date_of_birth = null as any;
      if (submitData.joining_date === "") submitData.joining_date = null as any;
      if (submitData.registration_number === "") submitData.registration_number = null as any;

      const { data, error } = await supabase
        .from("nurses")
        .update(submitData)
        .eq("id", params.id)
        .select()
        .single();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error("Employee ID, Phone, or Registration Number already exists.");
        }
        throw error;
      }

      setNurse(data);
      setIsEditModalOpen(false);
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeactivate = async () => {
    try {
      const { data, error } = await supabase
        .from("nurses")
        .update({ 
          status: "Inactive", 
          deleted_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id)
        .select()
        .single();
        
      if (error) throw error;
      setNurse(data);
      setFormData(data);
      setIsDeactivateModalOpen(false);
    } catch (e: any) {
      alert("Error deactivating nurse: " + e.message);
    }
  };

  const handleReactivate = async () => {
    try {
      const { data, error } = await supabase
        .from("nurses")
        .update({ 
          status: "Active", 
          deleted_at: null,
          updated_at: new Date().toISOString()
        })
        .eq("id", params.id)
        .select()
        .single();
        
      if (error) throw error;
      setNurse(data);
      setFormData(data);
    } catch (e: any) {
      alert("Error reactivating nurse: " + e.message);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className={styles.container}>
          <div style={{ textAlign: "center", padding: "100px" }}>Loading profile...</div>
        </div>
      </DashboardLayout>
    );
  }

  if (!nurse) {
    return (
      <DashboardLayout>
        <div className={styles.container}>
          <div style={{ textAlign: "center", padding: "100px" }}>Nurse not found.</div>
          <div style={{ textAlign: "center" }}>
            <Link href="/portal/nurse-management" className={styles.backLink}>
              <ArrowLeft size={16} /> Back to Nurse Management
            </Link>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const getWardName = (wardId?: string) => {
    if (!wardId) return "Unassigned";
    const ward = wards.find(w => w.id === wardId);
    return ward ? ward.ward_name : "Unknown";
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case "Active": return styles.badgeActive;
      case "On Leave": return styles.badgeLeave;
      case "Suspended": return styles.badgeSuspended;
      default: return styles.badgeInactive;
    }
  };

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <Link href="/portal/nurse-management" className={styles.backLink}>
            <ArrowLeft size={16} /> Back to Nurses
          </Link>
          <div className={styles.actions}>
            <button className={styles.btnAction} onClick={() => setIsEditModalOpen(true)}>
              <Edit size={16} /> Edit Profile
            </button>
            {nurse.status !== "Inactive" ? (
              <button className={`${styles.btnAction} ${styles.btnDanger}`} onClick={() => setIsDeactivateModalOpen(true)}>
                <Trash2 size={16} /> Deactivate Nurse
              </button>
            ) : (
              <button className={`${styles.btnAction}`} onClick={handleReactivate}>
                <Activity size={16} /> Reactivate Nurse
              </button>
            )}
          </div>
        </div>

        {nurse.status === "Inactive" && (
          <div className={styles.inactiveBanner}>
            <AlertTriangle size={18} />
            This nurse is currently inactive and cannot receive new assignments.
          </div>
        )}

        <div className={styles.profileCard}>
          <div className={styles.profileSidebar}>
            <div className={styles.avatar}>
              {nurse.photo_url ? (
                <img src={nurse.photo_url} alt={nurse.full_name} />
              ) : (
                nurse.full_name.charAt(0)
              )}
            </div>
            <h2 className={styles.name}>{nurse.full_name}</h2>
            <div className={styles.title}>{nurse.department} Nurse</div>
            
            <span className={`${styles.badge} ${getStatusBadgeClass(nurse.status)}`}>
              {nurse.status}
            </span>

            <div className={styles.contactInfo}>
              <div className={styles.contactItem}>
                <Hash size={16} className={styles.contactIcon} /> 
                ID: {nurse.employee_id}
              </div>
              <div className={styles.contactItem}>
                <Phone size={16} className={styles.contactIcon} /> 
                {nurse.phone}
              </div>
              {nurse.email && (
                <div className={styles.contactItem}>
                  <Mail size={16} className={styles.contactIcon} /> 
                  {nurse.email}
                </div>
              )}
            </div>
          </div>

          <div className={styles.profileDetails}>
            <h3 className={styles.sectionTitle}>
              <FileText size={20} /> Professional Details
            </h3>
            
            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Department</span>
                <span className={styles.detailValue}>{nurse.department}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Primary Ward</span>
                <span className={styles.detailValue}>{getWardName(nurse.primary_ward_id)}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Assigned Shift</span>
                <span className={styles.detailValue}>{nurse.shift}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Qualification</span>
                <span className={styles.detailValue}>{nurse.qualification}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Registration Number</span>
                <span className={styles.detailValue}>{nurse.registration_number || "N/A"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Experience</span>
                <span className={styles.detailValue}>{nurse.experience_years ? `${nurse.experience_years} Years` : "N/A"}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Joining Date</span>
                <span className={styles.detailValue}>{nurse.joining_date || "N/A"}</span>
              </div>
            </div>

            <h3 className={styles.sectionTitle} style={{ marginTop: '32px' }}>
              <Award size={20} /> Personal Details
            </h3>

            <div className={styles.detailsGrid}>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Gender</span>
                <span className={styles.detailValue}>{nurse.gender}</span>
              </div>
              <div className={styles.detailItem}>
                <span className={styles.detailLabel}>Date of Birth</span>
                <span className={styles.detailValue}>{nurse.date_of_birth || "N/A"}</span>
              </div>
              <div className={styles.detailItem} style={{ gridColumn: '1 / -1' }}>
                <span className={styles.detailLabel}>Residential Address</span>
                <span className={styles.detailValue}>{nurse.address || "N/A"}</span>
              </div>
            </div>

            {nurse.notes && (
              <div className={styles.notesSection}>
                <div className={styles.detailLabel} style={{ marginBottom: '8px' }}>Administrative Notes</div>
                <div className={styles.detailValue}>{nurse.notes}</div>
              </div>
            )}
          </div>
        </div>

        {/* Future Integrations */}
        <h3 className={styles.sectionTitle} style={{ marginBottom: '16px' }}>
          Nursing Operations (Coming Soon)
        </h3>
        <div className={styles.futureGrid}>
          <div className={styles.futureCard}>
            <Users size={32} className={styles.futureIcon} />
            <div className={styles.futureTitle}>Patient Assignments</div>
            <div className={styles.futureDesc}>Assign and view patients currently under this nurse's care.</div>
          </div>
          <div className={styles.futureCard}>
            <Activity size={32} className={styles.futureIcon} />
            <div className={styles.futureTitle}>Nursing Notes & Vitals</div>
            <div className={styles.futureDesc}>Track patient vitals and nursing observations.</div>
          </div>
          <div className={styles.futureCard}>
            <FileSignature size={32} className={styles.futureIcon} />
            <div className={styles.futureTitle}>Shift Handover</div>
            <div className={styles.futureDesc}>Manage handovers and duty roster between shifts.</div>
          </div>
        </div>

        {/* Edit Modal */}
        {isEditModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsEditModalOpen(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Edit Nurse Profile</h3>
                <button className={styles.btnClose} onClick={() => setIsEditModalOpen(false)}>✕</button>
              </div>
              
              <div className={styles.modalBody}>
                {errorMsg && <div className={styles.errorText}>{errorMsg}</div>}
                
                <form id="editNurseForm" onSubmit={handleUpdateNurse} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name *</label>
                    <input type="text" name="full_name" className={styles.input} required value={formData.full_name || ""} onChange={handleInputChange} />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Employee ID *</label>
                    <input type="text" name="employee_id" className={styles.input} required value={formData.employee_id || ""} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Gender *</label>
                    <select name="gender" className={styles.select} required value={formData.gender || ""} onChange={handleInputChange}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Date of Birth</label>
                    <input type="date" name="date_of_birth" className={styles.input} value={formData.date_of_birth || ""} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number *</label>
                    <input type="tel" name="phone" className={styles.input} required value={formData.phone || ""} onChange={handleInputChange} maxLength={10} pattern="[0-9]{10}" title="Please enter a valid 10-digit phone number" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email Address</label>
                    <input type="email" name="email" className={styles.input} value={formData.email || ""} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Qualification *</label>
                    <input type="text" name="qualification" className={styles.input} required value={formData.qualification || ""} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Registration Number</label>
                    <input type="text" name="registration_number" className={styles.input} value={formData.registration_number || ""} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Department *</label>
                    <input type="text" name="department" className={styles.input} required value={formData.department || ""} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Primary Ward *</label>
                    <select name="primary_ward_id" className={styles.select} required value={formData.primary_ward_id || ""} onChange={handleInputChange}>
                      <option value="">Select Ward</option>
                      {wards.map(ward => (
                        <option key={ward.id} value={ward.id}>{ward.ward_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Shift *</label>
                    <select name="shift" className={styles.select} required value={formData.shift || ""} onChange={handleInputChange}>
                      <option value="Morning">Morning (06:00 - 14:00)</option>
                      <option value="Evening">Evening (14:00 - 22:00)</option>
                      <option value="Night">Night (22:00 - 06:00)</option>
                      <option value="General">General (09:00 - 17:00)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status *</label>
                    <select name="status" className={styles.select} required value={formData.status || ""} onChange={handleInputChange}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Experience (Years)</label>
                    <input type="number" name="experience_years" className={styles.input} min="0" value={formData.experience_years || 0} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Joining Date</label>
                    <input type="date" name="joining_date" className={styles.input} value={formData.joining_date || ""} onChange={handleInputChange} />
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Photo URL</label>
                    <input type="text" name="photo_url" className={styles.input} value={formData.photo_url || ""} onChange={handleInputChange} />
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Address</label>
                    <textarea name="address" className={styles.textarea} value={formData.address || ""} onChange={handleInputChange}></textarea>
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Notes</label>
                    <textarea name="notes" className={styles.textarea} value={formData.notes || ""} onChange={handleInputChange}></textarea>
                  </div>
                </form>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={() => setIsEditModalOpen(false)}>Cancel</button>
                <button type="submit" form="editNurseForm" className={styles.btnSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Deactivate Modal */}
        {isDeactivateModalOpen && (
          <div className={styles.dialogOverlay} onClick={() => setIsDeactivateModalOpen(false)}>
            <div className={styles.dialogContent} onClick={e => e.stopPropagation()}>
              <h3 className={styles.dialogTitle}>Deactivate Nurse</h3>
              <div className={styles.dialogMessage}>
                This nurse will no longer appear in active lists and cannot be assigned to new patients or wards.
                <br /><br />
                Existing historical records will be preserved. This action can be reversed later.
              </div>
              <div className={styles.dialogActions}>
                <button className={styles.btnCancel} onClick={() => setIsDeactivateModalOpen(false)}>Cancel</button>
                <button className={styles.btnDeactivate} onClick={handleDeactivate}>Deactivate</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
