


import DataTable from "../../components/reusable/DataTable";
import SvgIcon from "../../components/svgIcon/svgView";
import "../../style/Assets.css";
import React from "react";

const AssetsTable = ({
  assets,
  onEdit,
  onDelete,
  onAssign,
  onTransfer,
  onReturn,
  onHistory,
  onViewDetails,
  onScheduleMaintenance,
  onViewMaintenanceLogs,
  onManageDocuments,
  onManageAMC,
  onDispose
}) => {
  const columns = [
    {
      key: "asset",
      header: "ASSET DETAILS",
      width: "20%",
      render: (row) => (
        <div className="asset-cell">
          <div className="asset-icon">
            <SvgIcon name="cube" size={18} />
          </div>
          <div>
            <div className="asset-name">{row.name}</div>
            <div className="asset-sub">
              {row.code} · {row.category}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: "location",
      header: "LOCATION",
      width: "12%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">{row.location}</div>
          {row.subLocation && (
            <div className="cell-secondary">{row.subLocation}</div>
          )}
        </div>
      ),
    },
    // {
    //   key: "custodian",
    //   header: "CUSTODIAN",
    //   width: "14%",
    //   render: (row) => (
    //     <div className="cell-stack">
    //       <div className="cell-primary">
    //         {row.custodianName || row.custodian || "Unassigned"}
    //       </div>
    //       {row.department && (
    //         <div className="cell-secondary">{row.department}</div>
    //       )}
    //     </div>
    //   ),
    // }



    {
      key: "custodian",
      header: "CUSTODIAN",
      width: "14%",
      render: (row) => {
        const custodian = row.custodian;

        let primaryText = "Unassigned";


        let secondaryText = null;

        if (custodian?.type === "EMPLOYEE") {
          primaryText = custodian.employee?.name || row.custodianName || "Employee";
          secondaryText = custodian.employee?.code || row.employeeCode || null;
        }

        if (custodian?.type === "DEPARTMENT") {
          primaryText = custodian.department;
          secondaryText = "Department";
        }

        return (
          <div className="cell-stack">
            <div className="cell-primary">{primaryText}</div>
            {secondaryText && (
              <div className="cell-secondary">{secondaryText}</div>
            )}
          </div>
        );
      },
    }



    ,
    {
      key: "purchase",
      header: "PURCHASE INFO",
      width: "12%",
      render: (row) => (
        <div className="cell-stack">
          <div className="cell-primary">{row.price}</div>
          <div className="cell-secondary">{row.purchaseDate}</div>
        </div>
      ),
    },
    {
      key: "status",
      header: "STATUS",
      width: "10%",
      render: (row) => (
        <span className={`status-pill status-${row.statusKey}`}>
          {row.status}
        </span>
      ),
    },
    {
      key: "actions",
      header: "ACTIONS",
      width: "32%",
      render: (row) => {
        const isDeleted = row.isDeleted === true || row.status === "Disposed";

        return (
          <div style={{ display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" }}>
            {/* ✅ View Details - Always visible */}
            <button
              type="button"
              className="icon-btn"
              onClick={() => onViewDetails && onViewDetails(row)}
              title="View Details"
              style={{ background: "#3b82f6", color: "white" }}
            >
              <SvgIcon name="eye" size={16} />
            </button>

            {/* ✅ History - Always visible */}
            <button
              type="button"
              className="icon-btn history-btn"
              onClick={() => onHistory && onHistory(row)}
              title="View History"
              style={{ background: "#f59e0b", color: "white" }}
            >
              <SvgIcon name="history" size={16} />
            </button>

            {!isDeleted && (
              <>
                {/* Status-based primary actions */}
                {row.status === "Available" && (
                  <button
                    type="button"
                    className="action-link"
                    onClick={() => onAssign && onAssign(row)}
                    title="Assign Asset"
                    style={{ fontSize: "12px", padding: "4px 8px" }}
                  >
                    Assign
                  </button>
                )}

                {row.status === "In Use" && (
                  <>
                    <button
                      type="button"
                      className="action-link"
                      onClick={() => onTransfer && onTransfer(row)}
                      title="Transfer Asset"
                      style={{ fontSize: "12px", padding: "4px 8px" }}
                    >
                      Transfer
                    </button>
                    <button
                      type="button"
                      className="action-link"
                      onClick={() => onScheduleMaintenance && onScheduleMaintenance(row)}
                      title="Schedule Maintenance"
                      style={{ fontSize: "12px", padding: "4px 8px", color: "#8b5cf6" }}
                    >
                      Maintain
                    </button>
                  </>
                )}

                {row.status === "Under Maintenance" && (
                  <button
                    type="button"
                    className="action-link"
                    onClick={() => onReturn && onReturn(row)}
                    title="Return Asset"
                    style={{ fontSize: "12px", padding: "4px 8px", color: "#16a34a" }}
                  >
                    Return
                  </button>
                )}

                {/* Secondary actions - dropdown style */}
                <div className="actions-dropdown" style={{ position: "relative" }}>
                  <button
                    type="button"
                    className="icon-btn"
                    title="More Actions"
                    style={{ background: "#64748b", color: "white" }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const menu = e.currentTarget.nextElementSibling;
                      if (menu) {
                        menu.style.display = menu.style.display === "block" ? "none" : "block";
                      }
                    }}
                  >
                    <SvgIcon name="ellipsis-vertical" size={16} />
                  </button>

                  <div
                    className="dropdown-menu"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        onEdit && onEdit(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                    >
                      <SvgIcon name="edit" size={14} />
                      Edit Asset
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        onViewMaintenanceLogs && onViewMaintenanceLogs(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                    >
                      <SvgIcon name="spanner" size={14} />
                      Maintenance Logs
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        onManageDocuments && onManageDocuments(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                    >
                      <SvgIcon name="document" size={14} />
                      Documents
                    </button>

                    <button
                      className="dropdown-item"
                      onClick={() => {
                        onManageAMC && onManageAMC(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                    >
                      <SvgIcon name="document (1)" size={14} />
                      AMC Details
                    </button>

                    <div style={{ borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />

                    <button
                      className="dropdown-item danger"
                      onClick={() => {
                        onDispose && onDispose(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                    >
                      <SvgIcon name="waste-disposal" size={14} />
                      Dispose Asset
                    </button>

                    <button
                      className="dropdown-item danger"
                      onClick={() => {
                        onDelete && onDelete(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                    >
                      <SvgIcon name="delete" size={14} />
                      Delete Asset
                    </button>
                  </div>
                </div>
              </>
            )}

            {isDeleted && (
              <span className="status-pill status-deleted">Deleted</span>
            )}
          </div>
        );
      },
    },
  ];

  // Close all dropdowns when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e) => {
      if (!e.target.closest('.actions-dropdown')) {
        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
      }
    };
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <DataTable
      columns={columns}
      data={assets}
      rowKey="id"
      className="assets-table"
    />
  );
};

export default AssetsTable;