import React, { useState, useEffect } from 'react';
import CustomModal from "../../components/reusable/CustomModal.jsx";
import { toast } from 'react-toastify';
import { payrollService } from "../../services/payrollService";

export default function AdjustmentModal({ show, onClose, employees = [], onSuccess, initialRecord }) {
    const [formData, setFormData] = useState({
        payrollId: '',
        type: 'ALLOWANCE',
        name: '',
        amount: ''
    });

    useEffect(() => {
        if (show) {
            if (initialRecord) {
                setFormData(prev => ({ ...prev, payrollId: initialRecord._id }));
            } else {
                setFormData(prev => ({ ...prev, payrollId: '' }));
            }
        }
    }, [show, initialRecord]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async () => {
        if (!formData.payrollId || !formData.name || !formData.amount) {
            toast.error("Please fill all fields");
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

    return (
        <CustomModal show={show} onClose={onClose} title="Add Manual Adjustment" width="500px">
            <div style={{ padding: '0 8px' }}>

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

                {/* Actions */}
                <div className="modal-actions">
                    <button onClick={onClose} className="btn btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} className="btn btn-primary">Save Adjustment</button>
                </div>

            </div>
        </CustomModal>
    );
}
