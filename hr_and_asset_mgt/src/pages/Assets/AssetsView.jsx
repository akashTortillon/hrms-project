import React, { useEffect, useState } from "react";
import AssetsHeader from "./AssetsHeader";
import AssetsFilters from "./AssetsFilter";
import AssetsTable from "./AssetsTable";
import AssetActions from "./AssetActionCards";
import AddAssetModal from "./AddAssetModal";
import { getAssets, createAsset } from "../../services/assetService.js";
import { toast } from "react-toastify";

function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);

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
          statusKey: statusKeyMap[asset.status] || "available"
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

  return (
    <div>
      <AssetsHeader onAddAsset={() => setShowAddModal(true)} />
      <AssetsFilters />
      {loading ? (
        <div style={{ padding: "20px", textAlign: "center" }}>Loading assets...</div>
      ) : (
        <AssetsTable assets={assets} />
      )}
      <AssetActions />

      {/* ADD MODAL */}
      {showAddModal && (
        <AddAssetModal
          onClose={() => setShowAddModal(false)}
          onAddAsset={handleAddAsset}
        />
      )}
    </div>
  );
}

export default Assets;