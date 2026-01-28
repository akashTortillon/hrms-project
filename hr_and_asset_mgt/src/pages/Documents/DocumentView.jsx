import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DocumentLibraryHeader from "./DocumentCards";
import "../../style/Document.css";
import DocumentsTable from "./DocumentsTable";
import DocumentsFilter from "./DocumentsFilter";
import DocumentsGrid from "./DocumentsGrid";
import ExpiryReminders from "./DocumentExpiryCards";
import UploadDocumentModal from "./UploadDocumentModal";
import { getDocuments, uploadDocument, deleteDocument, getDocumentStats } from "../../services/documentService";
import { getMyDocuments } from "../../services/employeeDocumentService";
import { companyDocumentTypeService, documentTypeService } from "../../services/masterService";
import { toast } from "react-toastify";
import DeleteConfirmationModal from "../../components/reusable/DeleteConfirmationModal";
import { useRole } from "../../contexts/RoleContext";

function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, expiring: 0, critical: 0, expired: 0 }); // New Stats State
  const [view, setView] = useState("list");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [typeOptions, setTypeOptions] = useState(["All Types"]);
  // Static status options since backend calculates them
  const statusOptions = ["All Status", "Valid", "Expiring Soon", "Critical", "Expired"];

  // Role Checks
  const { role, hasPermission } = useRole();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  // Managers see Company Docs. Employees see Personal Docs.
  const isManager = hasPermission("MANAGE_DOCUMENTS");

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [loading, setLoading] = useState(false);

  // Read State from URL
  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "All Types";
  const statusFilter = searchParams.get("status") || "All Status";

  // FETCH DATA
  useEffect(() => {
    fetchStats(); // Fetch initial stats
    fetchMasters();
  }, [role, isManager]); // Re-run if role/manager status changes

  const fetchMasters = async () => {
    try {
      let types = [];
      if (isManager) {
        types = await companyDocumentTypeService.getAll();
      } else {
        // Employees need Employee Document Types (Passport, Visa, etc.)
        types = await documentTypeService.getAll();
      }

      if (types && types.length > 0) {
        setTypeOptions(["All Types", ...types.map(t => t.name)]);
      }
    } catch (err) {
      console.error("Failed to fetch filter options", err);
    }
  };

  const fetchStats = async () => {
    // Only fetch global stats if manager
    if (!isManager) return;
    try {
      const data = await getDocumentStats();
      setStats(data);
    } catch (err) {
      console.error("Stats failed", err);
    }
  };

  // Debounce Search Effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocs();
    }, 400); // 400ms debounce
    return () => clearTimeout(timer);
  }, [search, type, statusFilter, role]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      let data = [];
      let formatted = [];

      if (isManager) {
        // --- COMPANY DOCUMENTS VIEW (Admin/HR) ---
        // Build API Filters
        const params = {};
        if (search) params.search = search;
        if (type !== "All Types") params.type = type;
        if (statusFilter !== "All Status") params.status = statusFilter;

        data = await getDocuments(params);
        formatted = formatCompanyDocs(data);

      } else {
        // --- EMPLOYEE PERSONAL DOCUMENTS VIEW ---
        // Fetch personal docs using employee ID

        // Priority: user.employeeId (if linked) > user.id (if direct)
        // Ensure we have an ID to query
        const empId = user.employeeId || user.id || user._id;

        if (empId) {
          console.log("Fetching personal docs for:", empId);
          data = await getMyDocuments(empId);
          formatted = formatEmployeeDocs(data);
        } else {
          console.warn("No employee ID found for current user");
        }
      }

      setDocuments(formatted);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  // Helper: Format Company Docs
  const formatCompanyDocs = (data) => {
    return data.map(doc => {
      let daysLeft = null;
      let expiryStr = "N/A";

      if (doc.expiryDate) {
        daysLeft = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        expiryStr = new Date(doc.expiryDate).toISOString().split("T")[0];
      }

      return {
        _id: doc._id,
        id: doc._id,
        title: doc.name,
        type: doc.type,
        location: doc.location || "Main Office",
        department: doc.uploaderRole || "Admin",
        issueDate: doc.issueDate
          ? new Date(doc.issueDate).toISOString().split("T")[0]
          : "N/A",
        expiryDate: expiryStr,
        status: doc.status,
        daysLeft: daysLeft,
        filePath: doc.filePath,
        isPersonal: false
      };
    });
  };

  // Helper: Format Employee Personal Docs
  const formatEmployeeDocs = (data) => {
    return data.map(doc => {
      let daysLeft = null;
      let expiryStr = "N/A";

      if (doc.expiryDate) {
        daysLeft = Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));
        expiryStr = new Date(doc.expiryDate).toISOString().split("T")[0];
      }

      return {
        _id: doc._id,
        id: doc._id,
        title: `Personal: ${doc.documentType}`,
        type: doc.documentType,
        location: "Personal File",
        department: "Me",
        issueDate: doc.createdAt
          ? new Date(doc.createdAt).toISOString().split("T")[0]
          : "N/A",
        expiryDate: expiryStr,
        status: doc.status || "Valid",
        daysLeft: daysLeft,
        filePath: doc.filePath,
        isPersonal: true
      };
    });
  };


  // Update URL Helpers
  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      if (value && value !== "All Types" && value !== "All Status") {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  };

  // HANDLE UPLOAD
  const handleUpload = async (formData) => {
    try {
      await uploadDocument(formData);
      toast.success("Document uploaded successfully");
      setShowUploadModal(false);
      fetchDocs(); // Refresh list
      fetchStats(); // Refresh stats too
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    }
  };

  // TRIGGER DELETE MODAL
  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  // EXECUTE DELETE
  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteDocument(deleteId);
      toast.success("Document deleted");
      setShowDeleteModal(false);
      fetchDocs();
      fetchStats(); // Refresh stats too
    } catch (error) {
      toast.error("Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  // Conditional Rendering Logic
  // - Managers see Header with Stats & Upload button.
  // - Employees see Simplified Header (maybe no stats or personal stats only).
  // - Managers have Delete action. Employees do not.

  return (
    <div>
      {/* 
         If Manager: Show full header with Global Stats. 
         If Employee: Show simpler header or personal stats (not implemented yet).
         For now, passing empty stats object for employees to hide cards.
      */}
      <DocumentLibraryHeader
        stats={isManager ? stats : { total: documents.length, valid: 0, expiring: 0, critical: 0, expired: 0 }}
        onUploadClick={isManager ? () => setShowUploadModal(true) : null}
      />

      <DocumentsFilter
        search={search}
        onSearchChange={(val) => updateFilter("search", val)}
        type={type}
        onTypeChange={(val) => updateFilter("type", val)}
        status={statusFilter}
        onStatusChange={(val) => updateFilter("status", val)}
        total={documents.length}
        view={view}
        onViewChange={setView}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
      />

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>Loading...</div>
      ) : view === "list" ? (
        <DocumentsTable documents={documents} onDelete={isManager ? handleDelete : null} />
      ) : (
        <DocumentsGrid documents={documents} />
      )}

      {/* Only show expiry reminders for managers, or maybe personal? */}
      {isManager && <ExpiryReminders documents={documents} />}

      {/* MODALS */}
      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}

      <DeleteConfirmationModal
        show={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={confirmDelete}
        itemName="this document"
        loading={deleteLoading}
      />
    </div>
  );
}

export default Documents;
