// // import DataTable from "../../components/reusable/DataTable";
// // import SvgIcon from "../../components/svgIcon/svgView";
// // import "../../style/Assets.css";

// // const AssetsTable = ({ assets, onEdit, onDelete, onAssign, onTransfer, onReturn, onHistory }) => {
// //   const columns = [
// //     {
// //       key: "asset",
// //       header: "ASSET DETAILS",
// //       width: "26%",
// //       render: (row) => (
// //         <div className="asset-cell">
// //           <div className="asset-icon">
// //             <SvgIcon name="cube" size={18} />
// //           </div>
// //           <div>
// //             <div className="asset-name">{row.name}</div>
// //             <div className="asset-sub">
// //               {row.code} · {row.category}
// //             </div>
// //           </div>
// //         </div>
// //       ),
// //     },
// //     {
// //       key: "location",
// //       header: "LOCATION",
// //       width: "16%",
// //       render: (row) => (
// //         <div className="cell-stack">
// //           <div className="cell-primary">{row.location}</div>
// //           {row.subLocation && (
// //             <div className="cell-secondary">{row.subLocation}</div>
// //           )}
// //         </div>
// //       ),
// //     },
// //     {
// //       key: "custodian",
// //       header: "CUSTODIAN",
// //       width: "18%",
// //       render: (row) => (
// //         <div className="cell-stack">
// //           <div className="cell-primary">{row.custodian}</div>
// //           {row.department && (
// //             <div className="cell-secondary">{row.department}</div>
// //           )}
// //         </div>
// //       ),
// //     },
// //     {
// //       key: "purchase",
// //       header: "PURCHASE INFO",
// //       width: "16%",
// //       render: (row) => (
// //         <div className="cell-stack">
// //           <div className="cell-primary">{row.price}</div>
// //           <div className="cell-secondary">{row.purchaseDate}</div>
// //         </div>
// //       ),
// //     },
// //     {
// //       key: "status",
// //       header: "STATUS",
// //       width: "12%",
// //       render: (row) => (
// //         <span className={`status-pill status-${row.statusKey}`}>
// //           {row.status}
// //         </span>
// //       ),
// //     },
// //     {
// //       key: "actions",
// //       header: "ACTIONS",
// //       width: "12%",
// //       render: (row) => (
// //         <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
// //           {row.isDeleted ? (
// //             <span style={{ color: "#dc2626", fontSize: "12px", fontWeight: "500" }}>Deleted</span>
// //           ) : (
// //             <>
// //               {row.status === "Available" && (
// //                 <button
// //                   type="button"
// //                   className="action-link"
// //                   onClick={() => onAssign && onAssign(row)}
// //                   style={{ fontSize: "13px", padding: "4px 8px" }}
// //                   title="Assign Asset"
// //                 >
// //                   Assign
// //                 </button>
// //               )}
// //               {row.status === "In Use" && (
// //                 <button
// //                   type="button"
// //                   className="action-link"
// //                   onClick={() => onTransfer && onTransfer(row)}
// //                   style={{ fontSize: "13px", padding: "4px 8px" }}
// //                   title="Transfer Asset"
// //                 >
// //                   Transfer
// //                 </button>
// //               )}
// //               {row.status === "Under Maintenance" && (
// //                 <button
// //                   type="button"
// //                   className="action-link"
// //                   onClick={() => onReturn && onReturn(row)}
// //                   style={{ fontSize: "13px", padding: "4px 8px", color: "#16a34a" }}
// //                   title="Return Asset"
// //                 >
// //                   Return
// //                 </button>
// //               )}
// //               <div className="actions-btn" style={{ marginLeft: "4px" }}>
// //                 <button
// //                   type="button"
// //                   className="icon-btn edit-btn"
// //                   onClick={() => onEdit && onEdit(row)}
// //                   title="Edit Asset"
// //                 >
// //                   <SvgIcon name="edit" size={18} />
// //                 </button>
// //                 <button
// //                   type="button"
// //                   className="icon-btn history-btn"
// //                   onClick={() => onHistory && onHistory(row)}
// //                   title="View History"
// //                   style={{ background: "#f59e0b", color: "white" }}
// //                 >
// //                   <SvgIcon name="history" size={18} />
// //                 </button>
// //                 <button
// //                   type="button"
// //                   className="icon-btn delete-btn"
// //                   onClick={() => onDelete && onDelete(row)}
// //                   title="Delete Asset"
// //                 >
// //                   <SvgIcon name="delete" size={18} />
// //                 </button>
// //               </div>
// //             </>
// //           )}
// //         </div>
// //       ),
// //     },
// //   ];

// //   return (
// //     <DataTable
// //       columns={columns}
// //       data={assets}
// //       rowKey="id"
// //       className="assets-table"
// //     />
// //   );
// // };

// // export default AssetsTable;



// import DataTable from "../../components/reusable/DataTable";
// import SvgIcon from "../../components/svgIcon/svgView";
// import "../../style/Assets.css";

// const AssetsTable = ({
//   assets,
//   onEdit,
//   onDelete,
//   onAssign,
//   onTransfer,
//   onReturn,
//   onHistory,
// }) => {
//   const columns = [
//     {
//       key: "asset",
//       header: "ASSET DETAILS",
//       width: "26%",
//       render: (row) => (
//         <div className="asset-cell">
//           <div className="asset-icon">
//             <SvgIcon name="cube" size={18} />
//           </div>
//           <div>
//             <div className="asset-name">{row.name}</div>
//             <div className="asset-sub">
//               {row.code} · {row.category}
//             </div>
//           </div>
//         </div>
//       ),
//     },
//     {
//       key: "location",
//       header: "LOCATION",
//       width: "16%",
//       render: (row) => (
//         <div className="cell-stack">
//           <div className="cell-primary">{row.location}</div>
//           {row.subLocation && (
//             <div className="cell-secondary">{row.subLocation}</div>
//           )}
//         </div>
//       ),
//     },
//     {
//       key: "custodian",
//       header: "CUSTODIAN",
//       width: "18%",
//       render: (row) => (
//         <div className="cell-stack">
//           <div className="cell-primary">{row.custodian}</div>
//           {row.department && (
//             <div className="cell-secondary">{row.department}</div>
//           )}
//         </div>
//       ),
//     },
//     {
//       key: "purchase",
//       header: "PURCHASE INFO",
//       width: "16%",
//       render: (row) => (
//         <div className="cell-stack">
//           <div className="cell-primary">{row.price}</div>
//           <div className="cell-secondary">{row.purchaseDate}</div>
//         </div>
//       ),
//     },
//     {
//       key: "status",
//       header: "STATUS",
//       width: "12%",
//       render: (row) => (
//         <span className={`status-pill status-${row.statusKey}`}>
//           {row.status}
//         </span>
//       ),
//     },

//     /* =======================
//        ✅ UPDATED ACTIONS COLUMN
//        ======================= */
//     {
//       key: "actions",
//       header: "ACTIONS",
//       width: "12%",
//       render: (row) => {
//         // 🔑 SINGLE SOURCE OF TRUTH FOR DELETED STATE
//         const isDeleted =
//           row.isDeleted === true || row.status === "Disposed";

//         return (
//           <div
//             style={{
//               display: "flex",
//               gap: "8px",
//               alignItems: "center",
//               flexWrap: "wrap",
//             }}
//           >
//             {/* ✅ HISTORY → ALWAYS VISIBLE */}
//             <button
//               type="button"
//               className="icon-btn history-btn"
//               onClick={() => onHistory && onHistory(row)}
//               title="View History"
//               style={{ background: "#f59e0b", color: "white" }}
//             >
//               <SvgIcon name="history" size={18} />
//             </button>

//             {/* ❌ DELETED / DISPOSED STATE */}
//             {isDeleted ? (
//               <span className="status-pill status-deleted">Deleted</span>
//             ) : (
//               <>
//                 {/* AVAILABLE → ASSIGN */}
//                 {row.status === "Available" && (
//                   <button
//                     type="button"
//                     className="action-link"
//                     onClick={() => onAssign && onAssign(row)}
//                     title="Assign Asset"
//                   >
//                     Assign
//                   </button>
//                 )}

//                 {/* IN USE → TRANSFER */}
//                 {row.status === "In Use" && (
//                   <button
//                     type="button"
//                     className="action-link"
//                     onClick={() => onTransfer && onTransfer(row)}
//                     title="Transfer Asset"
//                   >
//                     Transfer
//                   </button>
//                 )}

//                 {/* UNDER MAINTENANCE → RETURN */}
//                 {row.status === "Under Maintenance" && (
//                   <button
//                     type="button"
//                     className="action-link"
//                     onClick={() => onReturn && onReturn(row)}
//                     style={{ color: "#16a34a" }}
//                     title="Return Asset"
//                   >
//                     Return
//                   </button>
//                 )}

//                 {/* EDIT */}
//                 <button
//                   type="button"
//                   className="icon-btn edit-btn"
//                   onClick={() => onEdit && onEdit(row)}
//                   title="Edit Asset"
//                 >
//                   <SvgIcon name="edit" size={18} />
//                 </button>

//                 {/* DELETE */}
//                 <button
//                   type="button"
//                   className="icon-btn delete-btn"
//                   onClick={() => onDelete && onDelete(row)}
//                   title="Delete Asset"
//                 >
//                   <SvgIcon name="delete" size={18} />
//                 </button>
//               </>
//             )}
//           </div>
//         );
//       },
//     },
//   ];

//   return (
//     <DataTable
//       columns={columns}
//       data={assets}
//       rowKey="id"
//       className="assets-table"
//     />
//   );
// };

// export default AssetsTable;



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
                    // style={{
                    //   position: "absolute",
                    //   right: "-12px",
                    //   top: "100%",
                    //   marginTop: "4px",
                    //   background: "white",
                    //   border: "1px solid #e2e8f0",
                    //   borderRadius: "8px",
                    //   boxShadow: "0 4px 6px rgba(0,0,0,0.1)",
                    //   zIndex: 1000,
                    //   minWidth: "160px"
                    // }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      onClick={() => {
                        onEdit && onEdit(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <SvgIcon name="edit" size={14} />
                      Edit Asset
                    </button>

                    <button
                      onClick={() => {
                        onViewMaintenanceLogs && onViewMaintenanceLogs(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <SvgIcon name="spanner" size={14} />
                      Maintenance Logs
                    </button>

                    <button
                      onClick={() => {
                        onManageDocuments && onManageDocuments(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <SvgIcon name="document" size={14} />
                      Documents
                    </button>

                    <button
                      onClick={() => {
                        onManageAMC && onManageAMC(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <SvgIcon name="document (1)" size={14} />
                      AMC Details
                    </button>

                    <div style={{ borderTop: "1px solid #e2e8f0", margin: "4px 0" }} />

                    <button
                      onClick={() => {
                        onDispose && onDispose(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
                      }}
                    >
                      <SvgIcon name="waste-disposal" size={14} />
                      Dispose Asset
                    </button>

                    <button
                      onClick={() => {
                        onDelete && onDelete(row);
                        document.querySelectorAll('.dropdown-menu').forEach(m => m.style.display = 'none');
                      }}
                      style={{
                        width: "100%",
                        padding: "8px 12px",
                        border: "none",
                        background: "none",
                        textAlign: "left",
                        cursor: "pointer",
                        fontSize: "13px",
                        color: "#dc2626",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px"
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