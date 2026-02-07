import React, { useState, useEffect } from "react";
import { getAssets } from "../../services/assetService";
import "../../style/AddEmployeeModal.css"; // Reusing existing modal styles


export default function AssignAssetToEmployeeModal({ onClose, onAssign, employeeId }) {
    const [availableAssets, setAvailableAssets] = useState([]);
    const [selectedAssetId, setSelectedAssetId] = useState("");
    const [selectedAsset, setSelectedAsset] = useState(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [remarks, setRemarks] = useState("");

    useEffect(() => {
        fetchAvailableAssets();
    }, []);

    const fetchAvailableAssets = async () => {
        try {
            const response = await getAssets({ status: "Available" });
            setAvailableAssets(Array.isArray(response) ? response : []);
        } catch (error) {
            console.error("Failed to fetch available assets", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAssetChange = (e) => {
        const assetId = e.target.value;
        setSelectedAssetId(assetId);

        const asset = availableAssets.find(a => a._id === assetId);
        setSelectedAsset(asset || null);
    };

    const handleSubmit = async () => {
        if (!selectedAssetId) {
            alert("Please select an asset");
            return;
        }

        setSubmitting(true);
        try {
            await onAssign({
                assetId: selectedAssetId,
                custodianType: "EMPLOYEE", // ✅ Required by backend
                toEmployee: employeeId,
                remarks: remarks
            });
            onClose();
        } catch (error) {
            console.error("Assignment failed", error);
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <h3>Assign Asset to Employee</h3>
                    <button className="modal-close" onClick={onClose}>✕</button>
                </div>

                <div className="modal-body">
                    <div className="modal-grid">
                        <div className="form-group full-width">
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Select Asset</label>
                            <select
                                value={selectedAssetId}
                                onChange={handleAssetChange}
                                disabled={loading}
                                style={{
                                    width: "100%",
                                    padding: "10px 12px",
                                    borderRadius: "8px",
                                    border: "1px solid #d1d5db",
                                    backgroundColor: "white",
                                    fontSize: "14px",
                                    height: "42px"
                                }}
                            >
                                <option value="">-- Select Available Asset --</option>
                                {availableAssets.map(asset => (
                                    <option key={asset._id} value={asset._id}>
                                        {`${asset.name} (${asset.assetCode})`}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {selectedAsset && (
                            <div
                                className="asset-preview-card full-width"
                                style={{
                                    background: "#f3f4f6",
                                    padding: "15px",
                                    borderRadius: "8px",
                                    marginTop: "10px",
                                    border: "1px solid #e5e7eb"
                                }}
                            >
                                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#374151" }}>Asset Details</h4>
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", fontSize: "13px" }}>
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Name:</span> <br />
                                        <strong style={{ color: "#111827" }}>{selectedAsset.name}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Code:</span> <br />
                                        <strong style={{ color: "#111827" }}>{selectedAsset.assetCode}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Type:</span> <br />
                                        <strong style={{ color: "#111827" }}>{selectedAsset.type}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Category:</span> <br />
                                        <strong style={{ color: "#111827" }}>{selectedAsset.category}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Serial No:</span> <br />
                                        <strong style={{ color: "#111827" }}>{selectedAsset.serialNumber || "N/A"}</strong>
                                    </div>
                                    <div>
                                        <span style={{ color: "#6b7280" }}>Price:</span> <br />
                                        <strong style={{ color: "#111827" }}>{selectedAsset.purchaseCost} AED</strong>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* <div className="form-group full-width" style={{ marginTop: "15px" }}>
                            <label style={{ display: "block", marginBottom: "8px", fontWeight: "500" }}>Remarks</label>
                            <textarea
                                rows="3"
                                value={remarks}
                                onChange={(e) => setRemarks(e.target.value)}
                                placeholder="Enter any remarks or notes..."
                                style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db" }}
                            />
                        </div> */}
                    </div>
                </div>

                <div className="modal-footer">
                    <button className="btn-secondary" onClick={onClose} disabled={submitting}>Cancel</button>
                    <button
                        className="btn-primary"
                        onClick={handleSubmit}
                        disabled={submitting || !selectedAssetId}
                    >
                        {submitting ? "Assigning..." : "Assign Asset"}
                    </button>
                </div>
            </div>
        </div>
    );
}
