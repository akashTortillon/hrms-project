import MastersCard from "../components/MastersCard.jsx"; // New Card Component
import CustomButton from "../../../components/reusable/Button.jsx";
import useCompanyStructure from "./useCompanyStructure.js"; // Import the custom hook
import "../../../style/Masters.css";
import { RenderList } from "../components/RenderList.jsx";
import { RenderRolesGrid } from "../components/RenderRolesGrid.jsx";
import CustomModal from "../../../components/reusable/CustomModal.jsx";
import DeleteConfirmationModal from "../../../components/reusable/DeleteConfirmationModal.jsx";

export default function CompanyStructure() {
  const {
    departments,
    branches,
    designations,
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
  } = useCompanyStructure();

  return (
    <div className="company-structure">

      {/* Header */}
      <div className="company-structure-header">
        <h2 className="company-structure-title">Company Structure Masters</h2>
        <p className="company-structure-subtitle">
          Define departments, branches, and organizational hierarchy
        </p>
      </div>

      <div className="structure-grid">
        {/* Departments */}
        <MastersCard
          title="Departments"
          onAdd={() => handleOpenAdd("Department")}
        >
          <RenderList items={departments} type="Department" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
        </MastersCard>

        {/* Branches */}
        <MastersCard
          title="Branches"
          onAdd={() => handleOpenAdd("Branch")}
        >
          <RenderList items={branches} type="Branch" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
        </MastersCard>
      </div>

      {/* Designations (Full Width) */}
      <div className="mt-4">
        <MastersCard
          title="Designations"
          onAdd={() => handleOpenAdd("Designation")}
        >
          <RenderList items={designations} type="Designation" handleDelete={handleDelete} handleEdit={handleOpenEdit} />
        </MastersCard>
      </div>

      {/* User Roles & Permissions (Full Width) */}
      <div className="mt-4">
        <MastersCard
          title="User Roles & Permissions"
          description="Manage access control and permissions"
          headerAction={
            <CustomButton onClick={() => handleOpenAdd("Role")}>
              Configure Roles
            </CustomButton>
          }
        >
          <RenderRolesGrid />
        </MastersCard>
      </div>

      {/* Add Modal */}
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
