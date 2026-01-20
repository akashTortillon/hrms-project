// import React, { useState, useEffect } from "react";
// import "../../style/AddEmployeeModal.css";

// export default function AddAssetModal({ onClose, onAddAsset, onUpdateAsset, asset = null }) {
//   const isEditMode = !!asset;
  
//   const [form, setForm] = useState({
//     name: "",
//     category: "",
//     location: "",
//     subLocation: "",
//     custodian: "",
//     department: "",
//     purchaseCost: "",
//     purchaseDate: "",
//     warrantyPeriod: "",
//     status: "Available",
//   });

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (asset) {
//       const purchaseDate = asset.purchaseDate
//         ? new Date(asset.purchaseDate).toISOString().split("T")[0]
//         : "";
      
//       setForm({
//         name: asset.name || "",
//         category: asset.category || "",
//         location: asset.location || "",
//         subLocation: asset.subLocation || "",
//         custodian: asset.custodian || "",
//         department: asset.department || "",
//         purchaseCost: asset.purchaseCost || "",
//         purchaseDate: purchaseDate,
//         warrantyPeriod: asset.warrantyPeriod || "",
//         status: asset.status || "Available",
//       });
//     }
//   }, [asset]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm({ ...form, [name]: name === "purchaseCost" ? parseFloat(value) || "" : value });
//   };

//   const handleSubmit = () => {
//     const { name, category, location, custodian, purchaseCost, purchaseDate, warrantyPeriod } = form;

//     if (!name || !category || !location || !custodian || !purchaseCost || !purchaseDate) {
//       alert("All required fields must be provided");
//       return;
//     }

//     // Validate purchaseCost is a valid number
//     if (isNaN(purchaseCost) || purchaseCost <= 0) {
//       alert("Purchase cost must be a valid positive number");
//       return;
//     }

//     // Validate warranty period is a valid number if provided
//     if (warrantyPeriod && (isNaN(warrantyPeriod) || warrantyPeriod <= 0)) {
//       alert("Warranty period must be a valid positive number");
//       return;
//     }

//     if (isEditMode && onUpdateAsset) {
//       onUpdateAsset({ ...form, _id: asset._id });
//     } else {
//       onAddAsset(form);
//     }
//   };

//   return (
//     <div className="modal-backdrop" onClick={onClose}>
//       <div className="modal-container" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <h3>{isEditMode ? "Edit Asset" : "Add Asset"}</h3>
//           <button className="modal-close" onClick={onClose}>✕</button>
//         </div>

//         <div className="modal-body">
//           <div className="modal-grid">
//             <input
//               name="name"
//               placeholder="Asset Name"
//               value={form.name}
//               onChange={handleChange}
//             />
//             <input
//               name="category"
//               placeholder="Category"
//               value={form.category}
//               onChange={handleChange}
//             />
//             <input
//               name="location"
//               placeholder="Location (e.g., Main Office)"
//               value={form.location}
//               onChange={handleChange}
//             />
//             <input
//               name="subLocation"
//               placeholder="Sub Location (e.g., IT Store)"
//               value={form.subLocation}
//               onChange={handleChange}
//             />
//             <input
//               name="custodian"
//               placeholder="Custodian Name"
//               value={form.custodian}
//               onChange={handleChange}
//             />
//             <input
//               name="department"
//               placeholder="Department"
//               value={form.department}
//               onChange={handleChange}
//             />
//             <input
//               name="purchaseCost"
//               type="number"
//               placeholder="Purchase Cost (AED)"
//               value={form.purchaseCost}
//               onChange={handleChange}
//               min="0"
//               step="0.01"
//             />
//             <input
//               name="purchaseDate"
//               type="date"
//               placeholder="Purchase Date"
//               value={form.purchaseDate}
//               onChange={handleChange}
//             />
//             <input
//               name="warrantyPeriod"
//               type="number"
//               placeholder="Warranty Period (Years)"
//               value={form.warrantyPeriod}
//               onChange={handleChange}
//               min="0"
//               step="1"
//             />
//             <select name="status" value={form.status} onChange={handleChange}>
//               <option value="Available">Available</option>
//               <option value="In Use">In Use</option>
//               <option value="Under Maintenance">Under Maintenance</option>
//             </select>
//           </div>
//         </div>

//         <div className="modal-footer">
//           <button className="btn-secondary" onClick={onClose}>Cancel</button>
//           <button className="btn-primary" onClick={handleSubmit}>
//             {isEditMode ? "Update Asset" : "Add Asset"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }







// import React, { useState, useEffect } from "react";
// import { getEmployees } from "../../services/employeeService.js";
// import "../../style/AddEmployeeModal.css";

// export default function AddAssetModal({ onClose, onAddAsset, onUpdateAsset, asset = null }) {
//   const isEditMode = !!asset;
//   const [employees, setEmployees] = useState([]);
  
//   const [form, setForm] = useState({
//     name: "",
//     serialNumber: "",
//     type: "",
//     category: "",
//     location: "",
//     subLocation: "",
//     custodian: "",
//     department: "",
//     purchaseCost: "",
//     purchaseDate: "",
//     warrantyPeriod: "",
//     serviceDueDate: "",
//     status: "Available",
//   });

//   useEffect(() => {
//     fetchEmployees();
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

//   // Pre-fill form if editing
//   useEffect(() => {
//     if (asset) {
//       const purchaseDate = asset.purchaseDate
//         ? new Date(asset.purchaseDate).toISOString().split("T")[0]
//         : "";
      
//       const serviceDueDate = asset.serviceDueDate
//         ? new Date(asset.serviceDueDate).toISOString().split("T")[0]
//         : "";
      
//       setForm({
//         name: asset.name || "",
//         serialNumber: asset.serialNumber || "",
//         type: asset.type || "",
//         category: asset.category || "",
//         location: asset.location || "",
//         subLocation: asset.subLocation || "",
//         custodian: asset.custodian?._id || asset.custodian || "",
//         department: asset.department || "",
//         purchaseCost: asset.purchaseCost || "",
//         purchaseDate: purchaseDate,
//         warrantyPeriod: asset.warrantyPeriod || "",
//         serviceDueDate: serviceDueDate,
//         status: asset.status || "Available",
//       });
//     }
//   }, [asset]);

//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm({ 
//       ...form, 
//       [name]: name === "purchaseCost" ? parseFloat(value) || "" : value 
//     });
//   };

//   // const handleSubmit = () => {
//   //   const { name, type, category, location, purchaseCost, purchaseDate } = form;

//   //   if (!name || !type || !category || !location || !purchaseCost || !purchaseDate) {
//   //     alert("Please fill all required fields: Name, Type, Category, Location, Purchase Cost, and Purchase Date");
//   //     return;
//   //   }

//   //   // Validate purchaseCost is a valid number
//   //   if (isNaN(purchaseCost) || purchaseCost <= 0) {
//   //     alert("Purchase cost must be a valid positive number");
//   //     return;
//   //   }

//   //   // Validate warranty period is a valid number if provided
//   //   if (form.warrantyPeriod && (isNaN(form.warrantyPeriod) || form.warrantyPeriod <= 0)) {
//   //     alert("Warranty period must be a valid positive number");
//   //     return;
//   //   }

//   //   // Prepare data - convert empty strings to null for ObjectId fields
//   //   const submitData = {
//   //     ...form,
//   //     custodian: form.custodian || null
//   //   };

//   //   if (isEditMode && onUpdateAsset) {
//   //     onUpdateAsset({ ...submitData, _id: asset._id });
//   //   } else {
//   //     onAddAsset(submitData);
//   //   }
//   // };


//   const handleSubmit = () => {
//   const { name, type, category, location, purchaseCost, purchaseDate } = form;

//   if (!name || !type || !category || !location || !purchaseCost || !purchaseDate) {
//     alert("Please fill all required fields");
//     return;
//   }

//   if (isNaN(purchaseCost) || purchaseCost <= 0) {
//     alert("Purchase cost must be a valid positive number");
//     return;
//   }

//   if (form.warrantyPeriod && (isNaN(form.warrantyPeriod) || form.warrantyPeriod <= 0)) {
//     alert("Warranty period must be a valid positive number");
//     return;
//   }

//   // 🔥 IMPORTANT: Remove custodian from asset update
//   const submitData = {
//     name: form.name,
//     serialNumber: form.serialNumber || null,
//     type: form.type,
//     category: form.category,
//     location: form.location,
//     subLocation: form.subLocation || null,
//     department: form.department || null,
//     purchaseCost: Number(form.purchaseCost),
//     purchaseDate: form.purchaseDate,
//     warrantyPeriod: form.warrantyPeriod ? Number(form.warrantyPeriod) : null,
//     serviceDueDate: form.serviceDueDate || null,
//     status: form.status,
//   };

//   if (isEditMode && onUpdateAsset) {
//     onUpdateAsset({ ...submitData, _id: asset._id });
//   } else {
//     onAddAsset(submitData);
//   }
// };


//   return (
//     <div className="modal-backdrop" onClick={onClose}>
//       <div className="modal-container" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <h3>{isEditMode ? "Edit Asset" : "Add Asset"}</h3>
//           <button className="modal-close" onClick={onClose}>✕</button>
//         </div>

//         <div className="modal-body">
//           <div className="modal-grid">
//             {/* Asset Name */}
//             <input
//               name="name"
//               placeholder="Asset Name *"
//               value={form.name}
//               onChange={handleChange}
//             />

//             {/* Serial Number */}
//             <input
//               name="serialNumber"
//               placeholder="Serial Number"
//               value={form.serialNumber}
//               onChange={handleChange}
//             />

//             {/* Type */}
//             <input
//               name="type"
//               placeholder="Asset Type *"
//               value={form.type}
//               onChange={handleChange}
//             />

//             {/* Category */}
//             <input
//               name="category"
//               placeholder="Category *"
//               value={form.category}
//               onChange={handleChange}
//             />

//             {/* Location */}
//             <input
//               name="location"
//               placeholder="Location (e.g., Main Office) *"
//               value={form.location}
//               onChange={handleChange}
//             />

//             {/* Sub Location */}
//             <input
//               name="subLocation"
//               placeholder="Sub Location (e.g., IT Store)"
//               value={form.subLocation}
//               onChange={handleChange}
//             />

//             {/* Custodian - Employee Dropdown */}
//             <select
//               name="custodian"
//               value={form.custodian}
//               onChange={handleChange}
//             >
//               <option value="">-- Select Custodian (Optional) --</option>
//               {employees.map((emp) => (
//                 <option key={emp._id} value={emp._id}>
//                   {emp.name} ({emp.code}) - {emp.department}
//                 </option>
//               ))}
//             </select>

//             {/* Department */}
//             <input
//               name="department"
//               placeholder="Department"
//               value={form.department}
//               onChange={handleChange}
//             />

//             {/* Purchase Cost */}
//             <input
//               name="purchaseCost"
//               type="number"
//               placeholder="Purchase Cost (AED) *"
//               value={form.purchaseCost}
//               onChange={handleChange}
//               min="0"
//               step="0.01"
//             />

//             {/* Purchase Date */}
//             <input
//               name="purchaseDate"
//               type="date"
//               placeholder="Purchase Date *"
//               value={form.purchaseDate}
//               onChange={handleChange}
//             />

//             {/* Warranty Period */}
//             <input
//               name="warrantyPeriod"
//               type="number"
//               placeholder="Warranty Period (Years)"
//               value={form.warrantyPeriod}
//               onChange={handleChange}
//               min="0"
//               step="1"
//             />

//             {/* Service Due Date */}
//             <input
//               name="serviceDueDate"
//               type="date"
//               placeholder="Service Due Date"
//               value={form.serviceDueDate}
//               onChange={handleChange}
//             />

//             {/* Status - Only for Edit Mode */}
//             {isEditMode && (
//               <select name="status" value={form.status} onChange={handleChange}>
//                 <option value="Available">Available</option>
//                 <option value="In Use">In Use</option>
//                 <option value="Under Maintenance">Under Maintenance</option>
//                 <option value="Disposed">Disposed</option>
//               </select>
//             )}
//           </div>
//         </div>

//         <div className="modal-footer">
//           <button className="btn-secondary" onClick={onClose}>Cancel</button>
//           <button className="btn-primary" onClick={handleSubmit}>
//             {isEditMode ? "Update Asset" : "Add Asset"}
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }





































import React, { useState, useEffect } from "react";
import { getEmployees } from "../../services/employeeService.js";
import { assetTypeService, assetCategoryService } 
  from "../../services/masterService";

import "../../style/AddEmployeeModal.css";

export default function AddAssetModal({
  onClose,
  onAddAsset,
  onUpdateAsset,
  asset = null,
}) {
  const isEditMode = !!asset;

  const [employees, setEmployees] = useState([]);
  const [assetTypes, setAssetTypes] = useState([]);
  const [categories, setCategories] = useState([]);

  const [form, setForm] = useState({
    name: "",
    serialNumber: "",
    type: "",
    category: "",
    location: "",
    subLocation: "",
    custodian: "",
    department: "",
    purchaseCost: "",
    purchaseDate: "",
    warrantyPeriod: "",
    serviceDueDate: "",
    status: "Available",
  });

  /* -------------------- LOAD MASTERS & EMPLOYEES -------------------- */
  useEffect(() => {
    fetchEmployees();
    fetchMasters();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees();
      setEmployees(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Failed to fetch employees", error);
    }
  };

  const fetchMasters = async () => {
  try {
    const [typesRes, categoriesRes] = await Promise.all([
      assetTypeService.getAll(),
      assetCategoryService.getAll(),
    ]);

    setAssetTypes(Array.isArray(typesRes) ? typesRes : []);
    setCategories(Array.isArray(categoriesRes) ? categoriesRes : []);
  } catch (error) {
    console.error("Failed to fetch asset masters", error);
  }
};

  /* -------------------- PREFILL FORM (EDIT MODE) -------------------- */
  useEffect(() => {
    if (!asset) return;

    setForm({
      name: asset.name || "",
      serialNumber: asset.serialNumber || "",
      type: asset.type?._id || asset.type || "",
      category: asset.category?._id || asset.category || "",
      location: asset.location || "",
      subLocation: asset.subLocation || "",
      custodian: asset.custodian?._id || "",
      department: asset.department || "",
      purchaseCost: asset.purchaseCost || "",
      purchaseDate: asset.purchaseDate
        ? new Date(asset.purchaseDate).toISOString().split("T")[0]
        : "",
      warrantyPeriod: asset.warrantyPeriod || "",
      serviceDueDate: asset.serviceDueDate
        ? new Date(asset.serviceDueDate).toISOString().split("T")[0]
        : "",
      status: asset.status || "Available",
    });
  }, [asset]);

  /* -------------------- FORM HANDLERS -------------------- */
  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "purchaseCost" ? parseFloat(value) || "" : value,
    });
  };

  const handleSubmit = () => {
    const { name, type, category, location, purchaseCost, purchaseDate } = form;

    if (!name || !type || !category || !location || !purchaseCost || !purchaseDate) {
      alert("Please fill all required fields");
      return;
    }

    if (isNaN(purchaseCost) || purchaseCost <= 0) {
      alert("Purchase cost must be a valid positive number");
      return;
    }

    if (form.warrantyPeriod && (isNaN(form.warrantyPeriod) || form.warrantyPeriod <= 0)) {
      alert("Warranty period must be a valid positive number");
      return;
    }

    const submitData = {
      name: form.name,
      serialNumber: form.serialNumber || null,
      type: form.type,           // Master ID
      category: form.category,   // Master ID
      location: form.location,
      subLocation: form.subLocation || null,
      department: form.department || null,
      purchaseCost: Number(form.purchaseCost),
      purchaseDate: form.purchaseDate,
      warrantyPeriod: form.warrantyPeriod ? Number(form.warrantyPeriod) : null,
      serviceDueDate: form.serviceDueDate || null,
      status: form.status,
    };

    if (isEditMode) {
      onUpdateAsset({ ...submitData, _id: asset._id });
    } else {
      onAddAsset(submitData);
    }
  };

  /* -------------------- UI -------------------- */
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{isEditMode ? "Edit Asset" : "Add Asset"}</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid">

            <input name="name" placeholder="Asset Name *" value={form.name} onChange={handleChange} />
            <input name="serialNumber" placeholder="Serial Number" value={form.serialNumber} onChange={handleChange} />

            {/* Asset Type (MASTER) */}
            <select name="type" value={form.type} onChange={handleChange}>
              <option value="">Select Asset Type *</option>
              {assetTypes.map((t) => (
                <option key={t._id} value={t._id}>{t.name}</option>
              ))}
            </select>

            {/* Category (MASTER) */}
            <select name="category" value={form.category} onChange={handleChange}>
              <option value="">Select Category *</option>
              {categories.map((c) => (
                <option key={c._id} value={c._id}>{c.name}</option>
              ))}
            </select>

            <input name="location" placeholder="Location *" value={form.location} onChange={handleChange} />
            <input name="subLocation" placeholder="Sub Location" value={form.subLocation} onChange={handleChange} />

            {/* Custodian */}
            <select name="custodian" value={form.custodian} onChange={handleChange}>
              <option value="">-- Select Custodian (Optional) --</option>
              {employees.map((emp) => (
                <option key={emp._id} value={emp._id}>
                  {emp.name} ({emp.code}) - {emp.department}
                </option>
              ))}
            </select>

            <input name="department" placeholder="Department" value={form.department} onChange={handleChange} />
            <input name="purchaseCost" type="number" placeholder="Purchase Cost (AED) *" value={form.purchaseCost} onChange={handleChange} />
            <input name="purchaseDate" type="date" value={form.purchaseDate} onChange={handleChange} />
            <input name="warrantyPeriod" type="number" placeholder="Warranty Period (Years)" value={form.warrantyPeriod} onChange={handleChange} />
            <input name="serviceDueDate" type="date" value={form.serviceDueDate} onChange={handleChange} />

            {isEditMode && (
              <select name="status" value={form.status} onChange={handleChange}>
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Disposed">Disposed</option>
              </select>
            )}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>
            {isEditMode ? "Update Asset" : "Add Asset"}
          </button>
        </div>
      </div>
    </div>
  );
}
