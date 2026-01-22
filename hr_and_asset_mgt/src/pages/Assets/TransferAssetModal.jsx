// // import React, { useState, useEffect } from "react";
// // import "../../style/AddEmployeeModal.css";
// // import { getEmployees } from "../../services/employeeService.js";
// // import { maintenanceShopService } from "../../services/masterService.js";

// // export default function TransferAssetModal({ onClose, onTransfer, asset }) {
// //   const [employees, setEmployees] = useState([]);
// //   const [maintenanceShops, setMaintenanceShops] = useState([]);
// //   const [toEntityType, setToEntityType] = useState("MAINTENANCE_SHOP"); // Default to maintenance shop
// //   const [selectedEmployee, setSelectedEmployee] = useState("");
// //   const [selectedShop, setSelectedShop] = useState("");
// //   const [toStore, setToStore] = useState("");
// //   const [remarks, setRemarks] = useState("");
// //   const [currentEmployee, setCurrentEmployee] = useState("");

// //   useEffect(() => {
// //     fetchEmployees();
// //     fetchMaintenanceShops();
// //     fetchCurrentAssignment();
// //   }, []);

// //   const fetchEmployees = async () => {
// //     try {
// //       const response = await getEmployees();
// //       const employeesArray = Array.isArray(response) ? response : [];
// //       setEmployees(employeesArray);
// //     } catch (error) {
// //       console.error("Failed to fetch employees", error);
// //     }
// //   };

// //   const fetchMaintenanceShops = async () => {
// //     try {
// //       const response = await maintenanceShopService.getAll();
// //       const shopsArray = Array.isArray(response) ? response : [];
// //       setMaintenanceShops(shopsArray);
// //     } catch (error) {
// //       console.error("Failed to fetch maintenance shops", error);
// //     }
// //   };

// //   const fetchCurrentAssignment = async () => {
// //     try {
// //       // Get current assignment to show current employee
// //       const response = await fetch(`/api/assets/${asset._id || asset.id}/assignments/current`);
// //       if (response.ok) {
// //         const assignment = await response.json();
// //         if (assignment && assignment.toEmployee) {
// //           setCurrentEmployee(`${assignment.toEmployee.name} ${assignment.toEmployee.code ? `(${assignment.toEmployee.code})` : ''}`);
// //         } else {
// //           setCurrentEmployee("");
// //         }
// //       } else {
// //         setCurrentEmployee("");
// //       }
// //     } catch (error) {
// //       console.error("Failed to fetch current assignment", error);
// //       setCurrentEmployee("");
// //     }
// //   };

// //   const handleSubmit = () => {
// //     if (toEntityType === "EMPLOYEE" && !selectedEmployee) {
// //       alert("Please select an employee");
// //       return;
// //     }

// //     if (toEntityType === "MAINTENANCE_SHOP" && !selectedShop) {
// //       alert("Please select a maintenance shop");
// //       return;
// //     }

// //     if (toEntityType === "STORE" && !toStore.trim()) {
// //       alert("Please enter store name");
// //       return;
// //     }

// //     const transferData = {
// //       assetId: asset._id || asset.id,
// //       toEntityType,
// //       toEmployee: toEntityType === "EMPLOYEE" ? selectedEmployee : null,
// //       toStore: toEntityType === "STORE" ? toStore.trim() : null,
// //       shop: toEntityType === "MAINTENANCE_SHOP" ? selectedShop : null,
// //       actionType: toEntityType === "MAINTENANCE_SHOP" ? "TRANSFER_TO_MAINTENANCE" : "ASSIGN",
// //       remarks: remarks
// //     };

// //     onTransfer(transferData);
// //   };

// //   return (
// //     <div className="modal-backdrop" onClick={onClose}>
// //       <div className="modal-container" onClick={(e) => e.stopPropagation()}>
// //         <div className="modal-header">
// //           <h3>Transfer Asset</h3>
// //           <button className="modal-close" onClick={onClose}>✕</button>
// //         </div>

// //         <div className="modal-body">
// //           <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
// //             <div>
// //               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
// //                 Asset
// //               </label>
// //               <input
// //                 type="text"
// //                 value={asset?.name || ""}
// //                 disabled
// //                 style={{ opacity: 0.7 }}
// //               />
// //             </div>

// //             <div>
// //               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
// //                 Current Employee
// //               </label>
// //               <input
// //                 type="text"
// //                 value={currentEmployee || "Not assigned"}
// //                 disabled
// //                 style={{ opacity: 0.7 }}
// //               />
// //             </div>

// //             <div>
// //               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
// //                 Transfer To *
// //               </label>
// //               <select
// //                 value={toEntityType}
// //                 onChange={(e) => {
// //                   setToEntityType(e.target.value);
// //                   setSelectedEmployee("");
// //                   setSelectedShop("");
// //                   setToStore("");
// //                 }}
// //                 style={{ width: "100%" }}
// //               >
// //                 <option value="MAINTENANCE_SHOP">Maintenance Shop</option>
// //                 <option value="EMPLOYEE">Employee</option>
// //                 <option value="STORE">Store</option>
// //               </select>
// //             </div>

// //             {toEntityType === "MAINTENANCE_SHOP" ? (
// //               <div>
// //                 <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
// //                   Select Maintenance Shop *
// //                 </label>
// //                 <select
// //                   value={selectedShop}
// //                   onChange={(e) => setSelectedShop(e.target.value)}
// //                   style={{ width: "100%" }}
// //                 >
// //                   <option value="">Choose a maintenance shop...</option>
// //                   {maintenanceShops.map((shop) => (
// //                     <option key={shop._id} value={shop._id}>
// //                       {shop.name} {shop.code ? `(${shop.code})` : ""}
// //                     </option>
// //                   ))}
// //                 </select>
// //               </div>
// //             ) : toEntityType === "EMPLOYEE" ? (
// //               <div>
// //                 <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
// //                   Select Employee *
// //                 </label>
// //                 <select
// //                   value={selectedEmployee}
// //                   onChange={(e) => setSelectedEmployee(e.target.value)}
// //                   style={{ width: "100%" }}
// //                 >
// //                   <option value="">Choose an employee...</option>
// //                   {employees.map((emp) => (
// //                     <option key={emp._id} value={emp._id}>
// //                       {emp.name} ({emp.code}) - {emp.department}
// //                     </option>
// //                   ))}
// //                 </select>
// //               </div>
// //             ) : (
// //               <div>
// //                 <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
// //                   Store Name *
// //                 </label>
// //                 <input
// //                   type="text"
// //                   value={toStore}
// //                   onChange={(e) => setToStore(e.target.value)}
// //                   placeholder="Enter store name..."
// //                 />
// //               </div>
// //             )}

// //             <div>
// //               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
// //                 Remarks (Optional)
// //               </label>
// //               <textarea
// //                 value={remarks}
// //                 onChange={(e) => setRemarks(e.target.value)}
// //                 placeholder="Add any remarks..."
// //                 rows="3"
// //                 style={{
// //                   width: "100%",
// //                   padding: "10px 12px",
// //                   borderRadius: "8px",
// //                   border: "1px solid #d1d5db",
// //                   fontSize: "14px",
// //                   fontFamily: "inherit",
// //                   resize: "vertical"
// //                 }}
// //               />
// //             </div>
// //           </div>
// //         </div>

// //         <div className="modal-footer">
// //           <button className="btn-secondary" onClick={onClose}>Cancel</button>
// //           <button className="btn-primary" onClick={handleSubmit}>
// //             Transfer Asset
// //           </button>
// //         </div>
// //       </div>
// //     </div>
// //   );
// // }












// import React, { useState, useEffect } from "react";
// import "../../style/AddEmployeeModal.css";
// import { getEmployees } from "../../services/employeeService.js";
// import { maintenanceShopService } from "../../services/masterService.js";
// import { getCurrentAssignment } from "../../services/assignmentService.js";

// export default function TransferAssetModal({ onClose, onTransfer, asset }) {
//   const [employees, setEmployees] = useState([]);
//   const [maintenanceShops, setMaintenanceShops] = useState([]);
//   const [toEntityType, setToEntityType] = useState("MAINTENANCE_SHOP");
//   const [selectedEmployee, setSelectedEmployee] = useState("");
//   const [selectedShop, setSelectedShop] = useState("");
//   const [toStore, setToStore] = useState("");
//   const [remarks, setRemarks] = useState("");
//   const [currentEmployee, setCurrentEmployee] = useState("");

//   useEffect(() => {
//     fetchEmployees();
//     fetchMaintenanceShops();
//     fetchCurrentAssignment();
//   }, []);

//   const fetchEmployees = async () => {
//     try {
//       const response = await getEmployees();
//       const employeesArray = Array.isArray(response) ? response : [];
//       setEmployees(employeesArray);
//     } catch (error) {
//       console.error("Failed to fetch employees", error);
//     }
//   };

//   const fetchMaintenanceShops = async () => {
//     try {
//       const response = await maintenanceShopService.getAll();
//       const shopsArray = Array.isArray(response) ? response : [];
//       setMaintenanceShops(shopsArray);
//     } catch (error) {
//       console.error("Failed to fetch maintenance shops", error);
//     }
//   };

//   // const fetchCurrentAssignment = async () => {
//   //   try {
//   //     const response = await fetch(`/api/assets/${asset._id || asset.id}/assignments/current`);
//   //     if (response.ok) {
//   //       const assignment = await response.json();
//   //       if (assignment && assignment.toEmployee) {
//   //         setCurrentEmployee(`${assignment.toEmployee.name} ${assignment.toEmployee.code ? `(${assignment.toEmployee.code})` : ''}`);
//   //       } else {
//   //         setCurrentEmployee("");
//   //       }
//   //     } else {
//   //       setCurrentEmployee("");
//   //     }
//   //   } catch (error) {
//   //     console.error("Failed to fetch current assignment", error);
//   //     setCurrentEmployee("");
//   //   }
//   // };
//   const fetchCurrentAssignment = async () => {
//   try {
//     const data = await getCurrentAssignment(asset._id || asset.id);

//     // Expected backend return:
//     // null OR { toEmployee: { name, code } }

//     if (data?.toEmployee) {
//       const emp = data.toEmployee;
//       setCurrentEmployee(
//         `${emp.name}${emp.code ? ` (${emp.code})` : ""}`
//       );
//     } else {
//       setCurrentEmployee("");
//     }
//   } catch (error) {
//     console.error("Failed to fetch current assignment", error);
//     setCurrentEmployee("");
//   }
// };




//   const handleSubmit = () => {
//     if (toEntityType === "EMPLOYEE" && !selectedEmployee) {
//       alert("Please select an employee");
//       return;
//     }

//     if (toEntityType === "MAINTENANCE_SHOP" && !selectedShop) {
//       alert("Please select a maintenance shop");
//       return;
//     }

//     if (toEntityType === "STORE" && !toStore.trim()) {
//       alert("Please enter store name");
//       return;
//     }

//     // Determine the correct action type based on target entity
//     let actionType;
//     if (toEntityType === "MAINTENANCE_SHOP") {
//       actionType = "TRANSFER_TO_MAINTENANCE";
//     } else if (toEntityType === "EMPLOYEE") {
//       actionType = "TRANSFER_TO_EMPLOYEE";
//     } else if (toEntityType === "STORE") {
//       actionType = "TRANSFER_TO_STORE";
//     }

//     // const transferData = {
//     //   assetId: asset._id || asset.id,
//     //   toEntityType,
//     //   toEmployee: toEntityType === "EMPLOYEE" ? selectedEmployee : null,
//     //   toStore: toEntityType === "STORE" ? toStore.trim() : null,
//     //   shop: toEntityType === "MAINTENANCE_SHOP" ? selectedShop : null,
//     //   actionType: actionType,
//     //   remarks: remarks
//     // };

//     // onTransfer(transferData);


//     const transferData = {
//   assetId: asset._id || asset.id,
//   toEntityType,
//   toEmployee: toEntityType === "EMPLOYEE" ? selectedEmployee : null,
//   toStore: toEntityType === "STORE" ? toStore?.trim() : null,       // string
//   shop: toEntityType === "MAINTENANCE_SHOP" ? selectedShop : null, // string
//   actionType,
//   remarks,
// };

// await transferAsset(transferData);
//   };

//   return (
//     <div className="modal-backdrop" onClick={onClose}>
//       <div className="modal-container" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <h3>Transfer Asset</h3>
//           <button className="modal-close" onClick={onClose}>✕</button>
//         </div>

//         <div className="modal-body">
//           <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
//             <div>
//               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
//                 Asset
//               </label>
//               <input
//                 type="text"
//                 value={asset?.name || ""}
//                 disabled
//                 style={{ opacity: 0.7 }}
//               />
//             </div>

//             <div>
//               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
//                 Current Employee
//               </label>
//               <input
//                 type="text"
//                 value={currentEmployee || "Not assigned"}
//                 disabled
//                 style={{ opacity: 0.7 }}
//               />
//             </div>

//             <div>
//               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
//                 Transfer To *
//               </label>
//               <select
//                 value={toEntityType}
//                 onChange={(e) => {
//                   setToEntityType(e.target.value);
//                   setSelectedEmployee("");
//                   setSelectedShop("");
//                   setToStore("");
//                 }}
//                 style={{ width: "100%" }}
//               >
//                 <option value="MAINTENANCE_SHOP">Maintenance Shop</option>
//                 <option value="EMPLOYEE">Employee</option>
//                 <option value="STORE">Store</option>
//               </select>
//             </div>

//             {toEntityType === "MAINTENANCE_SHOP" ? (
//               <div>
//                 <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
//                   Select Maintenance Shop *
//                 </label>
//                 <select
//                   value={selectedShop}
//                   onChange={(e) => setSelectedShop(e.target.value)}
//                   style={{ width: "100%" }}
//                 >
//                   <option value="">Choose a maintenance shop...</option>
//                   {maintenanceShops.map((shop) => (
//                     <option key={shop._id} value={shop._id}>
//                       {shop.name} {shop.code ? `(${shop.code})` : ""}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             ) : toEntityType === "EMPLOYEE" ? (
//               <div>
//                 <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
//                   Select Employee *
//                 </label>
//                 <select
//                   value={selectedEmployee}
//                   onChange={(e) => setSelectedEmployee(e.target.value)}
//                   style={{ width: "100%" }}
//                 >
//                   <option value="">Choose an employee...</option>
//                   {employees.map((emp) => (
//                     <option key={emp._id} value={emp._id}>
//                       {emp.name} ({emp.code}) - {emp.department}
//                     </option>
//                   ))}
//                 </select>
//               </div>
//             ) : (
//               <div>
//                 <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
//                   Store Name *
//                 </label>
//                 <input
//                   type="text"
//                   value={toStore}
//                   onChange={(e) => setToStore(e.target.value)}
//                   placeholder="Enter store name..."
//                 />
//               </div>
//             )}

//             <div>
//               <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
//                 Remarks (Optional)
//               </label>
//               <textarea
//                 value={remarks}
//                 onChange={(e) => setRemarks(e.target.value)}
//                 placeholder="Add any remarks..."
//                 rows="3"
//                 style={{
//                   width: "100%",
//                   padding: "10px 12px",
//                   borderRadius: "8px",
//                   border: "1px solid #d1d5db",
//                   fontSize: "14px",
//                   fontFamily: "inherit",
//                   resize: "vertical"
//                 }}
//               />
//             </div>
//           </div>
//         </div>

//         <div className="modal-footer">
//           <button className="btn-secondary" onClick={onClose}>Cancel</button>
//           <button className="btn-primary" onClick={handleSubmit}>
//             Transfer Asset
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }



import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";
import { getEmployees } from "../../services/employeeService.js";
import { maintenanceShopService, getDepartments } from "../../services/masterService.js";
import { getCurrentAssignment } from "../../services/assignmentService.js";

export default function TransferAssetModal({ onClose, onTransfer, asset }) {
  const [employees, setEmployees] = useState([]);
  const [maintenanceShops, setMaintenanceShops] = useState([]);
  const [departments, setDepartments] = useState([]); // New department state
  const [toEntityType, setToEntityType] = useState("MAINTENANCE_SHOP");
  const [selectedEmployee, setSelectedEmployee] = useState("");
  const [selectedDepartment, setSelectedDepartment] = useState(""); // New department selection
  const [selectedShop, setSelectedShop] = useState("");
  const [toStore, setToStore] = useState("");
  const [remarks, setRemarks] = useState("");
  const [currentEmployee, setCurrentEmployee] = useState("");

  useEffect(() => {
    fetchEmployees();
    fetchMaintenanceShops();
    fetchDepartments(); // Fetch departments
    fetchCurrentAssignment();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      setEmployees(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const fetchMaintenanceShops = async () => {
    try {
      const response = await maintenanceShopService.getAll();
      setMaintenanceShops(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch maintenance shops", error);
    }
  };

  // New: Fetch Departments
  const fetchDepartments = async () => {
    try {
      const response = await getDepartments();
      setDepartments(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch departments", error);
    }
  };

  const fetchCurrentAssignment = async () => {
    try {
      const data = await getCurrentAssignment(asset._id || asset.id);

      if (data?.toEmployee) {
        const emp = data.toEmployee;
        setCurrentEmployee(`${emp.name}${emp.code ? ` (${emp.code})` : ""}`);
      } else {
        setCurrentEmployee("");
      }
    } catch (error) {
      console.error("Failed to fetch current assignment", error);
      setCurrentEmployee("");
    }
  };

  const handleSubmit = () => {
    if (toEntityType === "EMPLOYEE" && !selectedEmployee) {
      alert("Please select an employee");
      return;
    }

    if (toEntityType === "MAINTENANCE_SHOP" && !selectedShop) {
      alert("Please select a maintenance shop");
      return;
    }

    if (toEntityType === "DEPARTMENT" && !selectedDepartment) {
      alert("Please select a department");
      return;
    }

    if (toEntityType === "STORE" && !toStore.trim()) {
      alert("Please enter store name");
      return;
    }

    let actionType;
    if (toEntityType === "MAINTENANCE_SHOP") actionType = "TRANSFER_TO_MAINTENANCE";
    else if (toEntityType === "EMPLOYEE") actionType = "TRANSFER_TO_EMPLOYEE";
    else if (toEntityType === "DEPARTMENT") actionType = "TRANSFER_TO_DEPARTMENT";
    else if (toEntityType === "STORE") actionType = "TRANSFER_TO_STORE";

    const transferData = {
      assetId: asset._id || asset.id,
      toEntityType,
      toEmployee: toEntityType === "EMPLOYEE" ? selectedEmployee : null,
      toDepartment: toEntityType === "DEPARTMENT" ? selectedDepartment : null,
      toStore: toEntityType === "STORE" ? toStore.trim() : null,
      shop: toEntityType === "MAINTENANCE_SHOP" ? selectedShop : null,
      actionType,
      remarks,
    };

    // ✅ CORRECT: delegate API call to parent
    onTransfer(transferData);
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Transfer Asset</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
            <label>Asset</label>
            <input value={asset?.name || ""} disabled />

            <label>Current Employee</label>
            <input value={currentEmployee || "Not assigned"} disabled />

            <label>Transfer To *</label>
            <select
              value={toEntityType}
              onChange={(e) => {
                setToEntityType(e.target.value);
                setSelectedEmployee("");
                setSelectedShop("");
                setSelectedDepartment("");
                setToStore("");
              }}
            >
              <option value="MAINTENANCE_SHOP">Maintenance Shop</option>
              <option value="EMPLOYEE">Employee</option>
              <option value="DEPARTMENT">Department</option>
              <option value="STORE">Store</option>
            </select>

            {toEntityType === "MAINTENANCE_SHOP" && (
              <select value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}>
                <option value="">Choose a maintenance shop...</option>
                {maintenanceShops.map((shop) => (
                  <option key={shop._id} value={shop._id}>
                    {shop.name} {shop.code ? `(${shop.code})` : ""}
                  </option>
                ))}
              </select>
            )}

            {toEntityType === "EMPLOYEE" && (
              <select value={selectedEmployee} onChange={(e) => setSelectedEmployee(e.target.value)}>
                <option value="">Choose an employee...</option>
                {employees.map((emp) => (
                  <option key={emp._id} value={emp._id}>
                    {emp.name} ({emp.code})
                  </option>
                ))}
              </select>
            )}

            {toEntityType === "DEPARTMENT" && (
              <select value={selectedDepartment} onChange={(e) => setSelectedDepartment(e.target.value)}>
                <option value="">Choose a department...</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            )}

            {toEntityType === "STORE" && (
              <input value={toStore} onChange={(e) => setToStore(e.target.value)} />
            )}

            <textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Remarks (optional)"
            />
          </div>
        </div>

        <div className="modal-footer">
          <button onClick={onClose}>Cancel</button>
          <button onClick={handleSubmit}>Transfer Asset</button>
        </div>
      </div>
    </div>
  );
}
