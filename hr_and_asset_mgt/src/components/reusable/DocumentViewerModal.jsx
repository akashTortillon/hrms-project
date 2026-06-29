import React from "react";
import { createPortal } from "react-dom";

export default function DocumentViewerModal({ documentUrl, fileName, onClose }) {
  if (!documentUrl) return null;

  // Derive full URL if it's a relative path
  const API_BASE = (import.meta.env.VITE_API_BASE || "http://localhost:5000").replace(/\/$/, '');
  
  let normalizedPath = documentUrl;
  if (!documentUrl.startsWith("http")) {
    normalizedPath = documentUrl.replace(/\\/g, '/');
    if (!normalizedPath.startsWith('/')) {
      normalizedPath = '/' + normalizedPath;
    }
  }
  
  const fullUrl = documentUrl.startsWith("http") ? documentUrl : `${API_BASE}${normalizedPath}`;

  const isImage = fullUrl.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
  const isPdf = fullUrl.match(/\.(pdf)$/i) != null;

  return createPortal(
    <div 
      className="modal-backdrop" 
      onClick={onClose} 
      style={{ zIndex: 99999, display: "flex", justifyContent: "center", alignItems: "center" }}
    >
      <div 
        className="modal-container" 
        onClick={e => e.stopPropagation()} 
        style={{ 
          width: "90%", 
          maxWidth: "1000px", 
          height: "90vh", 
          display: "flex", 
          flexDirection: "column",
          padding: 0,
          overflow: "hidden"
        }}
      >
        <div className="modal-header" style={{ padding: "16px 20px", borderBottom: "1px solid #e2e8f0" }}>
          <h3 style={{ margin: 0, fontSize: "16px", color: "#1e293b", fontWeight: "600" }}>
            {fileName || "Document Viewer"}
          </h3>
          <button className="modal-close" onClick={onClose} style={{ fontSize: "20px" }}>✕</button>
        </div>
        
        <div className="modal-body" style={{ flex: 1, padding: 0, background: "#f1f5f9", display: "flex", justifyContent: "center", alignItems: "center", overflow: "hidden" }}>
          {isImage ? (
            <img 
              src={fullUrl} 
              alt={fileName} 
              style={{ maxWidth: "100%", maxHeight: "100%", objectFit: "contain" }} 
            />
          ) : isPdf ? (
            <iframe 
              src={fullUrl} 
              title={fileName} 
              width="100%" 
              height="100%" 
              style={{ border: "none" }} 
            />
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px" }}>📄</div>
              <p style={{ marginBottom: "16px", fontWeight: "500" }}>This file type cannot be previewed directly.</p>
              <a 
                href={fullUrl} 
                target="_blank" 
                rel="noreferrer" 
                style={{ 
                  color: "#fff", 
                  background: "#2563eb", 
                  padding: "8px 16px", 
                  borderRadius: "6px", 
                  textDecoration: "none",
                  fontWeight: "500"
                }}
              >
                Download / Open File
              </a>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
