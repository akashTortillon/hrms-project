import { useState } from "react";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import AppButton from "../../components/reusable/Button.jsx";
import "../../style/Modal.css";

export default function DocumentApproveModal({ show, request, onClose, onApprove }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Validate file type
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

  const handleApprove = async () => {
    if (!selectedFile) {
      alert('Please select a file to upload');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('document', selectedFile);
      
      await onApprove(request._id, formData);
      setSelectedFile(null);
      onClose();
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Failed to upload document. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    const r = bytes / Math.pow(k, i);
    return parseFloat(r.toFixed(2)) + ' ' + sizes[i];
  };

  if (!show || !request) return null;

  return (
    <CustomModal
      show={show}
      title="Approve Document Request"
      onClose={onClose}
      footer={
        <div style={{ display: 'flex', gap: '12px' }}>
          <AppButton
            variant="secondary"
            onClick={onClose}
            disabled={uploading}
          >
            Cancel
          </AppButton>
          <AppButton
            variant="primary"
            onClick={handleApprove}
            disabled={!selectedFile || uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Document'}
          </AppButton>
        </div>
      }
    >
      <div style={{ padding: '20px 0' }}>
        {/* Request Summary */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '16px',
          borderRadius: '8px',
          marginBottom: '20px'
        }}>
          <h4 style={{ margin: '0 0 12px 0', color: '#333' }}>Request Summary</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            <div><strong>Employee:</strong> {request.userId?.name || 'N/A'}</div>
            <div><strong>Document Type:</strong> {request.documentType}</div>
            <div><strong>Purpose:</strong> {request.details?.purpose || 'N/A'}</div>
            <div><strong>Submitted:</strong> {new Date(request.submittedAt).toLocaleDateString()}</div>
          </div>
        </div>

        {/* File Upload Area */}
        <div style={{ textAlign: 'center' }}>
          <div
            style={{
              border: dragActive ? '2px dashed #007bff' : '2px dashed #ccc',
              borderRadius: '8px',
              padding: '40px 20px',
              backgroundColor: dragActive ? '#f0f8ff' : '#fafafa',
              cursor: 'pointer',
              transition: 'all 0.3s ease'
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput').click()}
          >
            {selectedFile ? (
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '48px', color: '#28a745', marginBottom: '12px' }}>📄</div>
                <div style={{ fontWeight: 'bold', color: '#333' }}>{selectedFile.name}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>
                  {formatFileSize(selectedFile.size)}
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#666' }}>
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
        </div>
      </div>
    </CustomModal>
  );
}
