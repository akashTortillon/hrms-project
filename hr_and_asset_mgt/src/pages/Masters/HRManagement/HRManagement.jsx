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
        setShiftState,
        workflowState,
        setWorkflowState,
        tempStepName,
        setTempStepName
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
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="modal-form-label">Max Days / Year</label>
                                        <input
                                            type="number"
                                            className="modal-form-input"
                                            placeholder="e.g. 30"
                                            value={payrollState.days}
                                            onChange={(e) => setPayrollState({ ...payrollState, days: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="modal-form-label">Carry Forward Limit</label>
                                        <input
                                            type="number"
                                            className="modal-form-input"
                                            placeholder="e.g. 15"
                                            value={payrollState.carryForwardLimit || ""}
                                            onChange={(e) => setPayrollState({ ...payrollState, carryForwardLimit: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="modal-form-label">Accrual Rate</label>
                                        <input
                                            type="number"
                                            className="modal-form-input"
                                            placeholder="e.g. 2.5"
                                            value={payrollState.accrualRate || ""}
                                            onChange={(e) => setPayrollState({ ...payrollState, accrualRate: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="modal-form-label">Accrual Frequency</label>
                                        <select
                                            className="modal-form-input"
                                            value={payrollState.accrualFrequency || "MONTHLY"}
                                            onChange={(e) => setPayrollState({ ...payrollState, accrualFrequency: e.target.value })}
                                        >
                                            <option value="MONTHLY">Monthly</option>
                                            <option value="YEARLY">Yearly</option>
                                            <option value="CONTRACT_END">End of Contract</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group flex items-center gap-2 mt-2">
                                    <input
                                        type="checkbox"
                                        id="isPaid"
                                        checked={payrollState.isPaid ?? true}
                                        onChange={(e) => setPayrollState({ ...payrollState, isPaid: e.target.checked })}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isPaid" className="text-sm font-medium text-gray-700">Paid Leave</label>
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
                                        placeholder="e.g. HRA / Transport / LOP"
                                        value={payrollState.ruleName}
                                        onChange={(e) => setPayrollState({ ...payrollState, ruleName: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="modal-form-label">Category</label>
                                        <select
                                            className="modal-form-input"
                                            value={payrollState.category || "ALLOWANCE"}
                                            onChange={(e) => setPayrollState({ ...payrollState, category: e.target.value })}
                                        >
                                            <option value="ALLOWANCE">Allowance</option>
                                            <option value="DEDUCTION">Deduction</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="modal-form-label">Trigger Basis</label>
                                        <select
                                            className="modal-form-input"
                                            value={payrollState.basis || ""}
                                            onChange={(e) => setPayrollState({ ...payrollState, basis: e.target.value })}
                                        >
                                            <option value="">None (Fixed / Flat)</option>
                                            <option value="LATE_COUNT">Late Count (Any)</option>
                                            <option value="LATE_TIER_1_COUNT">Late Tier 1 Count</option>
                                            <option value="LATE_TIER_2_COUNT">Late Tier 2 Count</option>
                                            <option value="LATE_TIER_3_COUNT">Late Tier 3 Count</option>
                                            <option value="OVERTIME_HOURS">Overtime Hours</option>
                                            <option value="ABSENT_DAYS">Absent Days</option>
                                        </select>
                                    </div>
                                    <div className="form-group">
                                        <label className="modal-form-label">Calculation Type</label>
                                        <select
                                            className="modal-form-input"
                                            value={payrollState.calculationType || "FIXED"}
                                            onChange={(e) => setPayrollState({ ...payrollState, calculationType: e.target.value })}
                                        >
                                            <option value="FIXED">Fixed Amount</option>
                                            <option value="PERCENTAGE">Percentage (%)</option>
                                            <option value="DAILY_RATE">Daily Rate (x Days)</option>
                                            <option value="HOURLY_RATE">Hourly (x Multiplier)</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div className="form-group">
                                        <label className="modal-form-label">Value</label>
                                        <input
                                            type="number"
                                            className="modal-form-input"
                                            placeholder="Amount or %"
                                            value={payrollState.value || ""}
                                            onChange={(e) => setPayrollState({ ...payrollState, value: e.target.value })}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label className="modal-form-label">Base (if %)</label>
                                        <select
                                            className="modal-form-input"
                                            value={payrollState.base || "BASIC_SALARY"}
                                            onChange={(e) => setPayrollState({ ...payrollState, base: e.target.value })}
                                            disabled={payrollState.calculationType === "FIXED"}
                                        >
                                            <option value="BASIC_SALARY">Basic Salary</option>
                                            <option value="GROSS_SALARY">Gross Salary</option>
                                            <option value="HOURLY_RATE">Hourly Rate</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="form-group flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="isAutomatic"
                                        checked={payrollState.isAutomatic}
                                        onChange={(e) => setPayrollState({ ...payrollState, isAutomatic: e.target.checked })}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label htmlFor="isAutomatic" className="text-sm font-medium text-gray-700">Apply Automatically to All Employees</label>
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
                            <label className="modal-form-label">Standard Work Hours</label>
                            <input
                                type="number"
                                className="modal-form-input"
                                placeholder="e.g. 9"
                                value={shiftState.workHours}
                                onChange={(e) => setShiftState({ ...shiftState, workHours: e.target.value })}
                            />
                            <p className="text-xs text-gray-500 mt-1">Defines the base hours for Hourly Rate & Overtime calculation (Default: 9)</p>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <div className="form-group">
                                <label className="modal-form-label">Buffer 1 (Late)</label>
                                <input
                                    type="time"
                                    className="modal-form-input"
                                    value={shiftState.buffer1}
                                    onChange={(e) => setShiftState({ ...shiftState, buffer1: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="modal-form-label">Buffer 2 (Late)</label>
                                <input
                                    type="time"
                                    className="modal-form-input"
                                    value={shiftState.buffer2}
                                    onChange={(e) => setShiftState({ ...shiftState, buffer2: e.target.value })}
                                />
                            </div>
                            <div className="form-group">
                                <label className="modal-form-label">Buffer 3 (Late)</label>
                                <input
                                    type="time"
                                    className="modal-form-input"
                                    value={shiftState.buffer3}
                                    onChange={(e) => setShiftState({ ...shiftState, buffer3: e.target.value })}
                                />
                            </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Define late tiers. E.g. Check-in after Buffer 1 = Tier 1, after Buffer 2 = Tier 2...</p>
                    </div>
                ) : modalType === "Workflow Template" ? (
                    <div className="space-y-4">
                        <div className="form-group">
                            <label className="modal-form-label">Template Name</label>
                            <input
                                type="text"
                                className="modal-form-input"
                                placeholder="e.g. Onboarding, Offboarding"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                            />
                        </div>

                        <div className="form-group">
                            <label className="modal-form-label mb-2 block">Checklist Steps</label>
                            <div className="flex gap-2 mb-3">
                                <input
                                    type="text"
                                    className="modal-form-input"
                                    placeholder="Enter step name (e.g. Join Form)"
                                    value={tempStepName}
                                    onChange={(e) => setTempStepName(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            if (tempStepName.trim()) {
                                                setWorkflowState({ ...workflowState, steps: [...workflowState.steps, { name: tempStepName.trim(), required: true, description: '' }] });
                                                setTempStepName("");
                                            }
                                        }
                                    }}
                                />
                                <button
                                    onClick={() => {
                                        if (tempStepName.trim()) {
                                            setWorkflowState({ ...workflowState, steps: [...workflowState.steps, { name: tempStepName.trim(), required: true, description: '' }] });
                                            setTempStepName("");
                                        }
                                    }}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 text-sm"
                                >
                                    Add
                                </button>
                            </div>

                            <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-100 p-2 rounded-md">
                                {workflowState.steps.map((step, index) => (
                                    <div key={index} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-200">
                                        <span className="text-sm text-gray-700 font-medium">{index + 1}. {step.name}</span>
                                        <button
                                            onClick={() => {
                                                const newSteps = [...workflowState.steps];
                                                newSteps.splice(index, 1);
                                                setWorkflowState({ ...workflowState, steps: newSteps });
                                            }}
                                            className="text-red-500 hover:text-red-700"
                                        >
                                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
                                        </button>
                                    </div>
                                ))}
                                {workflowState.steps.length === 0 && <p className="text-sm text-gray-400 text-center py-2">No steps added yet.</p>}
                            </div>
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
            </CustomModal>

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
