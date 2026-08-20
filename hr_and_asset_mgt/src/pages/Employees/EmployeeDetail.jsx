import React, { useState, useEffect, useRef } from "react";
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

const TrashIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
        <path d="M10 11v6"></path>
        <path d="M14 11v6"></path>
        <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"></path>
    </svg>
);


import { getEmployeeById, getMyProfile, updateEmployee, getEmployeeDocuments, uploadEmployeeDocument, deleteEmployeeDocument, uploadEmployeePhoto, transferEmployee, confirmProbation, resetEmployeePassword, getEmployeeGratuity, deleteAllowance } from "../../services/employeeService";
import { getEmployeeWorkflow } from "../../services/workflowService";
import { getDepartments } from "../../services/masterService";
import { getEmployeeRequests, updateRepaymentSchedule, createExistingLoan, getLeaveSummary } from "../../services/requestService";
import { downloadEmployeeDocument } from "../../services/employeeDocumentService.js";

import EditEmployeeModal from "./EditEmployeeModal.jsx";
import UploadEmployeeDocumentModal from "./UploadEmployeeDocumentModal.jsx";
import TransferEmployeeModal from "./TransferEmployeeModal.jsx";
import ConfirmProbationModal from "./ConfirmProbationModal.jsx";
import SkipLoanMonthModal from "./SkipLoanMonthModal.jsx";
import AdjustLoanModal from "./AdjustLoanModal.jsx";
import ExtraPaymentModal from "./ExtraPaymentModal.jsx";
import AddExistingLoanModal from "./AddExistingLoanModal.jsx";
import AddAllowanceModal from "./AddAllowanceModal.jsx";
import { appraisalService } from "../../services/appraisalService";
import { toast } from "react-toastify";
import { useRole } from "../../contexts/RoleContext";
import { getEmployeeAttendanceStats } from "../../services/attendanceService";
import { getEmployeeTrainings } from "../../services/trainingService";
import { getEmployeeAssets } from "../../services/assetService";
import { assignAssetToEmployee } from "../../services/assignmentService";
import AssignAssetToEmployeeModal from "./AssignAssetToEmployeeModal";
import SvgIcon from "../../components/svgIcon/svgView";
import WorkflowTab from "../../components/employee/WorkflowTab";
import WarningsTab from "../../components/employee/WarningsTab.jsx";
import LeaveWalletTab from "../../components/employee/LeaveWalletTab.jsx";
import ChangePasswordModal from "../Authentication/ChangePasswordModal.jsx";

const resolveUploadedAssetUrl = (url) => {
    if (!url) return "";
    if (/^(https?:)?\/\//i.test(url) || url.startsWith("data:")) return url;

    const apiBase = import.meta.env.VITE_API_BASE || "";
    const serverBase = apiBase.replace(/\/api\/?$/, "").replace(/\/$/, "");
    return `${serverBase}${url.startsWith("/") ? url : `/${url}`}`;
};

export default function EmployeeDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const query = new URLSearchParams(window.location.search); // Parse query params
    const tabParam = query.get("tab");
    const { hasPermission, currentUser } = useRole();

    const isSelf = id === "me";

    // For non-"me" routes, effectiveId is the URL param.
    // For "me", it starts null and is populated from the server response after
    // getMyProfile() returns — so all child fetches (docs, assets…) use the
    // real employee _id and not a stale/missing value from localStorage.
    const [resolvedEmployeeId, setResolvedEmployeeId] = useState(
        isSelf ? (currentUser?.employeeId || null) : id
    );
    const effectiveId = isSelf ? resolvedEmployeeId : id;

    // Permissions
    const canEdit = hasPermission("MANAGE_EMPLOYEES");
    const canManageDocs = hasPermission("MANAGE_DOCUMENTS");
    const canManageAssets = hasPermission("MANAGE_ASSETS");
    const canManageRepayments = hasPermission("APPROVE_REQUESTS") || hasPermission("ALL") || currentUser?.role === "Admin";



    const [activeTab, setActiveTab] = useState(tabParam || "Personal Info"); // Default to param or Personal Info
    const [employee, setEmployee] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [showTransferModal, setShowTransferModal] = useState(false);
    const [showConfirmProbationModal, setShowConfirmProbationModal] = useState(false);
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false); // Change Password Modal State
    const [showAddAllowanceModal, setShowAddAllowanceModal] = useState(false);
    const [allowanceSubmitting, setAllowanceSubmitting] = useState(false);
    const [editMode, setEditMode] = useState("all");
    const [deptOptions, setDeptOptions] = useState([]);
    const [photoUploading, setPhotoUploading] = useState(false);
    const [showPhotoLightbox, setShowPhotoLightbox] = useState(false);
    const photoInputRef = useRef(null);

    // Document State
    const [documents, setDocuments] = useState([]);
    const [workflowDocs, setWorkflowDocs] = useState([]);
    const [showUploadModal, setShowUploadModal] = useState(false);
    const [uploadPrefillType, setUploadPrefillType] = useState("");

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

    // Gratuity State
    const [gratuity, setGratuity] = useState(null);
    const [gratuityLoading, setGratuityLoading] = useState(false);
    const [selectedLoanForSkip, setSelectedLoanForSkip] = useState(null);
    const [savingLoanSkip, setSavingLoanSkip] = useState(false);
    const [showAdjustLoanModal, setShowAdjustLoanModal] = useState(false);
    const [selectedLoanForAdjust, setSelectedLoanForAdjust] = useState(null);
    const [savingLoanAdjust, setSavingLoanAdjust] = useState(false);
    const [showExtraPaymentModal, setShowExtraPaymentModal] = useState(false);
    const [selectedLoanForExtraPayment, setSelectedLoanForExtraPayment] = useState(null);
    const [savingExtraPayment, setSavingExtraPayment] = useState(false);
    const [showAddExistingLoanModal, setShowAddExistingLoanModal] = useState(false);
    const [savingExistingLoan, setSavingExistingLoan] = useState(false);

    // Leave Summary State
    const [leaveSummary, setLeaveSummary] = useState([]);
    const [leaveSummaryTotals, setLeaveSummaryTotals] = useState({
        approvedDays: 0,
        pendingRequests: 0
    });
    const [leaveSummaryLoading, setLeaveSummaryLoading] = useState(false);
    const [leaveSummaryYear, setLeaveSummaryYear] = useState(new Date().getFullYear());
    const [leaveSummaryMonth, setLeaveSummaryMonth] = useState(0); // 0 = whole year

    // Fetch Employee Data
    const fetchEmployee = async () => {
        // Always reset state at the start of every fetch attempt so that a
        // re-fetch (e.g. after effectiveId becomes available) clears old errors.
        setLoading(true);
        setError(null);

        try {
            let data;
            if (isSelf) {
                // Use the dedicated /employees/me endpoint — this resolves the employee
                // by employeeId, email, or userId without needing the ID to be pre-stored
                // in localStorage / context. Works for all account types out of the box.
                data = await getMyProfile();
                // Store the resolved _id so child tab fetches (documents, assets…)
                // use the correct employee ID rather than an undefined value.
                setResolvedEmployeeId(data._id);
            } else {
                if (!effectiveId) {
                    setError("No employee profile found for this user.");
                    setLoading(false);
                    return;
                }
                data = await getEmployeeById(effectiveId);
            }
            const dob = data.dob ? new Date(data.dob).toISOString().split("T")[0] : "N/A";
            const passportExpiry = data.passportExpiry ? new Date(data.passportExpiry).toISOString().split("T")[0] : "N/A";
            const visaExpiry = data.visaExpiry ? new Date(data.visaExpiry).toISOString().split("T")[0] : "N/A";
            setEmployee({ ...data, dob, passportExpiry, visaExpiry });
        } catch (err) {
            console.error(err);
            // 404 from /employees/me means genuinely no linked employee record
            if (err?.response?.status === 404) {
                setError("No employee profile found for this user.");
            } else {
                setError(err?.response?.data?.message || "Failed to load employee details");
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployee();
        loadDepartments();
    }, [effectiveId]);


    const handleAddAllowance = async ({ typeName, amount, includeInPayroll }) => {
        setAllowanceSubmitting(true);
        try {
            const today = new Date().toISOString().slice(0, 10);
            await appraisalService.applyAdjustment({
                employee: effectiveId,
                type: "ALLOWANCE",
                allowanceTypeName: typeName,
                amount,
                effectiveDate: today,
                includeInPayroll
            });
            await fetchEmployee();
            setShowAddAllowanceModal(false);
            toast.success("Allowance applied successfully");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to apply allowance");
        } finally {
            setAllowanceSubmitting(false);
        }
    };

    const handleDeleteAllowance = async (allowance) => {
        if (!window.confirm(`Remove the "${allowance.typeName}" allowance (${Number(allowance.amount).toLocaleString()} AED)?`)) {
            return;
        }
        try {
            await deleteAllowance(effectiveId, allowance._id);
            await fetchEmployee();
            toast.success("Allowance removed");
        } catch (err) {
            toast.error(err?.response?.data?.message || "Failed to remove allowance");
        }
    };

    useEffect(() => {
        if (!showPhotoLightbox) return;
        const handleEscape = (e) => {
            if (e.key === "Escape") setShowPhotoLightbox(false);
        };
        window.addEventListener("keydown", handleEscape);
        return () => window.removeEventListener("keydown", handleEscape);
    }, [showPhotoLightbox]);

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
        } else if (activeTab === "Salary") {
            fetchGratuity();
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
        fetchWorkflowDocuments();
    };

    // Onboarding/offboarding checklist uploads live in the Workflow collection, not
    // EmployeeDocument. Surface them (read-only) so they're visible alongside regular docs.
    // Requires workflow permission; silently skipped for users without it.
    const fetchWorkflowDocuments = async () => {
        if (!effectiveId) return;
        const collected = [];
        for (const type of ["Onboarding", "Offboarding"]) {
            try {
                const wf = await getEmployeeWorkflow(effectiveId, type);
                (wf?.data?.items || []).forEach((item) => {
                    if (item.documentUrl) {
                        collected.push({ _id: item._id, name: item.name, type, documentUrl: item.documentUrl });
                    }
                });
            } catch {
                // no workflow / no permission — ignore
            }
        }
        setWorkflowDocs(collected);
    };

    const handleUploadDocument = async (formData) => {
        try {
            await uploadEmployeeDocument(formData);
            toast.success("Document uploaded");
            setShowUploadModal(false);
            setUploadPrefillType("");
            fetchDocuments();
        } catch (e) {
            console.error(e);
            const message = e?.response?.data?.message
                || (e?.response?.status === 413 ? "File is too large to upload" : "")
                || (e?.response?.status === 403 ? "You don't have permission to upload documents" : "")
                || e?.message
                || "Upload failed";
            toast.error(message);
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

    const fetchGratuity = async () => {
        if (!effectiveId) return;
        setGratuityLoading(true);
        try {
            const res = await getEmployeeGratuity(effectiveId);
            setGratuity(res.data || null);
        } catch (e) {
            console.error("Gratuity fetch error:", e);
        } finally {
            setGratuityLoading(false);
        }
    };

    // Fetch leave summary when tab becomes active
    const fetchLeaveSummary = async (year = leaveSummaryYear, month = leaveSummaryMonth) => {
        if (!effectiveId) return;
        setLeaveSummaryLoading(true);
        try {
            const params = { year };
            if (month) params.month = month;
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
            fetchLeaveSummary(leaveSummaryYear, leaveSummaryMonth);
        }
    }, [activeTab, leaveSummaryYear, leaveSummaryMonth]);

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

    const handlePhotoUpload = async (event) => {
        const file = event.target.files?.[0];
        if (!file || !effectiveId) return;

        if (!file.type.startsWith("image/")) {
            toast.error("Please select an image file");
            event.target.value = "";
            return;
        }

        const formData = new FormData();
        formData.append("photo", file);

        try {
            setPhotoUploading(true);
            const updatedEmployee = await uploadEmployeePhoto(effectiveId, formData);
            setEmployee(updatedEmployee);
            toast.success("Employee photo updated");
        } catch (err) {
            toast.error(err.response?.data?.message || "Failed to upload employee photo");
        } finally {
            setPhotoUploading(false);
            event.target.value = "";
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

    const handleAddExistingLoan = async (payload) => {
        try {
            setSavingExistingLoan(true);
            await createExistingLoan(effectiveId, payload);
            toast.success("Existing loan added successfully");
            setShowAddExistingLoanModal(false);
            fetchEmployeeLoans();
        } catch (error) {
            console.error("Add existing loan failed", error);
            toast.error(error.response?.data?.message || "Failed to add existing loan");
        } finally {
            setSavingExistingLoan(false);
        }
    };

    const handleOpenAdjustLoanModal = (loan) => {
        setSelectedLoanForAdjust(loan);
        setShowAdjustLoanModal(true);
    };

    const handleAdjustLoan = async (requestId, payload) => {
        try {
            setSavingLoanAdjust(true);
            await updateRepaymentSchedule(requestId, payload);
            toast.success("Loan adjustment saved successfully");
            setShowAdjustLoanModal(false);
            setSelectedLoanForAdjust(null);
            fetchEmployeeLoans();
        } catch (error) {
            console.error("Loan adjustment failed", error);
            toast.error(error.response?.data?.message || "Failed to save loan adjustment");
        } finally {
            setSavingLoanAdjust(false);
        }
    };

    const handleOpenExtraPaymentModal = (loan) => {
        setSelectedLoanForExtraPayment(loan);
        setShowExtraPaymentModal(true);
    };

    const handleExtraPayment = async (requestId, payload) => {
        try {
            setSavingExtraPayment(true);
            await updateRepaymentSchedule(requestId, payload);
            toast.success("Extra payment recorded successfully");
            setShowExtraPaymentModal(false);
            setSelectedLoanForExtraPayment(null);
            fetchEmployeeLoans();
        } catch (error) {
            console.error("Extra payment failed", error);
            toast.error(error.response?.data?.message || "Failed to record extra payment");
        } finally {
            setSavingExtraPayment(false);
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

    const handleDeleteEmployeeDocument = async (document) => {
        if (!window.confirm(`Delete "${document.documentType}"? This cannot be undone.`)) return;
        try {
            await deleteEmployeeDocument(document._id);
            toast.success("Document deleted");
            fetchDocuments();
        } catch (error) {
            console.error("Document delete failed", error);
            toast.error(error.response?.data?.message || "Failed to delete document");
        }
    };

    if (loading) return <div className="p-8 text-center">Loading profile...</div>;

    // Friendly state when the logged-in user has no linked Employee record
    // (e.g. the primary Admin user who was created without an Employee entry).
    // Still let them change their password from here.
    if (error) {
        const isNoProfile = !effectiveId || error === "No employee profile found for this user.";
        return (
            <div className="employee-detail-container">
                <div className="employee-detail-header">
                    <h1 className="employee-detail-title">My Profile</h1>
                    <p className="employee-detail-subtitle">Manage your account settings</p>
                </div>
                <div className="employee-profile-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
                    <div style={{ fontSize: '48px', marginBottom: '12px' }}>👤</div>
                    <h3 style={{ margin: '0 0 8px', fontSize: '18px', color: '#1f2937' }}>
                        {isNoProfile ? 'No Employee Profile Linked' : 'Failed to Load Profile'}
                    </h3>
                    <p style={{ margin: '0 0 24px', fontSize: '14px', color: '#6b7280' }}>
                        {isNoProfile
                            ? 'Your user account is not linked to an employee record. You can still manage your password below.'
                            : error}
                    </p>
                    <button
                        className="edit-profile-btn"
                        onClick={() => setShowChangePasswordModal(true)}
                        style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db' }}
                    >
                        Change Password
                    </button>
                </div>
                <ChangePasswordModal
                    show={showChangePasswordModal}
                    onClose={() => setShowChangePasswordModal(false)}
                />
            </div>
        );
    }

    if (!employee) return <div className="p-8 text-center">Employee not found</div>;

    const canConfirmProbation = canEdit && !isSelf && employee.probationStatus !== "CONFIRMED" && employee.probationEndDate;

    const tabs = ["Personal Info", "Employment", "Documents", "Attendance", "Assets", "Loans", "Leave Summary", "Leave Wallet"];
    // Salary tab — Finance/HR/Admin, OR the employee viewing their OWN profile (read-only).
    const canViewSalary = hasPermission("ALL") || hasPermission("MANAGE_PAYROLL") || hasPermission("APPROVE_FINANCE_REQUESTS") || hasPermission("APPROVE_REQUESTS") || isSelf;
    if (canViewSalary) {
        tabs.push("Salary");
    }
    // Warnings tab — visible to HR/Admin/Manager (can manage) and the employee themselves
    const canViewWarnings = canEdit || isSelf;
    if (canViewWarnings) {
        tabs.push("Warnings");
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
                    <div
                        className={`profile-avatar-large ${(canEdit || isSelf) ? "profile-avatar-uploadable" : ""}`}
                        style={{ position: "relative", cursor: employee.profilePhotoUrl ? "zoom-in" : undefined }}
                        onClick={() => {
                            if (employee.profilePhotoUrl) setShowPhotoLightbox(true);
                            else if (canEdit || isSelf) photoInputRef.current?.click();
                        }}
                        title={employee.profilePhotoUrl ? "Click to enlarge" : ((canEdit || isSelf) ? "Upload photo" : employee.name)}
                    >
                        {employee.profilePhotoUrl ? (
                            <img src={resolveUploadedAssetUrl(employee.profilePhotoUrl)} alt={employee.name} />
                        ) : (
                            employee.name ? employee.name.charAt(0) : "U"
                        )}
                        {(canEdit || isSelf) && (
                            <button
                                type="button"
                                className="profile-avatar-camera-btn"
                                title="Upload photo"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    photoInputRef.current?.click();
                                }}
                                style={{
                                    position: "absolute", bottom: "4px", right: "4px",
                                    width: "28px", height: "28px", borderRadius: "50%",
                                    background: "#1f2937", border: "2px solid white",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    cursor: "pointer", padding: 0
                                }}
                            >
                                <SvgIcon name="edit" size={14} className="svg-icon-white" />
                            </button>
                        )}
                        {(canEdit || isSelf) && photoUploading && (
                            <span className="profile-avatar-upload-hint">Uploading...</span>
                        )}
                    </div>
                    {(canEdit || isSelf) && (
                        <input
                            ref={photoInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePhotoUpload}
                            style={{ display: "none" }}
                        />
                    )}
                    {showPhotoLightbox && employee.profilePhotoUrl && (
                        <div
                            className="photo-lightbox-overlay"
                            onClick={() => setShowPhotoLightbox(false)}
                            style={{
                                position: "fixed", inset: 0, background: "rgba(0,0,0,0.85)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                zIndex: 2000, cursor: "zoom-out"
                            }}
                        >
                            <button
                                type="button"
                                onClick={() => setShowPhotoLightbox(false)}
                                style={{
                                    position: "absolute", top: "20px", right: "24px",
                                    background: "none", border: "none", cursor: "pointer",
                                    color: "white", fontSize: "28px", lineHeight: 1
                                }}
                            >
                                ✕
                            </button>
                            <img
                                src={resolveUploadedAssetUrl(employee.profilePhotoUrl)}
                                alt={employee.name}
                                onClick={(e) => e.stopPropagation()}
                                style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: "8px", cursor: "default" }}
                            />
                        </div>
                    )}
                    <div className="profile-details">
                        <h2>
                            {employee.name}
                            <span className={`status-badge`}>{employee.status}</span>
                        </h2>
                        <div className="profile-role-id">
                            {employee.role} • {employee.code}
                            {employee.systemCode && (
                                <span title="Internal system reference number" style={{ marginLeft: '8px', color: '#9ca3af', fontSize: '12px' }}>
                                    (Ref: {employee.systemCode})
                                </span>
                            )}
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
                                                    const result = await resetEmployeePassword(effectiveId);
                                                    if (result?.emailSent === false && result?.tempPassword) {
                                                        // Delivery failed but the reset itself succeeded - surface the temp
                                                        // password directly instead of leaving the admin to relay it manually
                                                        // with no way to hand it to the employee.
                                                        toast.warn(
                                                            ({ closeToast }) => (
                                                                <div>
                                                                    <div style={{ marginBottom: 6 }}>
                                                                        Password reset, but the email could not be sent.
                                                                    </div>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                                                        <code style={{ background: '#f1f5f9', padding: '2px 6px', borderRadius: 4, fontWeight: 'bold' }}>
                                                                            {result.tempPassword}
                                                                        </code>
                                                                        <button
                                                                            onClick={() => {
                                                                                navigator.clipboard.writeText(result.tempPassword);
                                                                                toast.success("Password copied to clipboard");
                                                                                closeToast();
                                                                            }}
                                                                            style={{ padding: '2px 10px', border: '1px solid #ccc', borderRadius: 4, background: '#fff', cursor: 'pointer' }}
                                                                        >
                                                                            Copy
                                                                        </button>
                                                                    </div>
                                                                </div>
                                                            ),
                                                            { autoClose: false }
                                                        );
                                                    } else {
                                                        toast.success("Password reset successfully. Email sent to employee.");
                                                    }
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
                            {/* HR/Admin users can always change their own password */}
                            {isSelf && (
                                <button
                                    className="edit-profile-btn"
                                    onClick={() => setShowChangePasswordModal(true)}
                                    style={{ background: 'white', color: '#374151', border: '1px solid #d1d5db' }}
                                >
                                    Change Password
                                </button>
                            )}
                        </>
                    )}
                    {!canEdit && isSelf && (
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
                            {/* Salary fields moved to the restricted Salary tab */}
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
                                    onClick={() => { setUploadPrefillType(""); setShowUploadModal(true); }}
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
                                        <div style={{ fontWeight: '600', color: '#111827' }}>{doc.documentType}{doc.label ? ` — ${doc.label}` : ''}</div>
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
                                        {doc.noFileUploaded ? (
                                            <>
                                                <span style={{ fontSize: '12px', color: '#9ca3af' }}>No file uploaded</span>
                                                {canManageDocs && (
                                                    <button
                                                        type="button"
                                                        onClick={() => { setUploadPrefillType(doc.documentType); setShowUploadModal(true); }}
                                                        style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}
                                                    >
                                                        Upload
                                                    </button>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={() => handleViewEmployeeDocument(doc)}
                                                    style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500', textDecoration: 'none', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}
                                                >
                                                    View
                                                </button>
                                                {canManageDocs && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleDeleteEmployeeDocument(doc)}
                                                        style={{ color: '#dc2626', fontSize: '14px', fontWeight: '500', cursor: 'pointer', background: 'transparent', border: 0, padding: 0 }}
                                                    >
                                                        Delete
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            ))}
                            {documents.length === 0 && (
                                <div style={{ textAlign: 'center', padding: '30px', color: '#6b7280', background: '#f9fafb', borderRadius: '8px' }}>
                                    No documents uploaded yet.
                                </div>
                            )}
                        </div>

                        {workflowDocs.length > 0 && (
                            <div style={{ marginTop: '30px' }}>
                                <h3 style={{ margin: '0 0 15px', fontSize: '16px', color: '#1f2937' }}>Onboarding / Offboarding Documents</h3>
                                <div className="documents-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                                    {workflowDocs.map(doc => (
                                        <div key={doc._id} style={{
                                            background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '15px',
                                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                                        }}>
                                            <div>
                                                <div style={{ fontWeight: '600', color: '#111827' }}>{doc.name}</div>
                                                <div style={{ fontSize: '13px', color: '#6b7280', marginTop: '4px' }}>{doc.type}</div>
                                            </div>
                                            <a
                                                href={resolveUploadedAssetUrl(doc.documentUrl)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{ color: '#2563eb', fontSize: '14px', fontWeight: '500', textDecoration: 'none' }}
                                            >
                                                View
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
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



                {/* Onboarding and Offboarding tabs temporarily disabled
                {activeTab === "Onboarding" && (
                    <WorkflowTab employeeId={effectiveId} type="Onboarding" />
                )}

                {activeTab === "Offboarding" && (
                    <WorkflowTab employeeId={effectiveId} type="Offboarding" />
                )}
                */}

                {/* ===== SALARY TAB (Finance / HR / Admin only) ===== */}
                {activeTab === "Salary" && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Salary & Compensation</h3>
                            {canEdit && (
                                <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                                    <button
                                        onClick={() => setShowAddAllowanceModal(true)}
                                        style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: '500', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        + Add Allowance
                                    </button>
                                    <button
                                        onClick={() => { setEditMode("employment"); setShowEditModal(true); }}
                                        style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: '500', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                    >
                                        <EditIcon /> Edit
                                    </button>
                                </div>
                            )}
                        </div>

                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
                            {/* Left column — salary breakdown */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    Salary Breakdown
                                </div>

                                {[
                                    { label: 'Fixed Probation Increment', value: employee.fixedProbationIncrementAmount, fallback: '0 AED' },
                                    { label: 'Basic Salary', value: employee.basicSalary, fallback: 'N/A' },
                                    // HRA and Allowance are counted into Total Salary below (see
                                    // computeTotalSalary in salaryCalc.js: basicSalary + allowance + hra)
                                    // and are exactly what an appraisal increment's 50/30/20 split
                                    // writes into - they used to be completely absent from this list,
                                    // so Total Salary never matched the sum of the rows actually shown
                                    // here (an increment would visibly move Basic Salary but silently
                                    // add to two fields nobody could see).
                                    { label: 'HRA', value: employee.hra, fallback: '0 AED' },
                                    { label: 'Allowance', value: employee.allowance, fallback: '0 AED' },
                                    { label: 'Accommodation Allowance', value: employee.accommodationAllowance, fallback: '0 AED' },
                                    { label: 'Vehicle Allowance', value: employee.vehicleAllowance, fallback: '0 AED' },
                                ].map(({ label, value, fallback }) => (
                                    <div key={label} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>{label}</span>
                                        <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                                            {value ? `${Number(value).toLocaleString()} AED` : fallback}
                                        </span>
                                    </div>
                                ))}

                                {(employee.allowances || []).map((item) => (
                                    <div key={item._id} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <span style={{ fontSize: '13px', color: '#6b7280' }}>
                                            {item.typeName}
                                            {item.includeInPayroll === false && (
                                                <span style={{ marginLeft: '8px', fontSize: '11px', fontWeight: '600', color: '#b45309', background: '#fef3c7', padding: '2px 6px', borderRadius: '999px' }}>
                                                    Excluded from payroll
                                                </span>
                                            )}
                                        </span>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <span style={{ fontSize: '16px', fontWeight: '700', color: '#111827' }}>
                                                {Number(item.amount).toLocaleString()} AED
                                            </span>
                                            {canEdit && (
                                                <button
                                                    onClick={() => handleDeleteAllowance(item)}
                                                    title="Remove allowance"
                                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', display: 'flex', alignItems: 'center', padding: '4px' }}
                                                >
                                                    <TrashIcon />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Total Salary — highlighted */}
                                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '16px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                    <span style={{ fontSize: '14px', fontWeight: '700', color: '#1d4ed8' }}>Total Salary</span>
                                    <span style={{ fontSize: '22px', fontWeight: '800', color: '#1e40af' }}>
                                        {employee.totalSalary ? `${Number(employee.totalSalary).toLocaleString()} AED` : 'N/A'}
                                    </span>
                                </div>
                            </div>

                            {/* Right column — gratuity */}
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
                                    UAE Gratuity (End-of-Service Benefit)
                                </div>

                                {gratuityLoading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '10px' }}>
                                        Calculating gratuity...
                                    </div>
                                ) : gratuity ? (
                                    <>
                                        {/* Service duration */}
                                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px' }}>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px', fontWeight: '600' }}>SERVICE DURATION</div>
                                            <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
                                                <div>
                                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>{gratuity.yearsOfService}</div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Years</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>{gratuity.monthsOfService}</div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Months</div>
                                                </div>
                                                <div>
                                                    <div style={{ fontSize: '22px', fontWeight: '800', color: '#111827' }}>{gratuity.daysOfService}</div>
                                                    <div style={{ fontSize: '12px', color: '#6b7280' }}>Days</div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Formula breakdown */}
                                        <div style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '16px 20px' }}>
                                            <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '10px', fontWeight: '600' }}>CALCULATION BASIS</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#6b7280' }}>Daily Basic Wage</span>
                                                    <span style={{ fontWeight: '600', color: '#111827' }}>{gratuity.dailyBasicWage} AED</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                                                    <span style={{ color: '#6b7280' }}>Formula</span>
                                                    <span style={{ fontWeight: '600', color: '#111827', fontSize: '12px' }}>
                                                        {gratuity.yearsOfService <= 5
                                                            ? `Daily × 21 × ${gratuity.yearsOfService}y`
                                                            : `(Daily × 21 × 5) + (Daily × 30 × ${(gratuity.yearsOfService - 5).toFixed(2)}y)`}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Gratuity amount — highlighted */}
                                        <div style={{ background: gratuity.gratuityAmount > 0 ? '#f0fdf4' : '#fef9c3', border: `1px solid ${gratuity.gratuityAmount > 0 ? '#bbf7d0' : '#fde68a'}`, borderRadius: '10px', padding: '16px 20px' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '700', color: gratuity.gratuityAmount > 0 ? '#166534' : '#92400e', marginBottom: '6px' }}>
                                                ESTIMATED GRATUITY
                                            </div>
                                            <div style={{ fontSize: '28px', fontWeight: '800', color: gratuity.gratuityAmount > 0 ? '#15803d' : '#92400e' }}>
                                                {gratuity.gratuityAmount.toLocaleString()} AED
                                            </div>
                                            {gratuity.gratuityNote && (
                                                <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '6px' }}>
                                                    {gratuity.gratuityNote}
                                                </div>
                                            )}
                                        </div>

                                        <div style={{ fontSize: '11px', color: '#9ca3af', padding: '0 4px' }}>
                                            Based on UAE Federal Decree-Law No. 33 of 2021. Calculated on basic salary only, excluding allowances.
                                        </div>
                                    </>
                                ) : (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '10px' }}>
                                        No gratuity data available.
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Salary history / increments — shows probation increments, appraisals, etc. with effective dates */}
                        <div style={{ marginTop: '28px' }}>
                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>
                                Salary History & Increments
                            </div>
                            {(employee.salaryHistory && employee.salaryHistory.length > 0) ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {[...employee.salaryHistory]
                                        .sort((a, b) => new Date(b.effectiveDate) - new Date(a.effectiveDate))
                                        .map((entry, index) => {
                                            const typeLabels = {
                                                JOINING: 'Joining Salary',
                                                APPRAISAL: 'Appraisal',
                                                PROBATION_INCREMENT: 'Probation Increment',
                                                MANUAL_ADJUSTMENT: 'Manual Adjustment'
                                            };
                                            return (
                                                <div key={`${entry.effectiveDate}-${index}`} style={{ background: 'white', border: '1px solid #e5e7eb', borderRadius: '10px', padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
                                                    <div>
                                                        <div style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>
                                                            {typeLabels[entry.salaryType] || entry.salaryType || 'Adjustment'}
                                                        </div>
                                                        <div style={{ fontSize: '12px', color: '#6b7280', marginTop: '2px' }}>
                                                            Effective: {entry.effectiveDate ? new Date(entry.effectiveDate).toISOString().split('T')[0] : 'N/A'}
                                                            {entry.notes ? ` • ${entry.notes}` : ''}
                                                        </div>
                                                    </div>
                                                    <div style={{ textAlign: 'right' }}>
                                                        {Number(entry.incrementAmount) > 0 && (
                                                            <div style={{ fontSize: '13px', fontWeight: '700', color: '#15803d' }}>
                                                                +{Number(entry.incrementAmount).toLocaleString()} AED
                                                            </div>
                                                        )}
                                                        <div style={{ fontSize: '13px', color: '#374151' }}>
                                                            Basic: {Number(entry.basicSalary || 0).toLocaleString()} AED
                                                        </div>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                </div>
                            ) : (
                                <div style={{ padding: '18px', textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: '10px', fontSize: '13px' }}>
                                    No salary history recorded yet.
                                </div>
                            )}
                        </div>
                    </>
                )}

                {/* ===== WARNINGS TAB ===== */}
                {activeTab === "Warnings" && (
                    <WarningsTab
                        employeeId={effectiveId}
                        isSelf={isSelf}
                    />
                )}

                {activeTab === "Loans" && (
                    <>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                            <h3 style={{ margin: 0, fontSize: '18px', color: '#1f2937' }}>Loans & Advances</h3>
                            {canManageRepayments && (
                                <button
                                    onClick={() => setShowAddExistingLoanModal(true)}
                                    style={{ background: 'none', border: 'none', fontSize: '14px', fontWeight: '500', color: '#2563eb', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                                >
                                    + Add Existing Loan
                                </button>
                            )}
                        </div>

                        <div className="loans-list" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                            {loans.map((loan) => (
                                <div key={loan._id} style={{
                                    background: 'white', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '20px',
                                }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '10px' }}>
                                        <div>
                                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '15px' }}>
                                                {(loan.details?.subType || loan.subType) === 'loan' ? 'Company Loan' : 'Salary Advance'}
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
                                        <div style={{ marginBottom: '14px', display: 'flex', gap: '8px' }}>
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
                                            {(loan.details?.subType || loan.subType) === 'loan' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenAdjustLoanModal(loan)}
                                                    style={{
                                                        border: '1px solid #2563eb',
                                                        background: '#eff6ff',
                                                        color: '#1d4ed8',
                                                        borderRadius: '8px',
                                                        padding: '8px 12px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Adjust EMI
                                                </button>
                                            )}
                                            {(loan.details?.subType || loan.subType) === 'loan' && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleOpenExtraPaymentModal(loan)}
                                                    style={{
                                                        border: '1px solid #16a34a',
                                                        background: '#f0fdf4',
                                                        color: '#15803d',
                                                        borderRadius: '8px',
                                                        padding: '8px 12px',
                                                        fontSize: '13px',
                                                        fontWeight: '600',
                                                        cursor: 'pointer'
                                                    }}
                                                >
                                                    Record Extra Payment
                                                </button>
                                            )}
                                        </div>
                                    )}

                                    {/* Progress Bar */}
                                    {(() => {
                                        const total = loan.details.totalRepaymentAmount || loan.details.amount;
                                        const paid = (loan.payrollDeductions || []).reduce((acc, curr) => acc + curr.amount, 0)
                                            + (loan.details?.extraPayments || []).reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
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

                                    {/* Adjustment History - written by the "Adjust Loan" flow above; was already
                                        being recorded on the request but never rendered anywhere, so Finance/HR
                                        had no way to review past adjustments when deciding on a new one. */}
                                    {loan.details?.adjustmentHistory && loan.details.adjustmentHistory.length > 0 && (
                                        <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #e5e7eb' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>ADJUSTMENT HISTORY</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {loan.details.adjustmentHistory.map((entry, idx) => (
                                                    <div key={idx} style={{ fontSize: '13px', color: '#374151', padding: '8px 10px', background: '#f9fafb', borderRadius: '6px' }}>
                                                        <div>
                                                            <strong>{entry.previousMonthlyRepaymentAmount ?? 'N/A'} AED/mo</strong>
                                                            {' → '}
                                                            <strong style={{ color: '#2563eb' }}>{entry.newMonthlyRepaymentAmount} AED/mo</strong>
                                                            {' '}({entry.previousRepaymentPeriod ?? 'N/A'} → {entry.newRepaymentPeriod} months)
                                                        </div>
                                                        <div style={{ color: '#6b7280', marginTop: '2px' }}>
                                                            Remaining balance at time: {entry.remainingBalanceAtAdjustment} AED
                                                        </div>
                                                        <div style={{ color: '#6b7280', marginTop: '2px' }}>
                                                            "{entry.reason}" — {entry.adjustedByName || 'Unknown'}, {entry.adjustedAt ? new Date(entry.adjustedAt).toLocaleString() : ''}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Extra Payment History - written by the "Record Extra Payment" flow above */}
                                    {loan.details?.extraPayments && loan.details.extraPayments.length > 0 && (
                                        <div style={{ marginTop: '15px', paddingTop: '10px', borderTop: '1px dashed #e5e7eb' }}>
                                            <div style={{ fontSize: '12px', fontWeight: '600', color: '#6b7280', marginBottom: '8px' }}>EXTRA PAYMENT HISTORY</div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                                {loan.details.extraPayments.map((entry, idx) => (
                                                    <div key={idx} style={{ fontSize: '13px', color: '#374151', padding: '8px 10px', background: '#f0fdf4', borderRadius: '6px' }}>
                                                        <div>
                                                            <strong style={{ color: '#15803d' }}>+{entry.amount} AED</strong>
                                                            {' '}(balance after: {entry.remainingBalanceAfter} AED)
                                                        </div>
                                                        <div style={{ color: '#6b7280', marginTop: '2px' }}>
                                                            "{entry.reason}" — {entry.recordedByName || 'Unknown'}, {entry.recordedAt ? new Date(entry.recordedAt).toLocaleString() : ''}
                                                        </div>
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
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <select
                                    value={leaveSummaryMonth}
                                    onChange={(e) => setLeaveSummaryMonth(Number(e.target.value))}
                                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: 'white', cursor: 'pointer' }}
                                >
                                    <option value={0}>Whole Year</option>
                                    {["January","February","March","April","May","June","July","August","September","October","November","December"].map((m, i) => (
                                        <option key={m} value={i + 1}>{m}</option>
                                    ))}
                                </select>
                                <select
                                    value={leaveSummaryYear}
                                    onChange={(e) => setLeaveSummaryYear(Number(e.target.value))}
                                    style={{ padding: '7px 14px', borderRadius: '8px', border: '1px solid #d1d5db', fontSize: '14px', background: 'white', cursor: 'pointer' }}
                                >
                                    {[2026, 2025, 2024, 2023].map(y => <option key={y} value={y}>{y}</option>)}
                                </select>
                            </div>
                        </div>

                        {/* Only the two type-agnostic aggregates here - the per-leave-type
                            breakdown (any number of leave types, not just 4 hardcoded ones)
                            is the dynamic grid below, which is the source of truth. */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '18px' }}>
                            {[
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

                {activeTab === "Leave Wallet" && (
                    <LeaveWalletTab employeeId={effectiveId} />
                )}

                {activeTab !== "Personal Info" && activeTab !== "Employment" && activeTab !== "Documents" && activeTab !== "Attendance" && activeTab !== "Assets" && activeTab !== "Onboarding" && activeTab !== "Offboarding" && activeTab !== "Loans" && activeTab !== "Leave Summary" && activeTab !== "Leave Wallet" && (
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
                    initialDocumentType={uploadPrefillType}
                    onClose={() => { setShowUploadModal(false); setUploadPrefillType(""); }}
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

            {showAddAllowanceModal && (
                <AddAllowanceModal
                    employee={employee}
                    onClose={() => setShowAddAllowanceModal(false)}
                    onConfirm={handleAddAllowance}
                    submitting={allowanceSubmitting}
                />
            )}

            {showAddExistingLoanModal && (
                <AddExistingLoanModal
                    show={showAddExistingLoanModal}
                    onClose={() => setShowAddExistingLoanModal(false)}
                    onSubmit={handleAddExistingLoan}
                    submitting={savingExistingLoan}
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

            {showAdjustLoanModal && (
                <AdjustLoanModal
                    show={showAdjustLoanModal}
                    request={selectedLoanForAdjust}
                    onClose={() => {
                        setShowAdjustLoanModal(false);
                        setSelectedLoanForAdjust(null);
                    }}
                    onSubmit={handleAdjustLoan}
                    submitting={savingLoanAdjust}
                />
            )}

            {showExtraPaymentModal && (
                <ExtraPaymentModal
                    show={showExtraPaymentModal}
                    request={selectedLoanForExtraPayment}
                    onClose={() => {
                        setShowExtraPaymentModal(false);
                        setSelectedLoanForExtraPayment(null);
                    }}
                    onSubmit={handleExtraPayment}
                    submitting={savingExtraPayment}
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
