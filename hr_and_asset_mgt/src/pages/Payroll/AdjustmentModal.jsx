import React, { useState, useEffect } from 'react';
import CustomModal from "../../components/reusable/CustomModal.jsx";
import { toast } from 'react-toastify';
import { payrollService } from "../../services/payrollService";
import SvgIcon from "../../components/svgIcon/svgView";
import DeleteConfirmationModal from "../../components/reusable/DeleteConfirmationModal";

export default function AdjustmentModal({ show, onClose, employees = [], onSuccess, initialRecord }) {
    const [formData, setFormData] = useState({
        payrollId: '',
        type: 'ALLOWANCE',
        name: '',
        amount: '',
        reason: '' // ✅ NEW
    });

    // Delete Modal State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    // History State
    const [showHistory, setShowHistory] = useState(false);
    const [historyLogs, setHistoryLogs] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);

    useEffect(() => {
        if (show) {
            if (initialRecord) {
                setFormData(prev => ({ ...prev, payrollId: initialRecord._id }));
            } else {
                setFormData(prev => ({ ...prev, payrollId: '' }));
            }
            setShowHistory(false); // Reset to form view
        }
    }, [show, initialRecord]);

    const fetchHistory = async () => {
        if (!formData.payrollId) return;
        setHistoryLoading(true);
        try {
            const logs = await payrollService.getAuditLogs(formData.payrollId);
            setHistoryLogs(logs);
        } catch (error) {
            toast.error("Failed to fetch history");
        } finally {
            setHistoryLoading(false);
        }
    };

    const toggleHistory = () => {
        if (!showHistory) {
            fetchHistory();
        }
        setShowHistory(!showHistory);
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!formData.payrollId || !formData.name || !formData.amount || !formData.reason) { // ✅ Reason Check
            toast.error("Please fill all fields, including Reason.");
            return;
        }

        try {
            await payrollService.addAdjustment(formData);
            toast.success("Adjustment added correctly");
            onSuccess(); // Refresh
            onClose();
            setFormData({ payrollId: '', type: 'ALLOWANCE', name: '', amount: '' });
        } catch (error) {
            toast.error(error.response?.data?.message || "Failed to add adjustment");
        }
    };

    const handleRemoveClick = (itemId, type, name) => {
        setItemToDelete({ itemId, type, name });
        setShowDeleteModal(true);
    };

    const confirmDelete = async () => {
        if (!itemToDelete) return;
        setDeleteLoading(true);
        try {
            await payrollService.removePayrollItem(formData.payrollId, itemToDelete.itemId, itemToDelete.type);
            toast.success("Item removed successfully");
            onSuccess();
            setShowDeleteModal(false);
            setItemToDelete(null);
        } catch (error) {
            toast.error("Failed to remove item");
        } finally {
            setDeleteLoading(false);
        }
    };

    const selectedRecord = employees.find(e => e._id === formData.payrollId);

    return (
        <CustomModal show={show} onClose={onClose} title={showHistory ? "Adjustment History" : "Add Manual Adjustment"} width="500px">
            <div style={{ padding: '0 8px' }}>

                {/* Header Actions - Toggle History */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                    {formData.payrollId && (
                        <button
                            onClick={toggleHistory}
                            className="history-toggle-btn"
                        >
                            <SvgIcon name={showHistory ? "arrow-left" : "history"} size={14} />
                            {showHistory ? "Back to Form" : "View History"}
                        </button>
                    )}
                </div>

                {showHistory ? (
                    /* HISTORY VIEW */
                    <div className="history-list">
                        {historyLoading ? (
                            <p className="text-center text-gray-500 py-4">Loading history...</p>
                        ) : historyLogs.length === 0 ? (
                            <p className="text-center text-gray-500 py-4">No history found for this employee's payroll.</p>
                        ) : (
                            <div style={{ padding: 0 }}>
                                {historyLogs.map(log => (
                                    <div key={log._id} className="history-item">
                                        <div className="history-meta">
                                            <span>{new Date(log.createdAt).toLocaleString()}</span>
                                            <span>by {log.performedByName || 'System'}</span>
                                        </div>
                                        <div className="history-detail">
                                            {log.details}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ) : (
                    /* FORM VIEW */
                    <>
                        {/* Employee Select */}
                        <div className="modal-form-group">
                            <label className="modal-label">Select Employee</label>
                            <select
                                name="payrollId"
                                className={`modal-input ${initialRecord ? 'disabled-look' : ''}`}
                                value={formData.payrollId}
                                onChange={handleChange}
                                disabled={!!initialRecord}
                                style={initialRecord ? { backgroundColor: '#f3f4f6' } : {}}
                            >
                                <option value="">-- Choose Employee --</option>
                                {employees.map(emp => (
                                    <option key={emp._id} value={emp._id}>
                                        {emp.employee?.name || "Unknown"} ({emp.employee?.code})
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Existing Adjustments Display */}
                        {selectedRecord && (
                            <div style={{ marginBottom: '16px', background: '#f9fafb', padding: '10px', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                                <h4 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '8px', color: '#374151' }}>Current Adjustments</h4>

                                {/* Allowances */}
                                <div style={{ marginBottom: '8px' }}>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#059669' }}>Allowances</span>
                                    {selectedRecord.allowances && selectedRecord.allowances.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
                                            {selectedRecord.allowances.map(item => (
                                                <li key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
                                                    <span>{item.name} ({item.amount})</span>
                                                    <button
                                                        onClick={() => handleRemoveClick(item._id, 'ALLOWANCE', item.name)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                                                        title="Remove Allowance"
                                                    >
                                                        <SvgIcon name="delete" size={14} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <div style={{ fontSize: '12px', color: '#9ca3af' }}>No allowances</div>}
                                </div>

                                {/* Deductions */}
                                <div>
                                    <span style={{ fontSize: '12px', fontWeight: '600', color: '#dc2626' }}>Deductions</span>
                                    {selectedRecord.deductions && selectedRecord.deductions.length > 0 ? (
                                        <ul style={{ listStyle: 'none', padding: 0, margin: '4px 0 0 0' }}>
                                            {selectedRecord.deductions.map(item => (
                                                <li key={item._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', padding: '4px 0', borderBottom: '1px dashed #e5e7eb' }}>
                                                    <span>{item.name} ({item.amount})</span>
                                                    <button
                                                        onClick={() => handleRemoveClick(item._id, 'DEDUCTION', item.name)}
                                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', padding: '2px' }}
                                                        title="Remove Deduction"
                                                    >
                                                        <SvgIcon name="delete" size={14} />
                                                    </button>
                                                </li>
                                            ))}
                                        </ul>
                                    ) : <div style={{ fontSize: '12px', color: '#9ca3af' }}>No deductions</div>}
                                </div>
                            </div>
                        )}

                        {/* Type */}
                        <div className="modal-form-group">
                            <label className="modal-label">Adjustment Type</label>
                            <select
                                name="type"
                                className="modal-input"
                                value={formData.type}
                                onChange={handleChange}
                            >
                                <option value="ALLOWANCE">Allowance (Add to Salary)</option>
                                <option value="DEDUCTION">Deduction (Subtract from Salary)</option>
                            </select>
                        </div>

                        {/* Name */}
                        <div className="modal-form-group">
                            <label className="modal-label">Description / Name</label>
                            <input
                                type="text"
                                name="name"
                                className="modal-input"
                                placeholder="e.g. Sales Bonus, Uniform Damage"
                                value={formData.name}
                                onChange={handleChange}
                            />
                        </div>

                        {/* Amount */}
                        <div className="modal-form-group">
                            <label className="modal-label">Amount (AED)</label>
                            <input
                                type="number"
                                name="amount"
                                className="modal-input"
                                placeholder="0.00"
                                value={formData.amount}
                                onChange={handleChange}
                            />
                        </div>


                        {/* Reason */}
                        <div className="modal-form-group">
                            <label className="modal-label">Reason <span style={{ color: 'red' }}>*</span></label>
                            <textarea
                                name="reason"
                                className="modal-input"
                                placeholder="Why is this adjustment being made?"
                                rows={2}
                                value={formData.reason}
                                onChange={handleChange}
                                style={{ resize: 'vertical' }}
                            />
                        </div>

                        {/* Actions */}
                        <div className="modal-actions">
                            <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleSubmit} className="btn btn-primary">Save Adjustment</button>
                        </div>
                    </>
                )}

            </div>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                show={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                itemName={itemToDelete?.name || "this item"}
                loading={deleteLoading}
            />
        </CustomModal>
    );
}
