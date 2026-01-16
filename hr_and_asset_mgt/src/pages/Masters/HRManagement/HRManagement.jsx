import MastersCard from "../components/MastersCard.jsx"; // New Card Component
import CustomButton from "../../../components/reusable/Button.jsx";
import { RenderList } from "../components/RenderList.jsx";
import CustomModal from "../../../components/reusable/CustomModal.jsx";
import DeleteConfirmationModal from "../../../components/reusable/DeleteConfirmationModal.jsx";
import useHRManagement from "./useHRManagement.js";
import "../../../style/Masters.css";

export default function HRManagement() {
    const {
        employeeTypes,
        leaveTypes,
        documentTypes,
        companyDocumentTypes,
        nationalities,
        payrollRules,
        workflowTemplates,
        showModal,
        setShowModal,
        modalType,
        inputValue,
        setInputValue,
        loading,
        handleOpenAdd,
        handleOpenEdit,
        handleSave,
        handleDelete,
        confirmDelete,
        deleteConfig,
        setDeleteConfig,
        payrollState,
        setPayrollState,
        shifts,
        shiftState,
        setShiftState
    } = useHRManagement();

    return (
        <div className="hr-management">

            {/* Header */}
            <div className="masters-header">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">HR Management Masters</h3>
                <p className="text-sm text-gray-500">Configure employee classification, policies, and compliance settings</p>
            </div>

            <div className="masters-grid">
                {/* Shifts */}
                <MastersCard
                    title="Shifts"
                    onAdd={() => handleOpenAdd("Shift")}
                >
                    <RenderList items={shifts} type="Shift" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>

                {/* Employee Types */}
                <MastersCard
                    title="Employee Types"
                    onAdd={() => handleOpenAdd("Employee Type")}
                >
                    <RenderList items={employeeTypes} type="Employee Type" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>

                {/* Leave Types */}
                <MastersCard
                    title="Leave Types"
                    onAdd={() => handleOpenAdd("Leave Type")}
                >
                    <RenderList items={leaveTypes} type="Leave Type" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>

                {/* Employee Document Types */}
                <MastersCard
                    title="Employee Document Types"
                    onAdd={() => handleOpenAdd("Employee Document Type")}
                >
                    <RenderList items={documentTypes} type="Employee Document Type" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>

                {/* Company Document Types */}
                <MastersCard
                    title="Company Document Types"
                    onAdd={() => handleOpenAdd("Company Document Type")}
                >
                    <RenderList items={companyDocumentTypes} type="Company Document Type" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>

                {/* Nationalities */}
                <MastersCard
                    title="Nationalities"
                    onAdd={() => handleOpenAdd("Nationality")}
                >
                    <RenderList items={nationalities} type="Nationality" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>
            </div>

            <div className="masters-vertical-stack">
                {/* Payroll Rules */}
                <MastersCard
                    title="Leave & Payroll Rules"
                    description="Configure leave accrual and payroll components"
                    headerAction={
                        <CustomButton onClick={() => handleOpenAdd("Payroll Rule")}>
                            Configure Rules
                        </CustomButton>
                    }
                >
                    <RenderList items={payrollRules} type="Payroll Rule" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>

                {/* Workflow Templates */}
                <MastersCard
                    title="Workflow Templates"
                    onAdd={() => handleOpenAdd("Workflow Template")}
                    headerAction={
                        <button className="masters-add-btn" onClick={() => handleOpenAdd("Workflow Template")}>
                            + Add Template
                        </button>
                    }
                >
                    <RenderList items={workflowTemplates} type="Workflow Template" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
                </MastersCard>
            </div>

            {/* Custom Modal */}
            <CustomModal
                show={showModal}
                title={
                    modalType === "Payroll Rule"
                        ? (payrollState.step === 'LEAVE_FORM' ? "Add Leave Rules" : payrollState.step === 'PAYROLL_FORM' ? "Add Payroll Rules" : "Add Leave & Payroll Rules")
                        : `Add ${modalType}`
                }
                onClose={() => setShowModal(false)}
                footer={
                    <>
                        <CustomButton variant="secondary" onClick={() => setShowModal(false)} className="bg-gray-200 text-gray-700 hover:bg-gray-300">
                            Cancel
                        </CustomButton>
                        {/* Hide Save button during Selection Step for Payroll Rule */}
                        {!(modalType === "Payroll Rule" && payrollState.step === 'SELECTION') && (
                            <CustomButton onClick={handleSave} disabled={loading}>
                                {loading ? "Saving..." : "Save"}
                            </CustomButton>
                        )}
                    </>
                }
            >
                {modalType === "Payroll Rule" ? (
                    <div className="space-y-4">
                        {/* Step 1: Selection */}
                        {payrollState.step === 'SELECTION' && (
                            <div className="payroll-selection-container">
                                <div
                                    onClick={() => setPayrollState({ ...payrollState, step: 'LEAVE_FORM', subType: 'LEAVE' })}
                                    className="payroll-selection-card"
                                >
                                    <h4 className="payroll-selection-title">Leave Config</h4>
                                    <p className="payroll-selection-desc">Configure days and policies for leave types</p>
                                </div>
                                <div
                                    onClick={() => setPayrollState({ ...payrollState, step: 'PAYROLL_FORM', subType: 'PAYROLL' })}
                                    className="payroll-selection-card"
                                >
                                    <h4 className="payroll-selection-title">Payroll Rule</h4>
                                    <p className="payroll-selection-desc">Set up payroll calculation rules</p>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Leave Form */}
                        {payrollState.step === 'LEAVE_FORM' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="form-group">
                                    <label className="modal-form-label">Select Leave Type</label>
                                    <select
                                        className="modal-form-input"
                                        value={payrollState.leaveTypeId}
                                        onChange={(e) => setPayrollState({ ...payrollState, leaveTypeId: e.target.value })}
                                        disabled={!!useHRManagement.editId}
                                    >
                                        <option value="">-- Select Type --</option>
                                        {leaveTypes.map(lt => (
                                            <option key={lt._id} value={lt._id}>{lt.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="modal-form-label">Number of Days</label>
                                    <input
                                        type="number"
                                        className="modal-form-input"
                                        placeholder="e.g. 10"
                                        value={payrollState.days}
                                        onChange={(e) => setPayrollState({ ...payrollState, days: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="modal-form-label">Description</label>
                                    <textarea
                                        className="modal-form-input"
                                        placeholder="Policy details..."
                                        rows="3"
                                        value={payrollState.description}
                                        onChange={(e) => setPayrollState({ ...payrollState, description: e.target.value })}
                                    />
                                </div>
                                <div className="text-right">
                                    <button
                                        onClick={() => setPayrollState({ ...payrollState, step: 'SELECTION', subType: '' })}
                                        className="modal-back-btn"
                                    >
                                        Back to Selection
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Payroll Form */}
                        {payrollState.step === 'PAYROLL_FORM' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="form-group">
                                    <label className="modal-form-label">Rule Name</label>
                                    <input
                                        type="text"
                                        className="modal-form-input"
                                        placeholder="e.g. Basic Salary Calculation"
                                        value={payrollState.ruleName}
                                        onChange={(e) => setPayrollState({ ...payrollState, ruleName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="modal-form-label">Description / Formula</label>
                                    <textarea
                                        className="modal-form-input"
                                        placeholder="Describe the rule..."
                                        rows="3"
                                        value={payrollState.description}
                                        onChange={(e) => setPayrollState({ ...payrollState, description: e.target.value })}
                                    />
                                </div>
                                <div className="text-right">
                                    <button
                                        onClick={() => setPayrollState({ ...payrollState, step: 'SELECTION', subType: '' })}
                                        className="modal-back-btn"
                                    >
                                        Back to Selection
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                ) : modalType === "Shift" ? (
                    <div className="space-y-4">
                        <div className="form-group">
                            <label className="modal-form-label">Shift Name</label>
                            <input
                                type="text"
                                className="modal-form-input"
                                placeholder="e.g. Day Shift"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="form-group">
                                <label className="modal-form-label">Start Time</label>
                                <input
                                    type="time"
                                    className="modal-form-input"
                                    value={shiftState.startTime}
                                    onChange={(e) => setShiftState({ ...shiftState, startTime: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="modal-form-label">End Time</label>
                                <input
                                    type="time"
                                    className="modal-form-input"
                                    value={shiftState.endTime}
                                    onChange={(e) => setShiftState({ ...shiftState, endTime: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="modal-form-label">Late Mark After</label>
                            <input
                                type="time"
                                className="modal-form-input"
                                value={shiftState.lateLimit}
                                onChange={(e) => setShiftState({ ...shiftState, lateLimit: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Employee checked in after this time will be marked Late</p>
                        </div>
                    </div>
                ) : (
                    // Generic Form for other Masters
                    <div className="form-group">
                        <label className="block text-sm font-medium text-gray-700 mb-1">{modalType} Name</label>
                        <input
                            type="text"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder={`Enter ${modalType} Name`}
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            autoFocus
                        />
                    </div>
                )}
            </CustomModal >

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                show={deleteConfig.show}
                itemName={deleteConfig.name}
                onClose={() => setDeleteConfig({ ...deleteConfig, show: false })}
                onConfirm={confirmDelete}
                loading={loading}
            />

        </div >
    );
}
