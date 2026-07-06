"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import { createClient } from "@/lib/supabase/client";
import { 
  Users, UserPlus, Search, Edit, Trash2, 
  UserX, Clock, Moon, Sun, Filter, UserCheck 
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

export default function NurseManagementPage() {
  const supabase = createClient();
  const [nurses, setNurses] = useState<Nurse[]>([]);
  const [wards, setWards] = useState<Ward[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterShift, setFilterShift] = useState("");
  const [filterStatus, setFilterStatus] = useState("Active");
  
  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const [formData, setFormData] = useState<Partial<Nurse>>({
    full_name: "",
    employee_id: "",
    gender: "",
    phone: "",
    email: "",
    qualification: "",
    registration_number: "",
    department: "",
    primary_ward_id: "",
    shift: "General",
    status: "Active",
    experience_years: 0,
    photo_url: "",
    address: "",
    notes: "",
    date_of_birth: "",
    joining_date: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [nursesRes, wardsRes] = await Promise.all([
        supabase.from("nurses").select(`
          *,
          nurse_ward_assignments (
            ward_id,
            assignment_type,
            is_active
          )
        `).order("created_at", { ascending: false }),
        supabase.from("wards").select("id, ward_name")
      ]);

      if (nursesRes.error) throw nursesRes.error;
      if (wardsRes.error) throw wardsRes.error;

      // Map Primary ward from junction table for UI backward compatibility
      const processedNurses = (nursesRes.data || []).map((nurse: any) => {
        const primaryAssignment = nurse.nurse_ward_assignments?.find(
          (a: any) => a.assignment_type === 'Primary' && a.is_active
        );
        return {
          ...nurse,
          primary_ward_id: primaryAssignment ? primaryAssignment.ward_id : nurse.primary_ward_id
        };
      });

      setNurses(processedNurses);
      setWards(wardsRes.data || []);
    } catch (e: any) {
      console.error("Error fetching data:", e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddNurse = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setErrorMsg("");

    try {
      // Basic validation (employee_id is now auto-generated so we don't validate it here)
      if (!formData.full_name || !formData.gender || !formData.phone || !formData.qualification || !formData.department || !formData.primary_ward_id || !formData.shift || !formData.status) {
        throw new Error("Please fill all required fields.");
      }

      // Convert empty strings to null for optional unique/date fields
      const submitData = { ...formData };
      delete submitData.employee_id; // Let the database trigger generate this safely
      
      if (submitData.date_of_birth === "") submitData.date_of_birth = null as any;
      if (submitData.joining_date === "") submitData.joining_date = null as any;
      if (submitData.registration_number === "") submitData.registration_number = null as any;

      const { data, error } = await supabase.from("nurses").insert([submitData]).select();
      
      if (error) {
        if (error.code === '23505') {
          throw new Error("Phone or Registration Number already exists.");
        }
        throw new Error("Unable to create Nurse record. Please try again.");
      }

      const newNurse = data[0];

      // Create primary ward assignment in the new junction table
      if (submitData.primary_ward_id) {
        const { error: assignmentError } = await supabase.from("nurse_ward_assignments").insert([{
          nurse_id: newNurse.id,
          ward_id: submitData.primary_ward_id,
          assignment_type: 'Primary'
        }]);
        if (assignmentError) throw assignmentError;
      }

      // Add dummy assignment data to state to reflect properly in UI
      const nurseToState = {
        ...newNurse,
        nurse_ward_assignments: submitData.primary_ward_id ? [{
          ward_id: submitData.primary_ward_id,
          assignment_type: 'Primary',
          is_active: true
        }] : []
      };

      setNurses(prev => [nurseToState, ...prev]);
      setIsAddModalOpen(false);
      resetForm();
    } catch (e: any) {
      setErrorMsg(e.message);
    } finally {
      setIsSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      full_name: "",
      employee_id: "",
      gender: "",
      phone: "",
      email: "",
      qualification: "",
      registration_number: "",
      department: "",
      primary_ward_id: "",
      shift: "General",
      status: "Active",
      experience_years: 0,
      photo_url: "",
      address: "",
      notes: "",
      date_of_birth: "",
      joining_date: new Date().toISOString().split('T')[0]
    });
  };

  const filteredNurses = nurses.filter(nurse => {
    const matchesSearch = 
      nurse.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nurse.employee_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      nurse.phone.includes(searchQuery) ||
      (nurse.email && nurse.email.toLowerCase().includes(searchQuery.toLowerCase()));
      
    const matchesShift = filterShift ? nurse.shift === filterShift : true;
    const matchesStatus = (filterStatus === "All" || !filterStatus) ? true : nurse.status === filterStatus;

    return matchesSearch && matchesShift && matchesStatus;
  });

  const getWardName = (wardId?: string) => {
    if (!wardId) return "Unassigned";
    const ward = wards.find(w => w.id === wardId);
    return ward ? ward.ward_name : "Unknown";
  };

  const getShiftBadgeClass = (shift: string) => {
    switch(shift) {
      case "Morning": return styles.badgeShiftMorning;
      case "Evening": return styles.badgeShiftEvening;
      case "Night": return styles.badgeShiftNight;
      default: return styles.badgeShiftGeneral;
    }
  };

  const getStatusBadgeClass = (status: string) => {
    switch(status) {
      case "Active": return styles.badgeActive;
      case "On Leave": return styles.badgeLeave;
      case "Suspended": return styles.badgeSuspended;
      default: return styles.badgeInactive;
    }
  };

  // Stats
  const activeNurses = nurses.filter(n => n.status === "Active").length;
  const onLeaveNurses = nurses.filter(n => n.status === "On Leave").length;
  const nightShiftNurses = nurses.filter(n => n.shift === "Night").length;
  const inactiveNurses = nurses.filter(n => n.status === "Inactive").length;

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <div className={styles.header}>
          <div>
            <h1 className={styles.title}>Nurse Management</h1>
            <p className={styles.subtitle}>Manage nursing staff, assignments, and schedules.</p>
          </div>
          <div className={styles.headerActions}>
            <button className={styles.btnAdd} onClick={() => setIsAddModalOpen(true)}>
              <UserPlus size={16} /> Add Nurse
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className={styles.statsGrid}>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconBlue}`}>
              <Users size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{nurses.length}</span>
              <span className={styles.statLabel}>Total Nurses</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconGreen}`}>
              <UserCheck size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{activeNurses}</span>
              <span className={styles.statLabel}>Active</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconOrange}`}>
              <Sun size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{onLeaveNurses}</span>
              <span className={styles.statLabel}>On Leave</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconPurple}`}>
              <Moon size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{nightShiftNurses}</span>
              <span className={styles.statLabel}>Night Shift</span>
            </div>
          </div>
          <div className={styles.statCard}>
            <div className={`${styles.statIcon} ${styles.iconRed}`}>
              <UserX size={24} />
            </div>
            <div className={styles.statInfo}>
              <span className={styles.statValue}>{inactiveNurses}</span>
              <span className={styles.statLabel}>Inactive</span>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className={styles.headerActions} style={{ marginBottom: '20px' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 10, top: 12, color: '#94a3b8' }} />
            <input 
              type="text" 
              placeholder="Search ID, Name, Phone..." 
              className={styles.searchInput}
              style={{ paddingLeft: 34 }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className={styles.filterSelect} value={filterShift} onChange={(e) => setFilterShift(e.target.value)}>
            <option value="">All Shifts</option>
            <option value="Morning">Morning</option>
            <option value="Evening">Evening</option>
            <option value="Night">Night</option>
            <option value="General">General</option>
          </select>
          <select className={styles.filterSelect} value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="All">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Inactive">Inactive</option>
            <option value="On Leave">On Leave</option>
            <option value="Suspended">Suspended</option>
          </select>
        </div>

        {/* Table */}
        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Nurse Profile</th>
                <th>Department & Ward</th>
                <th>Contact</th>
                <th>Shift</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px' }}>Loading nurses...</td>
                </tr>
              ) : filteredNurses.length === 0 ? (
                <tr>
                  <td colSpan={6}>
                    <div className={styles.emptyState}>
                      No nurses found matching your criteria.
                    </div>
                  </td>
                </tr>
              ) : (
                filteredNurses.map(nurse => (
                  <tr key={nurse.id}>
                    <td>
                      <div className={styles.nurseInfo}>
                        <div className={styles.nurseAvatar}>
                          {nurse.photo_url ? (
                            <img src={nurse.photo_url} alt={nurse.full_name} />
                          ) : (
                            nurse.full_name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className={styles.nurseName}>{nurse.full_name}</div>
                          <div className={styles.nurseId}>ID: {nurse.employee_id}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{nurse.department}</div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{getWardName(nurse.primary_ward_id)}</div>
                    </td>
                    <td>
                      <div>{nurse.phone}</div>
                      {nurse.email && <div style={{ fontSize: 12, color: '#64748b' }}>{nurse.email}</div>}
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getShiftBadgeClass(nurse.shift)}`}>
                        {nurse.shift}
                      </span>
                    </td>
                    <td>
                      <span className={`${styles.badge} ${getStatusBadgeClass(nurse.status)}`}>
                        {nurse.status}
                      </span>
                    </td>
                    <td>
                      <div className={styles.actions}>
                        <Link href={`/portal/nurse-management/${nurse.id}`}>
                          <button className={styles.btnAction} title="View Profile">
                            <Search size={16} />
                          </button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Add Modal */}
        {isAddModalOpen && (
          <div className={styles.modalOverlay} onClick={() => setIsAddModalOpen(false)}>
            <div className={styles.modalContent} onClick={e => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3 className={styles.modalTitle}>Add New Nurse</h3>
                <button className={styles.btnClose} onClick={() => setIsAddModalOpen(false)}>✕</button>
              </div>
              
              <div className={styles.modalBody}>
                {errorMsg && <div className={styles.errorText}>{errorMsg}</div>}
                
                <form id="addNurseForm" onSubmit={handleAddNurse} className={styles.formGrid}>
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Full Name *</label>
                    <input type="text" name="full_name" className={styles.input} required value={formData.full_name} onChange={handleInputChange} />
                  </div>
                  
                  <div className={styles.formGroup}>
                    <label className={styles.label}>Employee ID</label>
                    <input type="text" className={styles.input} disabled value="(Auto Generated)" style={{ opacity: 0.7, cursor: 'not-allowed', backgroundColor: '#f1f5f9' }} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Gender *</label>
                    <select name="gender" className={styles.select} required value={formData.gender} onChange={handleInputChange}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Date of Birth</label>
                    <input type="date" name="date_of_birth" className={styles.input} value={formData.date_of_birth} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Phone Number *</label>
                    <input type="tel" name="phone" className={styles.input} required value={formData.phone} onChange={handleInputChange} maxLength={10} pattern="[0-9]{10}" title="Please enter a valid 10-digit phone number" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Email Address</label>
                    <input type="email" name="email" className={styles.input} value={formData.email} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Qualification *</label>
                    <input type="text" name="qualification" className={styles.input} required value={formData.qualification} onChange={handleInputChange} placeholder="e.g. B.Sc Nursing" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Registration Number</label>
                    <input type="text" name="registration_number" className={styles.input} value={formData.registration_number} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Department *</label>
                    <input type="text" name="department" className={styles.input} required value={formData.department} onChange={handleInputChange} placeholder="e.g. ICU, Emergency" />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Primary Ward *</label>
                    <select name="primary_ward_id" className={styles.select} required value={formData.primary_ward_id} onChange={handleInputChange}>
                      <option value="">Select Ward</option>
                      {wards.map(ward => (
                        <option key={ward.id} value={ward.id}>{ward.ward_name}</option>
                      ))}
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Shift *</label>
                    <select name="shift" className={styles.select} required value={formData.shift} onChange={handleInputChange}>
                      <option value="Morning">Morning (06:00 - 14:00)</option>
                      <option value="Evening">Evening (14:00 - 22:00)</option>
                      <option value="Night">Night (22:00 - 06:00)</option>
                      <option value="General">General (09:00 - 17:00)</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Status *</label>
                    <select name="status" className={styles.select} required value={formData.status} onChange={handleInputChange}>
                      <option value="Active">Active</option>
                      <option value="Inactive">Inactive</option>
                      <option value="On Leave">On Leave</option>
                      <option value="Suspended">Suspended</option>
                    </select>
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Experience (Years)</label>
                    <input type="number" name="experience_years" className={styles.input} min="0" value={formData.experience_years} onChange={handleInputChange} />
                  </div>

                  <div className={styles.formGroup}>
                    <label className={styles.label}>Joining Date</label>
                    <input type="date" name="joining_date" className={styles.input} value={formData.joining_date} onChange={handleInputChange} />
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Photo URL</label>
                    <input type="text" name="photo_url" className={styles.input} value={formData.photo_url} onChange={handleInputChange} placeholder="https://..." />
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Address</label>
                    <textarea name="address" className={styles.textarea} value={formData.address} onChange={handleInputChange}></textarea>
                  </div>

                  <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                    <label className={styles.label}>Notes</label>
                    <textarea name="notes" className={styles.textarea} value={formData.notes} onChange={handleInputChange} placeholder="Any additional information..."></textarea>
                  </div>
                </form>
              </div>

              <div className={styles.modalActions}>
                <button className={styles.btnCancel} onClick={() => setIsAddModalOpen(false)}>Cancel</button>
                <button type="submit" form="addNurseForm" className={styles.btnSave} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Add Nurse"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
