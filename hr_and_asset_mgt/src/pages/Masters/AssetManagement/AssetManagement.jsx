import MastersCard from "../components/MastersCard.jsx";
import CustomButton from "../../../components/reusable/Button.jsx";
import { RenderList } from "../components/RenderList.jsx";
import { RenderVendorList } from "../components/RenderVendorList.jsx";
import CustomModal from "../../../components/reusable/CustomModal.jsx";
import DeleteConfirmationModal from "../../../components/reusable/DeleteConfirmationModal.jsx";
import useAssetManagement from "./useAssetManagement.js";
import "../../../style/Masters.css";

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
    selectedAssetType,
    setSelectedAssetType,
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
            <button className="masters-add-btn" onClick={() => handleOpenAdd("Vendor")}>
              + Add Vendor
            </button>
          }
        >
          <RenderVendorList
            items={vendors}
            assetTypes={assetTypes} // Pass fetched Asset Types for lookup
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
            <button className="modal-btn modal-btn-secondary" onClick={() => setShowModal(false)}>
              Cancel
            </button>
            <button className="modal-btn modal-btn-primary" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save"}
            </button>
          </>
        }
      >
        <div className="form-group flex flex-col gap-4">
          <div>
            <label className="modal-form-label">{modalType} Name</label>
            <input
              type="text"
              className="modal-form-input"
              placeholder={`Enter ${modalType} Name`}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              autoFocus
            />
          </div>


          {/* Show Asset Type dropdown only for Vendor */}
          {modalType === "Vendor" && (
            <div>
              <label className="modal-form-label">Related Asset Type</label>
              <select
                className="modal-form-input"
                value={selectedAssetType}
                onChange={(e) => setSelectedAssetType(e.target.value)}
              >
                <option value="">-- Select Asset Type --</option>
                {assetTypes.map((type) => (
                  <option key={type._id} value={type._id}>
                    {type.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Show Description field only for Vendor */}
          {modalType === "Vendor" && (
            <div>
              <label className="modal-form-label">Description / Services</label>
              <textarea
                className="modal-form-input"
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
