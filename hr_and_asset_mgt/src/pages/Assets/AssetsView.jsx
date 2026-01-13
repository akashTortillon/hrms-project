import React, { useEffect, useState } from "react";
import AssetsHeader from "./AssetsHeader";
import AssetsFilters from "./AssetsFilter";
import AssetsTable from "./AssetsTable";
import AssetActions from "./AssetActionCards";
import AddAssetModal from "./AddAssetModal";
import { getAssets, createAsset, updateAsset, deleteAsset } from "../../services/assetService.js";
import { toast } from "react-toastify";

function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState(null);

  useEffect(() => {
    fetchAssets();
  }, []);

  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await getAssets();
      const assetsArray = Array.isArray(response) ? response : [];

      // Format assets for display
      const formattedAssets = assetsArray.map((asset) => {
        // Map status to statusKey for CSS classes
        const statusKeyMap = {
          "Available": "available",
          "In Use": "in-use",
          "Under Maintenance": "maintenance"
        };

        // Format purchase date
        const purchaseDate = asset.purchaseDate
          ? new Date(asset.purchaseDate).toISOString().split("T")[0]
          : "";

        // Format purchase cost as AED currency
        const formattedPrice = `AED ${asset.purchaseCost?.toLocaleString("en-US") || 0}`;

        return {
          _id: asset._id,
          id: asset._id, // used by table key
          name: asset.name,
          code: asset.assetCode,
          category: asset.category,
          location: asset.location,
          subLocation: asset.subLocation || "",
          custodian: asset.custodian,
          department: asset.department || "",
          price: formattedPrice,
          purchaseDate: purchaseDate,
          status: asset.status,
          statusKey: statusKeyMap[asset.status] || "available",
          isDeleted: asset.isDeleted || false
        };
      });

      setAssets(formattedAssets);
    } catch (error) {
      console.error("Failed to fetch assets", error);
      toast.error("Failed to load assets");
      setAssets([]);
    } finally {
      setLoading(false);
    }
  };

  // Handle adding new asset
  const handleAddAsset = async (assetData) => {
    try {
      const response = await createAsset(assetData);
      const { message, asset: newAsset } = response;

      toast.success(message || "Asset added successfully 🎉");

      // Refresh assets list
      fetchAssets();

      setShowAddModal(false);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to add asset";
      toast.error(errorMessage);
    }
  };

  // Handle edit click
  const handleEditClick = (asset) => {
    setSelectedAsset(asset);
    setShowEditModal(true);
  };

  // Handle updating asset
  const handleUpdateAsset = async (assetData) => {
    try {
      const response = await updateAsset(assetData._id, assetData);
      const { message } = response;

      toast.success(message || "Asset updated successfully");

      // Refresh assets list
      fetchAssets();

      setShowEditModal(false);
      setSelectedAsset(null);
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to update asset";
      toast.error(errorMessage);
    }
  };

  // Handle delete asset
  const handleDeleteAsset = async (asset) => {
    const confirmDelete = window.confirm(
      `Do you want to delete this asset?`
    );

    if (!confirmDelete) return;

    try {
      await deleteAsset(asset._id || asset.id);

      toast.success("Asset deleted successfully");

      // Refresh assets list
      fetchAssets();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        error.message ||
        "Failed to delete asset";
      toast.error(errorMessage);
    }
  };

  return (
    <div>
      <AssetsHeader onAddAsset={() => setShowAddModal(true)} />
      <AssetsFilters />
      {loading ? (
        <div style={{ padding: "20px", textAlign: "center" }}>Loading assets...</div>
      ) : (
        <AssetsTable 
          assets={assets} 
          onEdit={handleEditClick}
          onDelete={handleDeleteAsset}
        />
      )}
      <AssetActions />

      {/* ADD MODAL */}
      {showAddModal && (
        <AddAssetModal
          onClose={() => setShowAddModal(false)}
          onAddAsset={handleAddAsset}
        />
      )}

      {/* EDIT MODAL */}
      {showEditModal && selectedAsset && (
        <AddAssetModal
          asset={selectedAsset}
          onClose={() => {
            setShowEditModal(false);
            setSelectedAsset(null);
          }}
          onUpdateAsset={handleUpdateAsset}
        />
      )}
    </div>
  );
}

export default Assets;