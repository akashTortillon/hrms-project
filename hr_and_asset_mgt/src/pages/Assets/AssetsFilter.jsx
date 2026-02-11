


import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Assets.css";
import { exportAssets } from "../../services/assetService.js";
import { toast } from "react-toastify";
import CustomSelect from "../../components/reusable/CustomSelect";

const AssetsFilters = ({
  search,
  setSearch,
  type,
  setType,
  status,
  setStatus,
  assetTypes = [],
  assetStatuses = [],
  total = 0,
}) => {
  // Export assets using current filter values
  const handleExportAssets = async () => {
    try {
      const filters = Object.fromEntries(
        Object.entries({
          type: type !== "ALL" ? type : undefined,
          status: status !== "ALL" ? status : undefined,
          search: search || undefined,
        }).filter(([_, value]) => value) // Remove empty values
      );

      const blob = await exportAssets(filters);

      // Download the file
      const downloadLink = document.createElement("a");
      downloadLink.href = window.URL.createObjectURL(blob);
      downloadLink.download = `Assets_${new Date().toISOString().split("T")[0]}.xlsx`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
      window.URL.revokeObjectURL(downloadLink.href);

      toast.success("Assets exported successfully!");
    } catch (error) {
      console.error("Export error:", error);
      toast.error("Failed to export assets");
    }
  };

  return (
  <div className="assets-filters-card">
  <div className="assets-filters attendance-style">

    {/* Search */}
    <div className="assets-search">
      <SvgIcon name="search" size={18} />
      <input
        type="text"
        placeholder="Search assets by name or ID..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    {/* Asset Type */}
    <div className="filter-group">
      <label className="filter-label">Asset Type</label>
      <CustomSelect
        name="assetType"
        value={type}
        onChange={(val) => setType(val)}
        options={[
          { value: "ALL", label: "All Types" },
          ...assetTypes.map(t => ({
            value: t.name,
            label: t.name
          }))
        ]}
      />
    </div>

    {/* Asset Status */}
    <div className="filter-group">
      <label className="filter-label">Status</label>
      <CustomSelect
        name="assetStatus"
        value={status}
        onChange={(val) => setStatus(val)}
        options={[
          { value: "ALL", label: "All Status" },
          ...assetStatuses.map(s => ({
            value: s.name,
            label: s.name
          }))
        ]}
      />
    </div>

    


    <div className="assets-count">
    Showing {total} of {total} assets
  </div>


  {/* Export */}
    <div className="assets-export-wrapper">
      <button className="assets-export-btn" onClick={handleExportAssets}>
        <SvgIcon name="download" size={16} />
        Export Assets
      </button>
    </div>
  </div>

  
</div>

  );
};

export default AssetsFilters;
