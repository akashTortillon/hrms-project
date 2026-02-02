import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import DocumentLibraryHeader from "./DocumentCards";
import "../../style/Document.css";
import DocumentsTable from "./DocumentsTable";
import DocumentsFilter from "./DocumentsFilter";
import DocumentsGrid from "./DocumentsGrid";
import ExpiryReminders from "./DocumentExpiryCards";
import UploadDocumentModal from "./UploadDocumentModal";
import ReplaceDocumentModal from "./ReplaceDocumentModal";
import DocumentHistoryModal from "./DocumentHistoryModal";
import {
  getDocuments,
  uploadDocument,
  deleteDocument,
  getDocumentStats,
  replaceDocument
} from "../../services/documentService";
import { getMyDocuments } from "../../services/employeeDocumentService";
import { companyDocumentTypeService, documentTypeService, getDepartments } from "../../services/masterService";
import { toast } from "react-toastify";
import DeleteConfirmationModal from "../../components/reusable/DeleteConfirmationModal";
import { useRole } from "../../contexts/RoleContext";

function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, expiring: 0, critical: 0, expired: 0 });
  const [view, setView] = useState("list");

  // Modal States
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);

  const [typeOptions, setTypeOptions] = useState(["All Types"]);
  const [departmentOptions, setDepartmentOptions] = useState(["All Departments"]);
  const statusOptions = ["All Status", "Valid", "Expiring Soon", "Critical", "Expired"];

  const { role, hasPermission } = useRole();
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  const isManager = hasPermission("MANAGE_DOCUMENTS");

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const search = searchParams.get("search") || "";
  const type = searchParams.get("type") || "All Types";
  const statusFilter = searchParams.get("status") || "All Status";
  const departmentFilter = searchParams.get("department") || "All Departments";

  useEffect(() => {
    fetchStats();
    fetchMasters();
  }, [role, isManager]);

  const fetchMasters = async () => {
    try {
      let types = [];
      let depts = [];
      if (isManager) {
        [types, depts] = await Promise.all([
          companyDocumentTypeService.getAll(),
          getDepartments()
        ]);
        setDepartmentOptions(["All Departments", ...depts.map(d => d.name)]);
      } else {
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
    if (!isManager) return;
    try {
      const data = await getDocumentStats();
      setStats(data);
    } catch (err) {
      console.error("Stats failed", err);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchDocs();
    }, 400);
    return () => clearTimeout(timer);
  }, [search, type, statusFilter, departmentFilter, role]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      let data = [];
      let formatted = [];

      if (isManager) {
        const params = {};
        if (search) params.search = search;
        if (type !== "All Types") params.type = type;
        if (statusFilter !== "All Status") params.status = statusFilter;
        if (departmentFilter !== "All Departments") params.department = departmentFilter;

        data = await getDocuments(params);
        formatted = formatCompanyDocs(data);
      } else {
        const empId = user.employeeId || user.id || user._id;
        if (empId) {
          data = await getMyDocuments(empId);
          formatted = formatEmployeeDocs(data);
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
        department: doc.department || doc.uploaderRole || "Admin",
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

  const updateFilter = (key, value) => {
    setSearchParams(prev => {
      const newParams = new URLSearchParams(prev);
      const defaultValues = {
        type: "All Types",
        status: "All Status",
        department: "All Departments"
      };

      if (value && value !== defaultValues[key]) {
        newParams.set(key, value);
      } else {
        newParams.delete(key);
      }
      return newParams;
    });
  };

  const handleUpload = async (formData) => {
    try {
      await uploadDocument(formData);
      toast.success("Document uploaded successfully");
      setShowUploadModal(false);
      fetchDocs();
      fetchStats();
    } catch (error) {
      console.error(error);
      toast.error("Upload failed");
    }
  };

  const handleReplace = async (id, formData) => {
    try {
      await replaceDocument(id, formData);
      toast.success("Document version replaced");
      setShowReplaceModal(false);
      setSelectedDoc(null);
      fetchDocs();
    } catch (error) {
      console.error(error);
      toast.error("Replacement failed");
    }
  };

  const handleDelete = (id) => {
    setDeleteId(id);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;
    setDeleteLoading(true);
    try {
      await deleteDocument(deleteId);
      toast.success("Document deleted");
      setShowDeleteModal(false);
      fetchDocs();
      fetchStats();
    } catch (error) {
      toast.error("Delete failed");
    } finally {
      setDeleteLoading(false);
    }
  };

  const triggerReplace = (id) => {
    const d = documents.find(doc => doc.id === id);
    setSelectedDoc(d);
    setShowReplaceModal(true);
  };

  const triggerHistory = (id) => {
    setSelectedDoc({ id });
    setShowHistoryModal(true);
  };

  return (
    <div>
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
        department={departmentFilter}
        onDepartmentChange={(val) => updateFilter("department", val)}
        total={documents.length}
        view={view}
        onViewChange={setView}
        typeOptions={typeOptions}
        statusOptions={statusOptions}
        departmentOptions={departmentOptions}
      />

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>Loading...</div>
      ) : view === "list" ? (
        <DocumentsTable
          documents={documents}
          onDelete={isManager ? handleDelete : null}
          onReplace={isManager ? triggerReplace : null}
          onHistory={isManager ? triggerHistory : null}
        />
      ) : (
        <DocumentsGrid
          documents={documents}
          onDelete={isManager ? handleDelete : null}
          onReplace={isManager ? triggerReplace : null}
          onHistory={isManager ? triggerHistory : null}
        />
      )}

      {isManager && <ExpiryReminders documents={documents} />}

      {/* MODALS */}
      {showUploadModal && (
        <UploadDocumentModal
          onClose={() => setShowUploadModal(false)}
          onUpload={handleUpload}
        />
      )}

      {showReplaceModal && (
        <ReplaceDocumentModal
          doc={selectedDoc}
          onClose={() => setShowReplaceModal(false)}
          onReplace={handleReplace}
        />
      )}

      {showHistoryModal && (
        <DocumentHistoryModal
          docId={selectedDoc?.id}
          onClose={() => setShowHistoryModal(false)}
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
