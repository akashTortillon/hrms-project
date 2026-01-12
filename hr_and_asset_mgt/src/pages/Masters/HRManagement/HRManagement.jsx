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
        setDeleteConfig
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
                        <CustomButton onClick={handleSave} disabled={loading}>
                            {loading ? "Saving..." : "Save"}
                        </CustomButton>
                    </>
                }
            >
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
            </CustomModal>

            {/* Delete Confirmation Modal */}
            <DeleteConfirmationModal
                show={deleteConfig.show}
                itemName={deleteConfig.name}
                onClose={() => setDeleteConfig({ ...deleteConfig, show: false })}
                onConfirm={confirmDelete}
                loading={loading}
            />

        </div>
    );
}
