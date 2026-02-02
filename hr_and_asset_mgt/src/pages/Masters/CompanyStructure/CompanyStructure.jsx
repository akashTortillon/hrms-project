import MastersCard from "../components/MastersCard.jsx"; // New Card Component
import CustomButton from "../../../components/reusable/Button.jsx";
import useCompanyStructure from "./useCompanyStructure.js"; // Import the custom hook
import "../../../style/Masters.css";
import { RenderList } from "../components/RenderList.jsx";
import { RenderRolesGrid } from "../components/RenderRolesGrid.jsx";
import CustomModal from "../../../components/reusable/CustomModal.jsx";
import DeleteConfirmationModal from "../../../components/reusable/DeleteConfirmationModal.jsx";

const PERMISSIONS_LIST = [
  "VIEW_DASHBOARD",
  "MANAGE_EMPLOYEES",
  "MANAGE_PAYROLL",
  "MANAGE_ASSETS",
  "MANAGE_DOCUMENTS",
  "MANAGE_MASTERS",
  "MANAGE_SETTINGS",
  "APPROVE_REQUESTS",
  "VIEW_REPORTS",
  "MANAGE_ONBOARDING",
  "MANAGE_OFFBOARDING"
];

export default function CompanyStructure() {
  const {
    departments,
    branches,
    designations,
    roles,
    selectedPermissions,
    setSelectedPermissions,
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
          Define departments, branches, organizational hierarchy, and roles
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
          <RenderRolesGrid
            items={roles}
            handleEdit={handleOpenEdit}
            handleDelete={handleDelete}
          />
        </MastersCard>
      </div>

      {/* Add Modal */}
      {/* Custom Modal */}
      <CustomModal
        show={showModal}
        title={inputValue ? `Edit ${modalType}` : `Add ${modalType}`}
        titleContent={inputValue ? `Edit ${modalType}` : `Add ${modalType}`}
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
        <div className="form-group flex flex-col gap-4">
          <div>
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

          {modalType === "Role" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Permissions</label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '8px',
                maxHeight: '240px',
                overflowY: 'auto',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                padding: '12px'
              }}>
                {PERMISSIONS_LIST.map((perm) => (
                  <label key={perm} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', color: '#374151' }}>
                    <input
                      type="checkbox"
                      checked={selectedPermissions.includes(perm)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedPermissions([...selectedPermissions, perm]);
                        } else {
                          setSelectedPermissions(selectedPermissions.filter((p) => p !== perm));
                        }
                      }}
                      style={{ width: '16px', height: '16px', borderRadius: '4px', cursor: 'pointer' }}
                    />
                    <span>{perm.replace(/_/g, " ")}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
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
