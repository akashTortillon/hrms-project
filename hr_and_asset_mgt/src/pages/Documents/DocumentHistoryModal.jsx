import React, { useState, useEffect } from "react";
import "../../style/UploadDocumentModal.css";
import { getDocumentHistory } from "../../services/documentService";
import SvgIcon from "../../components/svgIcon/svgView";

export default function DocumentHistoryModal({ docId, onClose }) {
    const [history, setHistory] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (docId) fetchHistory();
    }, [docId]);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getDocumentHistory(docId);
            setHistory(data);
        } catch (err) {
            console.error(err);
            setError("Failed to load document history. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    const getFileUrl = (path) => {
        return `${import.meta.env.VITE_API_BASE.replace('/api', '')}/${path}`;
    };

    return (
        <div className="upload-docs-modal-backdrop" onClick={onClose}>
            <div className="upload-docs-modal-container" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 600 }}>
                <div className="upload-docs-modal-header">
                    <h3>Document Audit Trail & History</h3>
                    <button className="upload-docs-modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="upload-docs-modal-body">
                    {loading ? (
                        <div style={{ textAlign: "center", padding: 20 }}>Loading history...</div>
                    ) : error ? (
                        <div style={{ textAlign: "center", padding: 20, color: "#ef4444" }}>{error}</div>
                    ) : (
                        <div>
                            <div style={{ marginBottom: 24 }}>
                                <h4 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>{history?.name}</h4>
                                <div style={{ fontSize: 13, color: "#6b7280" }}>{history?.type}</div>
                            </div>

                            <div style={{ marginBottom: 24 }}>
                                <h5 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Audit Trail</h5>
                                <div className="audit-timeline" style={{ borderLeft: "2px solid #e5e7eb", paddingLeft: 20, position: "relative" }}>
                                    {history?.auditTrail?.map((log, idx) => (
                                        <div key={idx} style={{ marginBottom: 20, position: "relative" }}>
                                            <div style={{
                                                position: "absolute",
                                                left: -26,
                                                top: 2,
                                                width: 10,
                                                height: 10,
                                                borderRadius: "50%",
                                                background: log.action === "Upload" ? "#10b981" : "#3b82f6",
                                                border: "2px solid white"
                                            }} />
                                            <div style={{ fontWeight: 600, fontSize: 14 }}>{log.action}</div>
                                            <div style={{ fontSize: 13, color: "#4b5563" }}>{log.details}</div>
                                            <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4 }}>
                                                by {log.userName} • {new Date(log.timestamp).toLocaleString()}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {history?.versions?.length > 0 && (
                                <div>
                                    <h5 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Previous Versions</h5>
                                    <div style={{ border: "1px solid #e5e7eb", borderRadius: 8 }}>
                                        {history.versions.map((ver, idx) => (
                                            <div key={idx} style={{
                                                display: "flex",
                                                justifyContent: "space-between",
                                                alignItems: "center",
                                                padding: "12px 16px",
                                                borderBottom: idx === history.versions.length - 1 ? "none" : "1px solid #e5e7eb"
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: 13, fontWeight: 500 }}>Version {history.versions.length - idx}</div>
                                                    <div style={{ fontSize: 12, color: "#9ca3af" }}>
                                                        Archived on {new Date(ver.uploadedAt).toLocaleString()}
                                                    </div>
                                                </div>
                                                <a
                                                    href={getFileUrl(ver.filePath)}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#3b82f6", textDecoration: "none" }}
                                                >
                                                    <SvgIcon name="eye" size={16} /> View
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="upload-docs-modal-footer">
                    <button className="btn-upload-primary" onClick={onClose}>Close</button>
                </div>
            </div>
        </div>
    );
}
