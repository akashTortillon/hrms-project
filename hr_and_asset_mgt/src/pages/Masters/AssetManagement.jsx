import MastersCard from "./components/MastersCard.jsx";
import CustomButton from "../../components/reusable/Button";
import { RenderList } from "./components/RenderList.jsx";
import { RenderVendorList } from "./components/RenderVendorList.jsx";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import DeleteConfirmationModal from "../../components/reusable/DeleteConfirmationModal.jsx";
import useAssetManagement from "./AssetManagement/useAssetManagement.js";
import "../../style/Masters.css";

export default function AssetManagement() {
  const {
    assetTypes,
    assetCategories,
    assetStatuses,
    vendors,
    serviceTypes,
    showModal,
    setShowModal,
    modalType,
    inputValue,
    setInputValue,
    inputDesc,
    setInputDesc,
    loading,
    handleOpenAdd,
    handleOpenEdit,
    handleSave,
    handleDelete,
    confirmDelete,
    deleteConfig,
    setDeleteConfig
  } = useAssetManagement();

  return (
    <div className="asset-management">

      {/* Header */}
      <div className="masters-header">
        <h3>Asset Management Masters</h3>
        <p>
          Define asset types, categories, and maintenance providers
        </p>
      </div>

      {/* Asset Definition Sections */}
      <div className="masters-grid">

        {/* Asset Types */}
        <MastersCard
          title="Asset Types"
          onAdd={() => handleOpenAdd("Asset Type")}
        >
          <RenderList
            items={assetTypes}
            type="Asset Type"
            handleDelete={handleDelete}
            handleEdit={handleOpenEdit}
          />
        </MastersCard>

        {/* Asset Categories */}
        <MastersCard
          title="Asset Categories"
          onAdd={() => handleOpenAdd("Asset Category")}
        >
          <RenderList
            items={assetCategories}
            type="Asset Category"
            handleDelete={handleDelete}
            handleEdit={handleOpenEdit}
          />
        </MastersCard>

      </div>

      <div className="masters-grid mt-6">
        {/* Status Labels */}
        <MastersCard
          title="Status Labels"
          onAdd={() => handleOpenAdd("Status Label")}
        >
          <RenderList
            items={assetStatuses}
            type="Status Label"
            handleDelete={handleDelete}
            handleEdit={handleOpenEdit}
          />
        </MastersCard>
      </div>

      {/* Vendors & Service Providers */}
      <div className="mt-4">
        <MastersCard
          title="Vendors & Service Providers"
          description="Manage suppliers and maintenance providers"
          headerAction={
            <CustomButton onClick={() => handleOpenAdd("Vendor")}>
              + Add Vendor
            </CustomButton>
          }
        >
          <RenderVendorList
            items={vendors}
            handleDelete={handleDelete}
            handleEdit={handleOpenEdit}
          />
        </MastersCard>
      </div>

      {/* Service Types */}
      <div className="mt-4">
        <MastersCard
          title="Service Types"
          onAdd={() => handleOpenAdd("Service Type")}
        >
          <RenderList
            items={serviceTypes}
            type="Service Type"
            handleDelete={handleDelete}
            handleEdit={handleOpenEdit}
          />
        </MastersCard>
      </div>

      {/* Add/Edit Modal */}
      <CustomModal
        show={showModal}
        title={`${inputValue ? "Edit" : "Add"} ${modalType}`}
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

          {/* Show Description field only for Vendor */}
          {modalType === "Vendor" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Description / Services</label>
              <textarea
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="E.g. IT Equipment Supplier"
                value={inputDesc}
                onChange={(e) => setInputDesc(e.target.value)}
                rows={3}
              />
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
