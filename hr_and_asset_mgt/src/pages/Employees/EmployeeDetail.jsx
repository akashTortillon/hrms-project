import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import "../../style/EmployeeDetail.css";

// Icons (using bootstrap-icons or valid imports, assuming generic svgs or library usage in project)
const BackArrowIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
);

const PhoneIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
    </svg>
);

const LocationIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
        <circle cx="12" cy="10" r="3"></circle>
    </svg>
);

const MailIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
        <polyline points="22,6 12,13 2,6"></polyline>
    </svg>
);

const EditIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
    </svg>
);


import { getEmployeeById, updateEmployee, getEmployeeDocuments, uploadEmployeeDocument } from "../../services/employeeService";
import { getDepartments } from "../../services/masterService";
import { getEmployeeRequests } from "../../services/requestService"; // New Service Method
import EditEmployeeModal from "./EditEmployeeModal.jsx";
import UploadEmployeeDocumentModal from "./UploadEmployeeDocumentModal.jsx";
import { toast } from "react-toastify";

import { getEmployeeAttendanceStats } from "../../services/attendanceService";
import { getEmployeeTrainings } from "../../services/trainingService";
import { getEmployeeAssets } from "../../services/assetService";
import { assignAssetToEmployee } from "../../services/assignmentService";
import AssignAssetToEmployeeModal from "./AssignAssetToEmployeeModal";
import SvgIcon from "../../components/svgIcon/svgView";
import { useRole } from "../../contexts/RoleContext";
import WorkflowTab from "../../components/employee/WorkflowTab";

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { hasPermission } = useRole();

    // Resolve "me" to logged-in user's employeeId
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSelf = id === "me";
    const effectiveId = isSelf ? user.employeeId : id;

    // Permissions
    const canEdit = hasPermission("MANAGE_EMPLOYEES");
    const canManageDocs = hasPermission("MANAGE_DOCUMENTS");
    const canManageAssets = hasPermission("MANAGE_ASSETS");

    const [activeTab, setActiveTab] = useState("Personal Info");
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editMode, setEditMode] = useState("all");
    const [deptOptions, setDeptOptions] = useState([]);

    // Document State
    const [documents, setDocuments] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);

    // Attendance & Training State
    const [attendanceStats, setAttendanceStats] = useState({ present: 0, absent: 0, leave: 0, late: 0, total: 0 });
    const [trainings, setTrainings] = useState([]);

    // Asset State
    const [employeeAssets, setEmployeeAssets] = useState([]);
    const [showAssignAssetModal, setShowAssignAssetModal] = useState(false);

    // Loan State
    const [loans, setLoans] = useState([]);

    // Fetch Employee Data
    const fetchEmployee = async () => {
        if (!effectiveId) {
            console.warn("No effective ID for profile view");
            setError("No employee profile found for this user.");
            setLoading(false);
            return;
        }

        try {
            const data = await getEmployeeById(effectiveId);
            const dob = data.dob ? new Date(data.dob).toISOString().split("T")[0] : "N/A";
            const passportExpiry = data.passportExpiry ? new Date(data.passportExpiry).toISOString().split("T")[0] : "N/A";
            const visaExpiry = data.visaExpiry ? new Date(data.visaExpiry).toISOString().split("T")[0] : "N/A";
            setEmployee({ ...data, dob, passportExpiry, visaExpiry });
        } catch (err) {
            console.error(err);
            setError("Failed to load employee details");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployee();
        loadDepartments();
    }, [effectiveId]);

    const loadDepartments = async () => {
        try {
            const data = await getDepartments();
            if (data) {
                setDeptOptions(data.map(d => d.name));
            }
        } catch (err) {
            console.error("Failed to load departments", err);
        }
    };

    // Update Employee Handler
    const handleUpdateEmployee = async (updatedData) => {
        try {
            await updateEmployee(id, updatedData);
            toast.success("Profile updated successfully");
            setShowEditModal(false);
            fetchEmployee(); // Refresh data
        } catch (err) {
            console.error("Update failed", err);
            toast.error("Failed to update profile");
        }
    };

    // Document Handlers
    useEffect(() => {
        if (!effectiveId) return;
        if (activeTab === "Documents") {
            fetchDocuments();
        } else if (activeTab === "Attendance") {
            fetchAttendanceData();
        } else if (activeTab === "Assets") {
            fetchEmployeeAssetsData();
        } else if (activeTab === "Loans") {
            fetchEmployeeLoans();
        }
    }, [activeTab, effectiveId]);

    const fetchDocuments = async () => {
        if (!effectiveId) return;
        try {
            const docs = await getEmployeeDocuments(effectiveId);
            setDocuments(docs);
        } catch (e) {
            console.error(e);
        }
    };

    const handleUploadDocument = async (formData) => {
        try {
            await uploadEmployeeDocument(formData);
            toast.success("Document uploaded");
            setShowUploadModal(false);
            fetchDocuments();
        } catch (e) {
            console.error(e);
            toast.error("Upload failed");
        }
    };

    const fetchAttendanceData = async () => {
        if (!effectiveId) return;
        try {
            const [stats, tr] = await Promise.all([
                getEmployeeAttendanceStats(effectiveId),
                getEmployeeTrainings(effectiveId)
            ]);
            setAttendanceStats(stats);
            setTrainings(tr);
        } catch (e) {
            console.error("Attendance/Training fetch error:", e);
        }
    };

    const fetchEmployeeAssetsData = async () => {
        if (!effectiveId) return;
        try {
            const assets = await getEmployeeAssets(effectiveId);
            setEmployeeAssets(Array.isArray(assets) ? assets : []);
        } catch (e) {
            console.error("Assets fetch error:", e);
        }
    };

    const fetchEmployeeLoans = async () => {
        if (!effectiveId) return;
        try {
            const result = await getEmployeeRequests(effectiveId, { type: 'SALARY' });
            // Result is { success: true, data: [...] } based on controller
            if (result && result.data) {
                console.log("[EmployeeDetail] Raw Loans:", result.data);
                // Filter out Rejected/Withdrawn. Show everything else (Pending, Approved, Completed)
                // User said "rejected it myst be not".
                const visibleLoans = result.data.filter(r => r.status !== 'REJECTED' && r.status !== 'WITHDRAWN');
                console.log("[EmployeeDetail] Visible Loans:", visibleLoans);
                setLoans(visibleLoans);
            }
        } catch (e) {
            console.error("Loans fetch error:", e);
        }
    };



    const handleAssignAsset = async (data) => {
        try {
            await assignAssetToEmployee(data);
            toast.success("Asset assigned successfully");
            fetchEmployeeAssetsData(); // Refresh list
            setShowAssignAssetModal(false); // Close modal
        } catch (error) {
            console.error("Assignment error:", error);
            toast.error(error.response?.data?.message || "Failed to assign asset");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
    if (!employee) return <div className="p-8 text-center">Employee not found</div>;

    const tabs = ["Personal Info", "Employment", "Documents", "Attendance", "Assets", "Loans"];
    // Conditionally add Onboarding/Offboarding for Admin/HR
    if (canEdit) {
        tabs.push("Onboarding");
        tabs.push("Offboarding");
    }

    return (
        <div className="employee-detail-container">
            {/* Header */}
            <div className="employee-detail-header">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!isSelf && (
                        <button onClick={() => navigate("/app/employees")} className="back-btn">
                            <BackArrowIcon />
                        </button>
                    )}
                    <h1 className="employee-detail-title">
                        {isSelf ? "My Profile" : "Employee Profile"}
                    </h1>
                </div>
                <p className="employee-detail-subtitle">{isSelf ? "Manage your information" : "View and manage employee information"}</p>
            </div>

            {/* Profile Card */}
            <div className="employee-profile-card">
                <div className="profile-main-info">
                    <div className="profile-avatar-large">
                        {employee.name ? employee.name.charAt(0) : "U"}
                    </div>
                    <div className="profile-details">
                        <h2>
                            {employee.name}
                            <span className={`status-badge`}>{employee.status}</span>
                        </h2>
                        <div className="profile-role-id">
                            {employee.role} • {employee.code}
                        </div>
                        <div className="profile-contact">
                            <div className="contact-item">
                                <MailIcon /> {employee.email}
                            </div>
                            <div className="contact-item">
                                <PhoneIcon /> {employee.phone}
                            </div>
                            <div className="contact-item">
                                <LocationIcon /> {employee.department}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="profile-actions">
                    {canEdit && (
                        <button
                            className="edit-profile-btn"
                            onClick={() => {
                                setEditMode("profile");
                                setShowEditModal(true);
                            }}
                        >
                            Edit Profile
                        </button>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="employee-tabs">
                {tabs.map((tab) => (
                    <button
                        key={tab}
                        className={`tab-btn ${activeTab === tab ? "active" : ""}`}
                        onClick={() => setActiveTab(tab)}
                    >
                        {/* Icons can be added here if needed, keeping simple for now */}
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="info-section">
                {activeTab === "Personal Info" && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Personal Information</h3>
                            {canEdit && (
                                <button
                                    onClick={() => {
                                        setEditMode("personal");
                                        setShowEditModal(true);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#2563eb',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <EditIcon /> Edit
                                </button>
                            )}
                        </div>

                        <div className="info-grid">
                            <div className="info-group">
                                <label>Date of Birth</label>
                                {/* Assuming dob is already formatted in fetchEmployee or empty */}
                                <div>{employee.dob || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Nationality</label>
                                {/* Not yet in backend model properly, using placeholder or field if exists */}
                                <div>{employee.nationality || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Personal ID (14 Digit)</label>
                                <div>{employee.personalId || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>UAE Address</label>
                                <div>{employee.address || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                {/* Spacer or additional field */}
                            </div>
                            <div className="info-group">
                                <label>Passport Expiry</label>
                                <div>{employee.passportExpiry || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Emirates ID Expiry</label>
                                <div>{employee.emiratesIdExpiry || "N/A"}</div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "Employment" && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Employment Information</h3>
                            {canEdit && (
                                <button
                                    onClick={() => {
                                        setEditMode("employment");
                                        setShowEditModal(true);
                                    }}
                                    style={{
                                        background: 'none',
                                        border: 'none',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        color: '#2563eb',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}
                                >
                                    <EditIcon /> Edit
                                </button>
                            )}
                        </div>

                        <div className="info-grid">
                            <div className="info-group">
                                <label>Join Date</label>
                                <div>{employee.joinDate ? new Date(employee.joinDate).toISOString().split("T")[0] : "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Contract Type</label>
                                <div>{employee.contractType || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Department</label>
                                <div>{employee.department || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Designation</label>
                                <div>{employee.designation || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Labor Card No</label>
                                <div>{employee.laborCardNumber || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Agent ID (WPS)</label>
                                <div>{employee.agentId || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Basic Salary</label>
                                <div>{employee.basicSalary ? `${employee.basicSalary} AED` : "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Accommodation</label>
                                <div>{employee.accommodation || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Visa Expiry</label>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {employee.visaExpiry}
                                    {employee.visaExpiry !== "N/A" && (
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                            <polyline points="20 6 9 17 4 12"></polyline>
                                        </svg>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Bank Details Section */}
                        <div style={{ marginTop: '20px', borderTop: '1px solid #e5e7eb', paddingTop: '20px' }}>
                            <h4 style={{ margin: '0 0 15px 0', fontSize: '16px', color: '#1f2937' }}>Bank Details</h4>
                            <div className="info-grid">
                                <div className="info-group">
                                    <label>Bank Name</label>
                                    <div>{employee.bankName || "N/A"}</div>
                                </div>
                                <div className="info-group">
                                    <label>IBAN</label>
                                    <div>{employee.iban || "N/A"}</div>
                                </div>
                                <div className="info-group">
                                    <label>Account Number</label>
                                    <div>{employee.bankAccount || "N/A"}</div>
                                </div>
                            </div>
                        </div>
                    </>
                )}

                {activeTab === "Documents" && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Document Tracker</h3>
                            {canManageDocs && (
                                <button
                                    onClick={() => setShowUploadModal(true)}
                                    style={{
                                        background: '#2563eb', color: 'white', border: 'none',
                                        padding: '8px 16px', fontSize: '14px', borderRadius: '6px', cursor: 'pointer'
                                    }}
                                >
                                    Upload Document
                                </button>
                            )}
                        </div>
                        <div className="documents-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {documents.map(doc => (
                                <div key={doc._id} style={{
                                    background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#111827' }}>{doc.documentType}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                            {doc.documentNumber || 'No Ref'} • Expires: {doc.expiryDate ? new Date(doc.expiryDate).toISOString().split('T')[0] : 'N/A'}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <span style={{
                                            background: doc.status === 'Valid' ? '#dcfce7' : (doc.status === 'Expired' ? '#fee2e2' : '#fef3c7'),
                                            color: doc.status === 'Valid' ? '#166534' : (doc.status === 'Expired' ? '#991b1b' : '#92400e'),
                                            padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500'
                                        }}>
                                            {doc.status}
                                        </span>
                                        <a
                                            href={`${import.meta.env.VITE_API_BASE}/${doc.filePath.replace(/\\/g, '/')}`}
                                            target="_blank" rel="noopener noreferrer"
                                            style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500', textDecoration: 'none', cursor: 'pointer' }}
                                        >
                                            View
                                        </a>
                                        {/* Optional Delete Button */}
                                    </div>
                                </div>
                            ))}
                            {documents.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                                    No documents uploaded yet.
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === "Attendance" && (
                    <>
                        <div className="attendance-summary" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '15px', marginBottom: '30px' }}>
                            <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                <div style={{ color: '#166534', fontSize: '14px', fontWeight: '500' }}>Present</div>
                                <div style={{ color: '#166534', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{attendanceStats.present}</div>
                            </div>
                            <div style={{ background: '#fef2f2', border: '1px solid #fee2e2', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                <div style={{ color: '#991b1b', fontSize: '14px', fontWeight: '500' }}>Absent</div>
                                <div style={{ color: '#991b1b', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{attendanceStats.absent}</div>
                            </div>
                            <div style={{ background: '#fefce8', border: '1px solid #fef9c3', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                <div style={{ color: '#854d0e', fontSize: '14px', fontWeight: '500' }}>Leave</div>
                                <div style={{ color: '#854d0e', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{attendanceStats.leave}</div>
                            </div>
                            <div style={{ background: '#fff7ed', border: '1px solid #ffedd5', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                <div style={{ color: '#9a3412', fontSize: '14px', fontWeight: '500' }}>Late</div>
                                <div style={{ color: '#9a3412', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{attendanceStats.late}</div>
                            </div>
                            <div style={{ background: '#eff6ff', border: '1px solid #dbeafe', borderRadius: '8px', padding: '15px', textAlign: 'center' }}>
                                <div style={{ color: '#1e40af', fontSize: '14px', fontWeight: '500' }}>Total Days</div>
                                <div style={{ color: '#1e40af', fontSize: '20px', fontWeight: 'bold', marginTop: '5px' }}>{attendanceStats.total}</div>
                            </div>
                        </div>

                        <h3 style={{ fontSize: '16px', color: '#1f2937', marginBottom: '15px' }}>Training Records</h3>
                        <div className="training-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {trainings.map((t) => (
                                <div key={t._id} style={{
                                    background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div>
                                        <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>{t.title}</div>
                                        <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                            {new Date(t.date).toISOString().split('T')[0]}
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
                                        <span style={{ fontSize: '14px', fontWeight: '500', color: '#374151' }}>
                                            Score: {t.score}
                                        </span>
                                        <span style={{
                                            background: t.status === 'Completed' ? '#dcfce7' : (t.status === 'Failed' ? '#fee2e2' : '#fef3c7'),
                                            color: t.status === 'Completed' ? '#166534' : (t.status === 'Failed' ? '#991b1b' : '#854d0e'),
                                            padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500'
                                        }}>
                                            {t.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                            {trainings.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                                    No training records found.
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab === "Assets" && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Allocated Assets</h3>
                            {canManageAssets && (
                                <button
                                    onClick={() => setShowAssignAssetModal(true)}
                                    style={{
                                        background: '#2563eb', color: 'white', border: 'none',
                                        padding: '8px 16px', fontSize: '14px', borderRadius: '6px', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', gap: '6px'
                                    }}
                                >
                                    <span style={{ fontSize: "18px", fontWeight: "bold" }}>+</span> Assign Asset
                                </button>
                            )}
                        </div>

                        <div className="assets-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {employeeAssets.map((asset) => (
                                <div key={asset._id} style={{
                                    background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                        <div style={{
                                            background: '#bfdbfe', padding: '10px', borderRadius: '8px',
                                            color: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center'
                                        }}>
                                            <SvgIcon name="cube" size={24} />
                                        </div>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>
                                                {asset.name}
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                                {asset.assetCode} • {asset.type}
                                            </div>
                                            {/* Status or other details if needed */}
                                            <div style={{ fontSize: '12px', color: '#9ca3af', marginTop: '2px' }}>
                                                Assigned: {new Date(asset.assignedAt || asset.updatedAt).toISOString().split('T')[0]}
                                            </div>
                                        </div>
                                    </div>

                                    <span style={{
                                        background: asset.status === 'In Use' ? '#dcfce7' : (asset.status === 'Under Maintenance' ? '#fef3c7' : '#e5e7eb'),
                                        color: asset.status === 'In Use' ? '#166534' : (asset.status === 'Under Maintenance' ? '#854d0e' : '#374151'),
                                        padding: '4px 12px', borderRadius: '9999px', fontSize: '12px', fontWeight: '500'
                                    }}>
                                        {asset.status}
                                    </span>
                                </div>
                            ))}
                            {employeeAssets.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                                    No assets assigned to this employee.
                                </div>
                            )}
                        </div>
                    </>
                )}



                {activeTab === "Onboarding" && (
                    <WorkflowTab employeeId={effectiveId} type="Onboarding" />
                )}

                {activeTab === "Offboarding" && (
                    <WorkflowTab employeeId={effectiveId} type="Offboarding" />
                )}

                {activeTab === "Loans" && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Loans & Advances</h3>
                        </div>

                        <div className="loans-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {loans.map((loan) => (
                                <div key={loan._id} style={{
                                    background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>
                                                {loan.subType === 'loan' ? 'Company Loan' : 'Salary Advance'}
                                                <span style={{ fontSize: '13px', color: '#6b7280', fontWeight: '400', marginLeft: '8px' }}>
                                                    #{loan.requestId}
                                                </span>
                                            </div>
                                            <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>
                                                Approved: {new Date(loan.approvedAt || loan.updatedAt).toLocaleDateString()}
                                            </div>
                                            {(loan.details.interestRate > 0) && (
                                                <div style={{ fontSize: '12px', color: '#d97706', marginTop: '2px' }}>
                                                    Interest Rate: {loan.details.interestRate}%
                                                </div>
                                            )}
                                        </div>
                                        <div style={{ textAlign: 'right' }}>
                                            <div style={{ fontWeight: '600', color: '#111827' }}>
                                                {loan.details.amount} AED
                                            </div>
                                            {loan.isFullyPaid ? (
                                                <span style={{ color: '#166534', fontSize: '12px', fontWeight: '500', background: '#dcfce7', padding: '2px 8px', borderRadius: '4px' }}>Paid Off</span>
                                            ) : (
                                                <span style={{ color: '#854d0e', fontSize: '12px', fontWeight: '500', background: '#fef3c7', padding: '2px 8px', borderRadius: '4px' }}>Active</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    {(() => {
                                        const total = loan.details.totalRepaymentAmount || loan.details.amount;
                                        const paid = (loan.payrollDeductions || []).reduce((acc, curr) => acc + curr.amount, 0);
                                        const progress = Math.min((paid / total) * 100, 100);

                                        return (
                                            <div style={{ marginTop: '15px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '5px', color: '#4b5563' }}>
                                                    <span>Paid: {paid.toFixed(2)} AED</span>
                                                    <span>Total: {Number(total).toFixed(2)} AED</span>
                                                </div>
                                                <div style={{ width: '100%', height: '8px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                                    <div style={{ width: `${progress}%`, height: '100%', background: '#2563eb', transition: 'width 0.3s' }}></div>
                                                </div>
                                            </div>
                                        );
                                    })()}

                                    {/* Deductions History */}
                                    {loan.payrollDeductions && loan.payrollDeductions.length > 0 && (
                                        <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #e5e7eb' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>DEDUCTION HISTORY</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                {loan.payrollDeductions.map((ded, idx) => (
                                                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', color: '#374151' }}>
                                                        <span>{ded.month}/{ded.year} Payroll</span>
                                                        <span>-{ded.amount} AED</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                            {loans.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                                    No active loans or salary advances.
                                </div>
                            )}
                        </div>
                    </>
                )}

                {activeTab !== "Personal Info" && activeTab !== "Employment" && activeTab !== "Documents" && activeTab !== "Attendance" && activeTab !== "Assets" && activeTab !== "Onboarding" && activeTab !== "Offboarding" && activeTab !== "Loans" && (
                    <div style={{ color: '#64748b', textAlign: 'center', padding: '20px' }}>
                        Content for {activeTab} will be available soon.
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <EditEmployeeModal
                    deptOptions={deptOptions}
                    employee={employee}
                    onClose={() => setShowEditModal(false)}
                    onUpdate={handleUpdateEmployee}
                    editMode={editMode}
                />
            )}

            {/* Upload Document Modal */}
            {showUploadModal && (
                <UploadEmployeeDocumentModal
                    employeeId={effectiveId}
                    onClose={() => setShowUploadModal(false)}
                    onUpload={handleUploadDocument}
                />
            )}

            {/* Assign Asset Modal */}
            {showAssignAssetModal && (
                <AssignAssetToEmployeeModal
                    employeeId={effectiveId}
                    onClose={() => setShowAssignAssetModal(false)}
                    onAssign={handleAssignAsset}
                />
            )}
        </div>
    );
}
