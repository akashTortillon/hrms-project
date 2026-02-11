import React, { useState } from "react";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/AddEmployeeModal.css";
import CustomSelect from "../../components/reusable/CustomSelect";


export default function DocumentUploadModal({ onClose, onUpload, onDelete, onDownload, asset }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [documentType, setDocumentType] = useState("Invoice");
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

  const documents = asset?.documents || [];

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Only PDF, JPG, and PNG files are allowed');
      }
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragActive(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png'];
      if (allowedTypes.includes(file.type)) {
        setSelectedFile(file);
      } else {
        alert('Only PDF, JPG, and PNG files are allowed');
      }
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    if (!documentType) {
      alert('Please select document type');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      formData.append('type', documentType);

      await onUpload(asset._id || asset.id, formData);
      setSelectedFile(null);
      setDocumentType("Invoice");
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = (docId) => {
    if (window.confirm('Are you sure you want to delete this document?')) {
      onDelete(asset._id || asset.id, docId);
    }
  };

  const handleDownloadDoc = (docId, fileName) => {
    onDownload(asset._id || asset.id, docId, fileName);
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getDocumentIcon = (type) => {
    const icons = {
      "Invoice": "📄",
      "LPO": "📋",
      "Warranty Certificate": "🛡️",
      "AMC Contract": "📝",
      "Other": "📎"
    };
    return icons[type] || "📄";
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal-container"
        style={{ maxWidth: "700px" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3>Asset Documents - {asset?.name}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Upload Section */}
          <div style={{ marginBottom: "24px" }}>
            <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: "600" }}>
              Upload New Document
            </h4>

            {/* Document Type Selector */}
            <div style={{ marginBottom: "12px" }}>
              <label style={{ display: "block", marginBottom: "6px", fontSize: "13px" }}>
                Document Type
              </label>
              <CustomSelect
                name="documentType"
                placeholder="Select Document Type"
                value={documentType}
                onChange={(value) => setDocumentType(value)}
                options={[
                  { value: "Invoice", label: "Invoice" },
                  { value: "LPO", label: "LPO" },
                  { value: "Warranty Certificate", label: "Warranty Certificate" },
                  { value: "AMC Contract", label: "AMC Contract" },
                  { value: "Other", label: "Other" }
                ]}
              />
            </div>

            {/* File Drop Zone */}
            <div
              style={{
                border: dragActive ? '2px dashed #3b82f6' : '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '32px 20px',
                backgroundColor: dragActive ? '#f0f9ff' : '#fafafa',
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.3s ease'
              }}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById('fileInput').click()}
            >
              {selectedFile ? (
                <div>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📄</div>
                  <div style={{ fontWeight: 'bold', color: '#333' }}>{selectedFile.name}</div>
                  <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
                    {formatFileSize(selectedFile.size)}
                  </div>
                </div>
              ) : (
                <div style={{ color: '#666' }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>📁</div>
                  <div>Drag & drop a file here or click to browse</div>
                  <div style={{ fontSize: '12px', marginTop: '8px' }}>
                    Accepted formats: PDF, JPG, PNG (Max 5MB)
                  </div>
                </div>
              )}
              <input
                id="fileInput"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileSelect}
                style={{ display: 'none' }}
              />
            </div>

            <button
              className="btn-primary"
              onClick={handleUpload}
              disabled={!selectedFile || uploading}
              style={{ marginTop: "12px", width: "100%" }}
            >
              {uploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>

          {/* Existing Documents List */}
          <div>
            <h4 style={{ marginBottom: "12px", fontSize: "14px", fontWeight: "600" }}>
              Existing Documents ({documents.length})
            </h4>

            {documents.length === 0 ? (
              <div style={{
                textAlign: "center",
                padding: "32px",
                background: "#f8fafc",
                borderRadius: "8px",
                color: "#64748b"
              }}>
                <div style={{ fontSize: "36px", marginBottom: "8px" }}>📂</div>
                <div>No documents uploaded yet</div>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {documents.map((doc) => (
                  <div
                    key={doc._id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "12px",
                      background: "#f8fafc",
                      borderRadius: "8px",
                      border: "1px solid #e2e8f0"
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1 }}>
                      <div style={{ fontSize: "24px" }}>
                        {getDocumentIcon(doc.type)}
                      </div>
                      <div>
                        <div style={{ fontWeight: "500", fontSize: "14px" }}>
                          {doc.fileName}
                        </div>
                        <div style={{ fontSize: "12px", color: "#64748b" }}>
                          {doc.type} • Uploaded {new Date(doc.uploadedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        className="icon-btn"
                        onClick={() => handleDownloadDoc(doc._id, doc.fileName)}
                        title="Download"
                        style={{ background: "#3b82f6", color: "white" }}
                      >
                        <SvgIcon name="download" size={16} />
                      </button>
                      <button
                        className="icon-btn delete-btn"
                        onClick={() => handleDeleteDoc(doc._id)}
                        title="Delete"
                      >
                        <SvgIcon name="delete" size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}