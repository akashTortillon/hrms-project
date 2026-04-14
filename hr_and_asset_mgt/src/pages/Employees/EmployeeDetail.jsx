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


import { getEmployeeById, updateEmployee, getEmployeeDocuments, uploadEmployeeDocument, transferEmployee, confirmProbation, resetEmployeePassword } from "../../services/employeeService";
import { getDepartments } from "../../services/masterService";
import { getEmployeeRequests, updateRepaymentSchedule, getLeaveSummary } from "../../services/requestService";
import { downloadEmployeeDocument } from "../../services/employeeDocumentService.js";

import EditEmployeeModal from "./EditEmployeeModal.jsx";
import UploadEmployeeDocumentModal from "./UploadEmployeeDocumentModal.jsx";
import TransferEmployeeModal from "./TransferEmployeeModal.jsx";
import ConfirmProbationModal from "./ConfirmProbationModal.jsx";
import SkipLoanMonthModal from "./SkipLoanMonthModal.jsx";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext";
import { getEmployeeAttendanceStats } from "../../services/attendanceService";
import { getEmployeeTrainings } from "../../services/trainingService";
import { getEmployeeAssets } from "../../services/assetService";
import { assignAssetToEmployee } from "../../services/assignmentService";
import AssignAssetToEmployeeModal from "./AssignAssetToEmployeeModal";
import SvgIcon from "../../components/svgIcon/svgView";
import WorkflowTab from "../../components/employee/WorkflowTab";
import ChangePasswordModal from "../Authentication/ChangePasswordModal.jsx";

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const query = new URLSearchParams(window.location.search); // Parse query params
    const tabParam = query.get("tab");
    const { hasPermission } = useRole();

    // Resolve "me" to logged-in user's employeeId
    const user = JSON.parse(localStorage.getItem("user") || "{}");
    const isSelf = id === "me";
    const effectiveId = isSelf ? user.employeeId : id;

    // Permissions
    const canEdit = hasPermission("MANAGE_EMPLOYEES");
    const canManageDocs = hasPermission("MANAGE_DOCUMENTS");
    const canManageAssets = hasPermission("MANAGE_ASSETS");
    const canManageRepayments = hasPermission("APPROVE_REQUESTS") || hasPermission("ALL") || user?.role === "Admin";



    const [activeTab, setActiveTab] = useState(tabParam || "Personal Info"); // Default to param or Personal Info
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showConfirmProbationModal, setShowConfirmProbationModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false); // Change Password Modal State
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
    const [confirmingProbation, setConfirmingProbation] = useState(false);
    const [showSkipLoanModal, setShowSkipLoanModal] = useState(false);
    const [selectedLoanForSkip, setSelectedLoanForSkip] = useState(null);
    const [savingLoanSkip, setSavingLoanSkip] = useState(false);

    // Leave Summary State
    const [leaveSummary, setLeaveSummary] = useState([]);
    const [leaveSummaryTotals, setLeaveSummaryTotals] = useState({
        sick: 0,
        casual: 0,
        annual: 0,
        unpaid: 0,
        approvedDays: 0,
        pendingRequests: 0
    });
    const [leaveSummaryLoading, setLeaveSummaryLoading] = useState(false);
    const [leaveSummaryYear, setLeaveSummaryYear] = useState(new Date().getFullYear());

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
            if (result && result.data) {
                const visibleLoans = result.data.filter(r => r.status !== 'REJECTED' && r.status !== 'WITHDRAWN');
                setLoans(visibleLoans);
            }
        } catch (e) {
            console.error("Loans fetch error:", e);
        }
    };

    // Fetch leave summary when tab becomes active
    const fetchLeaveSummary = async (year = leaveSummaryYear) => {
        if (!effectiveId) return;
        setLeaveSummaryLoading(true);
        try {
            const params = { year };
            if (!isSelf) params.employeeId = effectiveId;
            const res = await getLeaveSummary(params);
            setLeaveSummary(res.data || []);
            setLeaveSummaryTotals(res.totals || {
                sick: 0,
                casual: 0,
                annual: 0,
                unpaid: 0,
                approvedDays: 0,
                pendingRequests: 0
            });
        } catch (e) {
            console.error("Leave summary fetch error:", e);
        } finally {
            setLeaveSummaryLoading(false);
        }
    };

    useEffect(() => {
        if (activeTab === "Leave Summary") {
            fetchLeaveSummary(leaveSummaryYear);
        }
    }, [activeTab, leaveSummaryYear]);

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

    const handleTransferEmployee = async (transferData) => {
        try {
            await transferEmployee(effectiveId, transferData);
            toast.success("Employee transferred successfully");
            setShowTransferModal(false);
            fetchEmployee();
        } catch (error) {
            console.error("Transfer failed", error);
            toast.error(error.response?.data?.message || "Failed to transfer employee");
        }
    };

    const handleConfirmProbation = async (payload) => {
        try {
            setConfirmingProbation(true);
            await confirmProbation(effectiveId, payload);
            toast.success("Probation confirmed successfully");
            setShowConfirmProbationModal(false);
            fetchEmployee();
        } catch (error) {
            console.error("Probation confirmation failed", error);
            toast.error(error.response?.data?.message || "Failed to confirm probation");
        } finally {
            setConfirmingProbation(false);
        }
    };

    const handleOpenSkipLoanModal = (loan) => {
        setSelectedLoanForSkip(loan);
        setShowSkipLoanModal(true);
    };

    const handleSkipLoanMonth = async (requestId, payload) => {
        try {
            setSavingLoanSkip(true);
            await updateRepaymentSchedule(requestId, payload);
            toast.success("Repayment skip saved successfully");
            setShowSkipLoanModal(false);
            setSelectedLoanForSkip(null);
            fetchEmployeeLoans();
        } catch (error) {
            console.error("Repayment skip failed", error);
            toast.error(error.response?.data?.message || "Failed to save repayment skip");
        } finally {
            setSavingLoanSkip(false);
        }
    };

    const handleViewEmployeeDocument = async (document) => {
        try {
            if (document.fileUrl) {
                window.open(document.fileUrl, "_blank", "noopener,noreferrer");
                return;
            }
            const blob = await downloadEmployeeDocument(document._id);
            const url = window.URL.createObjectURL(blob);
            window.open(url, "_blank", "noopener,noreferrer");
            setTimeout(() => window.URL.revokeObjectURL(url), 1000);
        } catch (error) {
            console.error("Document view failed", error);
            toast.error(error.response?.data?.message || "Failed to open document");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;
    if (error) return <div className="p-8 text-center text-red-500">{error}</div>;


    if (!employee) return <div className="p-8 text-center">Employee not found</div>;

    const canConfirmProbation = canEdit && !isSelf && employee.probationStatus !== "CONFIRMED" && employee.probationEndDate;

    const tabs = ["Personal Info", "Employment", "Documents", "Attendance", "Assets", "Loans", "Leave Summary"];
    // Conditionally add Onboarding/Offboarding based on granular permissions
    if (hasPermission("MANAGE_ONBOARDING")) {
        tabs.push("Onboarding");
    }
    if (hasPermission("MANAGE_OFFBOARDING")) {
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
                        <>
                            <button
                                className="edit-profile-btn"
                                onClick={() => {
                                    setEditMode("profile");
                                    setShowEditModal(true);
                                }}
                            >
                                Edit Profile
                            </button>
                            {!isSelf && (
                                <>
                                    <button
                                        className="edit-profile-btn transfer-profile-btn"
                                        onClick={() => setShowTransferModal(true)}
                                    >
                                        Transfer Employee
                                    </button>
                                    {canConfirmProbation && (
                                        <button
                                            className="edit-profile-btn probation-profile-btn"
                                            onClick={() => setShowConfirmProbationModal(true)}
                                        >
                                            Confirm Probation
                                        </button>
                                    )}
                                    <button
                                        className="edit-profile-btn reset-pass-btn"
                                        style={{ marginLeft: '8px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5' }}
                                        onClick={async () => {
                                            if (window.confirm("Are you sure you want to reset this employee's password? An email will be sent immediately with a new temporary password.")) {
                                                try {
                                                    await resetEmployeePassword(effectiveId);
                                                    toast.success("Password reset successfully. Email sent to employee.");
                                                } catch (err) {
                                                    console.error("Password reset failed", err);
                                                    toast.error(err.response?.data?.message || "Failed to reset password");
                                                }
                                            }
                                        }}
                                    >
                                        Reset Password
                                    </button>
                                </>
                            )}
                        </>
                    )}
                    {isSelf && (
                        <button
                            className="edit-profile-btn"
                            onClick={() => setShowChangePasswordModal(true)}
                            style={{ marginLeft: '10px', background: 'white', color: '#374151', border: '1px solid #d1d5db' }}
                        >
                            Change Password
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
                        onClick={() => {
                            setActiveTab(tab);
                            // Optional: Update URL without reload to persist state
                            const newUrl = window.location.protocol + "//" + window.location.host + window.location.pathname + `?tab=${tab}`;
                            window.history.pushState({ path: newUrl }, '', newUrl);
                        }}
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
                                <label>Company</label>
                                <div>{employee.company || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Department</label>
                                <div>{employee.department || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Branch</label>
                                <div>{employee.branch || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Designation</label>
                                <div>{employee.designation || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Labour Cards</label>
                                <div>
                                    {Array.isArray(employee.laborCards) && employee.laborCards.length > 0
                                        ? employee.laborCards.map((card, index) => (
                                            <span key={`${card.number}-${index}`} style={{ display: 'block' }}>
                                                {card.number || "N/A"}{card.expiryDate ? ` - Exp: ${new Date(card.expiryDate).toISOString().split("T")[0]}` : ""}
                                            </span>
                                        ))
                                        : (employee.laborCardNumber || "N/A")}
                                </div>
                            </div>
                            <div className="info-group">
                                <label>Agent ID (WPS)</label>
                                <div>{employee.agentId || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Probation Start Date</label>
                                <div>{employee.probationStartDate ? new Date(employee.probationStartDate).toISOString().split("T")[0] : "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Probation End Date</label>
                                <div>{employee.probationEndDate ? new Date(employee.probationEndDate).toISOString().split("T")[0] : "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Probation Status</label>
                                <div>{employee.probationStatus ? employee.probationStatus.replace(/_/g, " ") : "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Fixed Probation Increment</label>
                                <div>{employee.fixedProbationIncrementAmount ? `${employee.fixedProbationIncrementAmount} AED` : "0 AED"}</div>
                            </div>
                            <div className="info-group">
                                <label>Basic Salary</label>
                                <div>{employee.basicSalary ? `${employee.basicSalary} AED` : "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Accommodation Allowance</label>
                                <div>{employee.accommodationAllowance ? `${employee.accommodationAllowance} AED` : "0 AED"}</div>
                            </div>
                            <div className="info-group">
                                <label>Vehicle Allowance</label>
                                <div>{employee.vehicleAllowance ? `${employee.vehicleAllowance} AED` : "0 AED"}</div>
                            </div>
                            <div className="info-group">
                                <label>Total Salary</label>
                                <div style={{ fontWeight: '700', color: '#111827' }}>
                                    {employee.totalSalary ? `${employee.totalSalary} AED` : "N/A"}
                                </div>
                            </div>
                            <div className="info-group">
                                <label>Accommodation</label>
                                <div>{employee.accommodation || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Visa Company</label>
                                <div>{employee.visaCompany || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Work Permit Company</label>
                                <div>{employee.workPermitCompany || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Visa No</label>
                                <div>{employee.visaNo || "N/A"}</div>
                            </div>
                            <div className="info-group">
                                <label>Visa File No</label>
                                <div>{employee.visaFileNo || "N/A"}</div>
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

                        <div className="transfer-history-section">
                            <div className="transfer-history-header">
                                <h4>Transfer History</h4>
                                <span>{employee.transferHistory?.length || 0} records</span>
                            </div>

                            {Array.isArray(employee.transferHistory) && employee.transferHistory.length > 0 ? (
                                <div className="transfer-history-list">
                                    {[...employee.transferHistory]
                                        .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))
                                        .map((entry, index) => (
                                            <div key={`${entry.effectiveDate}-${index}`} className="transfer-history-card">
                                                <div className="transfer-history-date">
                                                    {entry.effectiveDate ? new Date(entry.effectiveDate).toISOString().split("T")[0] : "N/A"}
                                                </div>
                                                <div className="transfer-history-body">
                                                    <div className="transfer-history-row">
                                                        <strong>Company:</strong> {entry.previousCompany || "N/A"} to {entry.newCompany || "N/A"}
                                                    </div>
                                                    <div className="transfer-history-row">
                                                        <strong>Branch:</strong> {entry.previousBranch || "N/A"} to {entry.newBranch || "N/A"}
                                                    </div>
                                                    <div className="transfer-history-row">
                                                        <strong>Reason:</strong> {entry.reason || "N/A"}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            ) : (
                                <div className="transfer-history-empty">
                                    No transfer history recorded for this employee yet.
                                </div>
                            )}
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
                                        <button
                                            type="button"
                                            onClick={() => handleViewEmployeeDocument(doc)}
                                            style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500', textDecoration: 'none', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}
                                        >
                                            View
                                        </button>
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

                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                                        {loan.details?.deductionStartMonth && loan.details?.deductionStartYear && (
                                            <span style={{
                                                fontSize: '12px',
                                                color: '#1d4ed8',
                                                background: '#dbeafe',
                                                borderRadius: '999px',
                                                padding: '6px 10px',
                                                fontWeight: '500'
                                            }}>
                                                Starts: {String(loan.details.deductionStartMonth).padStart(2, '0')}/{loan.details.deductionStartYear}
                                            </span>
                                        )}
                                        {Array.isArray(loan.details?.repaymentScheduleOverrides) && loan.details.repaymentScheduleOverrides
                                            .filter((item) => item?.action === 'SKIP')
                                            .map((item, index) => (
                                                <span key={`${loan._id}-skip-${index}`} style={{
                                                    fontSize: '12px',
                                                    color: '#92400e',
                                                    background: '#fef3c7',
                                                    borderRadius: '999px',
                                                    padding: '6px 10px',
                                                    fontWeight: '500'
                                                }}>
                                                    Skip: {String(item.month).padStart(2, '0')}/{item.year}
                                                </span>
                                            ))}
                                    </div>

                                    {canManageRepayments && !loan.isFullyPaid && (
                                        <div style={{ marginBottom: '14px' }}>
                                            <button
                                                type="button"
                                                onClick={() => handleOpenSkipLoanModal(loan)}
                                                style={{
                                                    border: '1px solid #f59e0b',
                                                    background: '#fff7ed',
                                                    color: '#b45309',
                                                    borderRadius: '8px',
                                                    padding: '8px 12px',
                                                    fontSize: '13px',
                                                    fontWeight: '600',
                                                    cursor: 'pointer'
                                                }}
                                            >
                                                Skip One Month
                                            </button>
                                        </div>
                                    )}

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

                {activeTab === "Leave Summary" && (
                    <div style={{ padding: '8px 0' }}>
                        {/* Year filter */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937', fontWeight: '700' }}>📅 Leave Summary</h3>
                            <select
                                value={leaveSummaryYear}
                                onChange={async (e) => {
                                    const yr = Number(e.target.value);
                                    setLeaveSummaryYear(yr);
                                    setLeaveSummaryLoading(true);
                                    try {
                                        const params = { year: yr };
                                        if (!isSelf && effectiveId) params.employeeId = effectiveId;
                                        const res = await getLeaveSummary(params);
                                        setLeaveSummary(res.data || []);
                                        setLeaveSummaryTotals(res.totals || {
                                            sick: 0,
                                            casual: 0,
                                            annual: 0,
                                            unpaid: 0,
                                            approvedDays: 0,
                                            pendingRequests: 0
                                        });
                                    } catch (err) { console.error(err); }
                                    finally { setLeaveSummaryLoading(false); }
                                }}
                                style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: 'white', cursor: 'pointer' }}
                            >
                                {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                            </select>
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                            {[
                                ["Sick Leave", leaveSummaryTotals.sick, "#e0f2fe", "#0369a1"],
                                ["Casual Leave", leaveSummaryTotals.casual, "#dcfce7", "#166534"],
                                ["Annual Leave", leaveSummaryTotals.annual, "#fef3c7", "#92400e"],
                                ["Unpaid Leave", leaveSummaryTotals.unpaid, "#fee2e2", "#991b1b"],
                                ["Approved Days", leaveSummaryTotals.approvedDays, "#ede9fe", "#5b21b6"],
                                ["Pending Requests", leaveSummaryTotals.pendingRequests, "#f1f5f9", "#334155"]
                            ].map(([label, value, bg, color]) => (
                                <div key={label} style={{ background: bg, border: '1px solid rgba(15,23,42,0.06)', borderRadius: '14px', padding: '14px 16px' }}>
                                    <div style={{ fontSize: '12px', color, fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                                    <div style={{ fontSize: '24px', color, fontWeight: '800', marginTop: '6px' }}>{Number(value || 0)}</div>
                                </div>
                            ))}
                        </div>

                        {leaveSummaryLoading ? (
                            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px' }}>Loading...</div>
                        ) : leaveSummary.length === 0 ? (
                            <div style={{ textAlign: 'center', color: '#9ca3af', padding: '40px', background: '#f9fafb', borderRadius: '12px' }}>
                                No approved leave records found for {leaveSummaryYear}.
                            </div>
                        ) : (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                                {leaveSummary.map((item, idx) => {
                                    const colors = ['#eff6ff','#f0fdf4','#fefce8','#fdf4ff','#fff7ed','#f0f9ff'];
                                    const textColors = ['#1d4ed8','#15803d','#a16207','#7e22ce','#c2410c','#0c4a6e'];
                                    const bg = colors[idx % colors.length];
                                    const tc = textColors[idx % textColors.length];
                                    return (
                                        <div key={item.type} style={{ background: bg, borderRadius: '12px', padding: '20px', border: `1px solid ${bg}` }}>
                                            <div style={{ fontSize: '13px', color: tc, fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>{item.type}</div>
                                            <div style={{ fontSize: '32px', fontWeight: '800', color: tc }}>{item.totalDays}</div>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '4px' }}>days • {item.count} request{item.count !== 1 ? 's' : ''}</div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}

                {activeTab !== "Personal Info" && activeTab !== "Employment" && activeTab !== "Documents" && activeTab !== "Attendance" && activeTab !== "Assets" && activeTab !== "Onboarding" && activeTab !== "Offboarding" && activeTab !== "Loans" && activeTab !== "Leave Summary" && (
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

            {showTransferModal && (
                <TransferEmployeeModal
                    employee={employee}
                    onClose={() => setShowTransferModal(false)}
                    onSubmit={handleTransferEmployee}
                />
            )}

            {showConfirmProbationModal && (
                <ConfirmProbationModal
                    employee={employee}
                    onClose={() => setShowConfirmProbationModal(false)}
                    onConfirm={handleConfirmProbation}
                    submitting={confirmingProbation}
                />
            )}

            {showSkipLoanModal && (
                <SkipLoanMonthModal
                    show={showSkipLoanModal}
                    request={selectedLoanForSkip}
                    onClose={() => {
                        setShowSkipLoanModal(false);
                        setSelectedLoanForSkip(null);
                    }}
                    onSubmit={handleSkipLoanMonth}
                    submitting={savingLoanSkip}
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

            {/* Change Password Modal */}
            <ChangePasswordModal
                show={showChangePasswordModal}
                onClose={() => setShowChangePasswordModal(false)}
            />
        </div>
    );
}
