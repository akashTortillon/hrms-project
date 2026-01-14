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
        setPayrollState
    } = useHRManagement();

    return (
        <div className="hr-management">

            {/* Header */}
            <div className="masters-header">
                <h3 className="text-xl font-semibold text-gray-900 mb-1">HR Management Masters</h3>
                <p className="text-sm text-gray-500">Configure employee classification, policies, and compliance settings</p>
            </div>

            <div className="masters-grid">

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

                {/* Document Types */}
                <MastersCard
                    title="Document Types"
                    onAdd={() => handleOpenAdd("Document Type")}
                >
                    <RenderList items={documentTypes} type="Document Type" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
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
                title={`Add ${modalType}`}
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
                            <div className="grid grid-cols-2 gap-4">
                                <div
                                    onClick={() => setPayrollState({ ...payrollState, step: 'LEAVE_FORM', subType: 'LEAVE' })}
                                    className="cursor-pointer border-2 border-transparent hover:border-blue-500 bg-gray-50 hover:bg-white p-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    <h4 className="font-semibold text-gray-800">Leave Config</h4>
                                    <p className="text-xs text-gray-500 mt-1">Configure days and policies for leave types</p>
                                </div>
                                <div
                                    onClick={() => setPayrollState({ ...payrollState, step: 'PAYROLL_FORM', subType: 'PAYROLL' })}
                                    className="cursor-pointer border-2 border-transparent hover:border-blue-500 bg-gray-50 hover:bg-white p-6 rounded-xl text-center shadow-sm hover:shadow-md transition-all duration-200"
                                >
                                    <h4 className="font-semibold text-gray-800">Payroll Rule</h4>
                                    <p className="text-xs text-gray-500 mt-1">Set up payroll calculation rules</p>
                                </div>
                            </div>
                        )}

                        {/* Step 2: Leave Form */}
                        {payrollState.step === 'LEAVE_FORM' && (
                            <div className="space-y-4 animate-fadeIn">
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Select Leave Type</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        value={payrollState.leaveTypeId}
                                        onChange={(e) => setPayrollState({ ...payrollState, leaveTypeId: e.target.value })}
                                        disabled={!!useHRManagement.editId} // If editing, maybe lock type? Or allow change.
                                    >
                                        <option value="">-- Select Type --</option>
                                        {leaveTypes.map(lt => (
                                            <option key={lt._id} value={lt._id}>{lt.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Number of Days</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. 10"
                                        value={payrollState.days}
                                        onChange={(e) => setPayrollState({ ...payrollState, days: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Policy details..."
                                        rows="3"
                                        value={payrollState.description}
                                        onChange={(e) => setPayrollState({ ...payrollState, description: e.target.value })}
                                    />
                                </div>
                                <div className="text-right">
                                    <button
                                        onClick={() => setPayrollState({ ...payrollState, step: 'SELECTION', subType: '' })}
                                        className="text-xs text-blue-600 hover:underline"
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
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                                    <input
                                        type="text"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="e.g. Basic Salary Calculation"
                                        value={payrollState.ruleName}
                                        onChange={(e) => setPayrollState({ ...payrollState, ruleName: e.target.value })}
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Description / Formula</label>
                                    <textarea
                                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        placeholder="Describe the rule..."
                                        rows="3"
                                        value={payrollState.description}
                                        onChange={(e) => setPayrollState({ ...payrollState, description: e.target.value })}
                                    />
                                </div>
                                <div className="text-right">
                                    <button
                                        onClick={() => setPayrollState({ ...payrollState, step: 'SELECTION', subType: '' })}
                                        className="text-xs text-blue-600 hover:underline"
                                    >
                                        Back to Selection
                                    </button>
                                </div>
                            </div>
                        )}
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
