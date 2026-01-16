


import React, { useEffect, useState, useMemo } from "react";
import AssetsHeader from "./AssetsHeader";
import AssetsFilters from "./AssetsFilter";
import AssetsTable from "./AssetsTable";
import AssetActions from "./AssetActionCards";
import AddAssetModal from "./AddAssetModal";
import AssignAssetModal from "./AssignAssetModal";
import TransferAssetModal from "./TransferAssetModal";
import ReturnAssetModal from "./ReturnAssetModal";
import AssetHistoryModal from "./AssetHistoryModal";
import WarrantyAmcTrackerCard from "./WarrantyAmcTrackerCard.jsx";
import { toast } from "react-toastify";

import {
  getAssets,
  createAsset,
  updateAsset,
  deleteAsset,
} from "../../services/assetService.js";

import {
  assignAssetToEmployee,
  transferAsset,
  returnAssetToStore,
} from "../../services/assignmentService.js";

import { assetTypeService, assetStatusService } from "../../services/masterService";

function Assets() {
  // Asset data
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);

  // Selected asset for modal actions
  const [selectedAsset, setSelectedAsset] = useState(null);

  // Masters for dynamic filters
  const [assetTypes, setAssetTypes] = useState([]);
  const [assetStatuses, setAssetStatuses] = useState([]);

  // Filters
  const [search, setSearch] = useState("");
  const [type, setType] = useState("ALL");
  const [status, setStatus] = useState("ALL");

  // Fetch assets
  const fetchAssets = async () => {
    try {
      setLoading(true);
      const response = await getAssets();
      const assetsArray = Array.isArray(response) ? response : [];

      // Format assets
      const formattedAssets = assetsArray.map((asset) => {
        const statusKeyMap = {
          "Available": "available",
          "In Use": "in-use",
          "Under Maintenance": "maintenance",
        };

        return {
          ...asset,
          id: asset._id,
          code: asset.assetCode,
           type: asset.type || asset.category || "N/A",
          statusKey: statusKeyMap[asset.status] || "available",
          purchaseDate: asset.purchaseDate
            ? new Date(asset.purchaseDate).toISOString().split("T")[0]
            : "",
          price: `AED ${asset.purchaseCost?.toLocaleString("en-US") || 0}`,
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

  // Load masters
  useEffect(() => {
    const loadMasters = async () => {
      try {
        const [typesRes, statusRes] = await Promise.all([
          assetTypeService.getAll(),
          assetStatusService.getAll(),
        ]);

        setAssetTypes(typesRes || []);
        setAssetStatuses(statusRes || []);
      } catch (err) {
        console.error("Failed to load asset masters", err);
      }
    };
    loadMasters();
  }, []);

  useEffect(() => {
    fetchAssets();
  }, []);

  // Filtered assets
  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        !search ||
        asset.name?.toLowerCase().includes(search.toLowerCase()) ||
        asset.assetCode?.toLowerCase().includes(search.toLowerCase());

      const matchesType = type === "ALL" || asset.type === type;
      const matchesStatus = status === "ALL" || asset.status === status;

      return matchesSearch && matchesType && matchesStatus;
    });
  }, [assets, search, type, status]);

  // Asset stats
  // const assetStats = useMemo(() => {
  //   const activeAssets = assets.filter((a) => !a.isDeleted);
  //   return {
  //     total: activeAssets.length,
  //     inUse: activeAssets.filter((a) => a.status === "In Use").length,
  //     available: activeAssets.filter((a) => a.status === "Available").length,
  //     maintenance: activeAssets.filter(
  //       (a) => a.status === "Under Maintenance"
  //     ).length,
  //   };
  // }, [assets]);

  const assetStats = useMemo(() => {
  const nonDeletedAssets = assets.filter((a) => !a.isDeleted);

  return {
    //  TOTAL = everything from DB
    total: assets.length,

    // ✅ Operational stats = only non-deleted
    inUse: nonDeletedAssets.filter((a) => a.status === "In Use").length,
    available: nonDeletedAssets.filter((a) => a.status === "Available").length,
    maintenance: nonDeletedAssets.filter(
      (a) => a.status === "Under Maintenance"
    ).length,
  };
}, [assets]);

  // Add asset
  const handleAddAsset = async (assetData) => {
    try {
      const response = await createAsset(assetData);
      toast.success(response.message || "Asset added successfully");
      setShowAddModal(false);
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to add asset");
    }
  };

  // Edit asset
  const handleEditClick = (asset) => {
    setSelectedAsset(asset);
    setShowEditModal(true);
  };

  const handleUpdateAsset = async (assetData) => {
    try {
      const response = await updateAsset(assetData._id, assetData);
      toast.success(response.message || "Asset updated successfully");
      setShowEditModal(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to update asset");
    }
  };

  // Delete asset
  const handleDeleteAsset = async (asset) => {
    if (!window.confirm("Do you want to delete this asset?")) return;
    try {
      await deleteAsset(asset._id);
      toast.success("Asset deleted successfully");
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to delete asset");
    }
  };

  // Assign asset
  const handleAssignClick = (asset) => {
    setSelectedAsset(asset);
    setShowAssignModal(true);
  };
  const handleAssignAsset = async (data) => {
    try {
      const response = await assignAssetToEmployee(data);
      toast.success(response.message || "Asset assigned successfully");
      setShowAssignModal(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to assign asset");
    }
  };

  // Transfer asset
  const handleTransferClick = (asset) => {
    setSelectedAsset(asset);
    setShowTransferModal(true);
  };
  const handleTransferAsset = async (data) => {
    try {
      const response = await transferAsset(data);
      toast.success(response.message || "Asset transferred successfully");
      setShowTransferModal(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to transfer asset");
    }
  };

  // Return asset
  const handleReturnClick = (asset) => {
    setSelectedAsset(asset);
    setShowReturnModal(true);
  };
  const handleReturnAsset = async (data) => {
    try {
      const response = await returnAssetToStore(data);
      toast.success(response.message || "Asset returned successfully");
      setShowReturnModal(false);
      setSelectedAsset(null);
      fetchAssets();
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Failed to return asset");
    }
  };

  // View history
  const handleHistoryClick = (asset) => {
    setSelectedAsset(asset);
    setShowHistoryModal(true);
  };

  return (
    <div>
      {/* Header cards */}
      <AssetsHeader
        onAddAsset={() => setShowAddModal(true)}
        stats={[
          { title: "Total Assets", value: assetStats.total, icon: "cube", iconColor: "#2563eb" },
          { title: "In Use", value: assetStats.inUse, icon: "cube", iconColor: "#16a34a" },
          { title: "Available", value: assetStats.available, icon: "cube", iconColor: "#f59e0b" },
          { title: "Maintenance", value: assetStats.maintenance, icon: "spanner", iconColor: "#dc2626" },
        ]}
      />

      {/* Filters */}
      <AssetsFilters
        search={search}
        setSearch={setSearch}
        type={type}
        setType={setType}
        status={status}
        setStatus={setStatus}
        assetTypes={assetTypes}
        assetStatuses={assetStatuses}
        total={filteredAssets.length}
      />

      {/* Table */}
      {loading ? (
        <div style={{ padding: "20px", textAlign: "center" }}>Loading assets...</div>
      ) : (
        <AssetsTable
          assets={filteredAssets}
          onEdit={handleEditClick}
          onDelete={handleDeleteAsset}
          onAssign={handleAssignClick}
          onTransfer={handleTransferClick}
          onReturn={handleReturnClick}
          onHistory={handleHistoryClick}
        />
      )}

      {/* Warranty Card */}
      <WarrantyAmcTrackerCard
        assets={assets}
        onViewAll={() => console.log("View all warranty details")}
      />

      {/* Modals */}
      {showAddModal && <AddAssetModal onClose={() => setShowAddModal(false)} onAddAsset={handleAddAsset} />}

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

      {showAssignModal && selectedAsset && (
        <AssignAssetModal
          asset={selectedAsset}
          onClose={() => {
            setShowAssignModal(false);
            setSelectedAsset(null);
          }}
          onAssign={handleAssignAsset}
        />
      )}

      {showTransferModal && selectedAsset && (
        <TransferAssetModal
          asset={selectedAsset}
          onClose={() => {
            setShowTransferModal(false);
            setSelectedAsset(null);
          }}
          onTransfer={handleTransferAsset}
        />
      )}

      {showReturnModal && selectedAsset && (
        <ReturnAssetModal
          asset={selectedAsset}
          onClose={() => {
            setShowReturnModal(false);
            setSelectedAsset(null);
          }}
          onReturn={handleReturnAsset}
        />
      )}

      {showHistoryModal && selectedAsset && (
        <AssetHistoryModal
          asset={selectedAsset}
          onClose={() => {
            setShowHistoryModal(false);
            setSelectedAsset(null);
          }}
        />
      )}
    </div>
  );
}

export default Assets;
