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
import { toast } from "react-toastify";
import DeleteConfirmationModal from "../../components/reusable/DeleteConfirmationModal";

function Documents() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [documents, setDocuments] = useState([]);
  const [stats, setStats] = useState({ total: 0, valid: 0, expiring: 0, expired: 0 }); // New Stats State
  const [view, setView] = useState("list");
  const [showUploadModal, setShowUploadModal] = useState(false);

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
  }, []); // Run once on mount

  const fetchStats = async () => {
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
  }, [search, type, statusFilter]);

  const fetchDocs = async () => {
    setLoading(true);
    try {
      // Build API Filters
      const params = {};
      if (search) params.search = search;
      if (type !== "All Types") params.type = type;
      if (statusFilter !== "All Status") params.status = statusFilter;

      const data = await getDocuments(params);

      // Transform backend data to frontend model
      const formatted = data.map(doc => ({
        _id: doc._id,
        id: doc._id,
        title: doc.name,
        type: doc.type,
        location: doc.location || "Main Office",
        department: "General",
        issueDate: doc.issueDate
          ? new Date(doc.issueDate).toISOString().split("T")[0]
          : "N/A",
        expiryDate: new Date(doc.expiryDate).toISOString().split("T")[0],
        status: doc.status,
        filePath: doc.filePath
      }));
      setDocuments(formatted);
    } catch (error) {
      console.error(error);
      toast.error("Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  // Extract Unique Types for Filter Dropdown (from currently fetched docs works, 
  // but ideally we'd want all available types. For now, we can use a Set from loaded docs 
  // OR keep the hardcoded ones + any new ones found)
  // Since we are filtering on backend, the returned docs only have the filtered types.
  // We might want to fetch "all types" separately or just pass a standard list + dynamic.
  // Let's stick to standard list for now, or pass props if we had a Master API for Document Types.

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

  return (
    <div>
      <DocumentLibraryHeader
        stats={stats} // Pass stats object directly
        onUploadClick={() => setShowUploadModal(true)}
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
      />

      {loading ? (
        <div style={{ padding: 20, textAlign: "center", color: "#6b7280" }}>Loading...</div>
      ) : view === "list" ? (
        <DocumentsTable documents={documents} onDelete={handleDelete} />
      ) : (
        <DocumentsGrid documents={documents} />
      )}

      <ExpiryReminders documents={documents} />

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
