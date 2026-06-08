import { useState, useEffect } from "react";
import "./App.css";

interface Doctor {
  id: string;
  name: string;
  specialty: string;
  qualification: string;
}

interface ClinicDoctor {
  id: string;
  clinic_id: string;
  doctor_id: string;
  doctors?: Doctor;
}

interface Clinic {
  id: string;
  name: string;
  name_hindi?: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  status: "pending" | "active" | "suspended";
  created_at: string;
  clinic_doctors?: ClinicDoctor[];
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4002/api";


export default function App() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<
    "all" | "pending" | "active" | "suspended"
  >("all");
  const [search, setSearch] = useState("");
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null);

  // Toast state
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const triggerToast = (msg: string) => {
    setToastMsg(msg);
    setShowToast(true);
  };

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const loadClinics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/clinics`);
      const json = await res.json();
      if (json.success) {
        setClinics(json.data || []);
      } else {
        triggerToast("Error loading clinics: " + json.error);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Server error getting clinics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClinics();
  }, []);

  const updateStatus = async (
    clinicId: string,
    status: "active" | "suspended",
  ) => {
    const label = status === "active" ? "Approve" : "Suspend";
    if (!confirm(`Are you sure you want to ${label} this clinic?`)) return;

    try {
      const res = await fetch(`${API_URL}/clinics/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clinicId, status }),
      });
      const json = await res.json();

      if (json.success) {
        setClinics((prev) =>
          prev.map((c) => (c.id === clinicId ? { ...c, status } : c)),
        );
        if (selectedClinic && selectedClinic.id === clinicId) {
          setSelectedClinic((prev) => (prev ? { ...prev, status } : null));
        }
        triggerToast(
          status === "active" ? "Clinic approved!" : "Clinic suspended",
        );
      } else {
        triggerToast("Update failed: " + json.error);
      }
    } catch (err: any) {
      console.error(err);
      triggerToast("Connection error");
    }
  };

  // Stats
  const totalCount = clinics.length;
  const pendingCount = clinics.filter((c) => c.status === "pending").length;
  const activeCount = clinics.filter((c) => c.status === "active").length;
  const suspendedCount = clinics.filter((c) => c.status === "suspended").length;

  // Filter & Search
  const filteredClinics = clinics.filter((c) => {
    const matchesFilter = filter === "all" || c.status === filter;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="app">
      <header>
        <div className="header-logo">
          <img src="/logo.png" className="logo-img" alt="MedieNest Logo" />
          <h1>MedieNest Admin</h1>
          <div className="badge">Super Admin</div>
        </div>
        <div>
          <button className="refresh-btn" onClick={loadClinics}>
            Refresh
          </button>
        </div>
      </header>

      <div className="stats-bar">
        <div className="stat-card">
          <div className="stat-num num-total">{totalCount}</div>
          <div className="stat-label">Total Clinics</div>
        </div>
        <div className="stat-card">
          <div className="stat-num num-pending">{pendingCount}</div>
          <div className="stat-label">Pending</div>
        </div>
        <div className="stat-card">
          <div className="stat-num num-active">{activeCount}</div>
          <div className="stat-label">Active</div>
        </div>
        <div className="stat-card">
          <div className="stat-num num-suspended">{suspendedCount}</div>
          <div className="stat-label">Suspended</div>
        </div>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          className="search-input"
          placeholder="Search by clinic name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="filter-chips">
          {(["all", "pending", "active", "suspended"] as const).map((type) => (
            <button
              key={type}
              className={`chip ${filter === type ? "active-chip" : ""}`}
              onClick={() => setFilter(type)}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        {loading ? (
          <div className="loaderArea">
            <div className="spinner"></div>
            <p>Loading clinics...</p>
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th style={{ width: 60, textAlign: "center" }}>#</th>
                <th>Clinic Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Registered</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredClinics.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan={7}>No clinics found</td>
                </tr>
              ) : (
                filteredClinics.map((c, i) => (
                  <tr key={c.id}>
                    <td style={{ textAlign: "center" }}>{i + 1}</td>
                    <td>
                      <strong>{c.name}</strong>
                      {c.name_hindi && (
                        <>
                          <br />
                          <span style={{ fontSize: 11, color: "#94a3b8" }}>
                            {c.name_hindi}
                          </span>
                        </>
                      )}
                    </td>
                    <td>{c.email}</td>
                    <td>{c.phone || "—"}</td>
                    <td>
                      {new Date(c.created_at).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td>
                      <span className={`status-badge status-${c.status}`}>
                        {c.status}
                      </span>
                    </td>
                    <td>
                      <div className="actions-cell">
                        <button
                          className="action-btn btn-view"
                          onClick={() => setSelectedClinic(c)}
                        >
                          View
                        </button>
                        {c.status !== "active" && (
                          <button
                            className="action-btn btn-approve"
                            onClick={() => updateStatus(c.id, "active")}
                          >
                            Approve
                          </button>
                        )}
                        {c.status !== "suspended" && (
                          <button
                            className="action-btn btn-suspend"
                            onClick={() => updateStatus(c.id, "suspended")}
                          >
                            Suspend
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedClinic && (
        <div className="modal-overlay" onClick={() => setSelectedClinic(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{selectedClinic.name}</h3>
              <button
                className="close-btn"
                onClick={() => setSelectedClinic(null)}
              >
                &times;
              </button>
            </div>
            <div className="modal-body">
              <div className="detail-row">
                <span className="key">Email</span>
                <span className="val">{selectedClinic.email}</span>
              </div>
              <div className="detail-row">
                <span className="key">Phone</span>
                <span className="val">{selectedClinic.phone || "—"}</span>
              </div>
              <div className="detail-row">
                <span className="key">Address</span>
                <span className="val">{selectedClinic.address || "—"}</span>
              </div>
              <div className="detail-row">
                <span className="key">Tagline</span>
                <span className="val">{selectedClinic.tagline || "—"}</span>
              </div>
              <div className="detail-row">
                <span className="key">Status</span>
                <span className="val">
                  <span
                    className={`status-badge status-${selectedClinic.status}`}
                  >
                    {selectedClinic.status}
                  </span>
                </span>
              </div>
              <div className="detail-row">
                <span className="key">Registered</span>
                <span className="val">
                  {new Date(selectedClinic.created_at).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="detail-row" style={{ alignItems: "flex-start" }}>
                <span className="key">
                  Doctors ({(selectedClinic.clinic_doctors || []).length})
                </span>
                <span className="val">
                  {(selectedClinic.clinic_doctors || []).length ? (
                    (selectedClinic.clinic_doctors || []).map((cd: any) => (
                      <span key={cd.id} className="doctor-tag">
                        ‍️ {cd.doctors?.name || "Unknown"}
                        {cd.doctors?.qualification
                          ? ` · ${cd.doctors.qualification}`
                          : ""}
                      </span>
                    ))
                  ) : (
                    <span style={{ color: "#94a3b8" }}>No doctors added</span>
                  )}
                </span>
              </div>
            </div>
            <div className="modal-actions">
              {selectedClinic.status !== "active" && (
                <button
                  className="modal-approve-btn"
                  onClick={() => updateStatus(selectedClinic.id, "active")}
                >
                  Approve Clinic
                </button>
              )}
              {selectedClinic.status !== "suspended" && (
                <button
                  className="modal-suspend-btn"
                  onClick={() => updateStatus(selectedClinic.id, "suspended")}
                >
                  Suspend Clinic
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TOAST FEEDBACK */}
      <div className={`toast ${showToast ? "show" : ""}`}>{toastMsg}</div>
    </div>
  );
}
