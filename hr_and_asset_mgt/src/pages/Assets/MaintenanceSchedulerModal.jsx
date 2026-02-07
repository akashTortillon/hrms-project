import React, { useState, useEffect } from "react";
import "../../style/AddEmployeeModal.css";
import {
  serviceTypeService,
  maintenanceShopService,
} from "../../services/masterService";



export default function MaintenanceSchedulerModal({ onClose, onSchedule, asset }) {

  const [serviceTypes, setServiceTypes] = useState([]);
  const [providers, setProviders] = useState([]);
  const [form, setForm] = useState({
    scheduledDate: "",
    serviceType: "",
    provider: "",
    cost: "",
    description: ""
  });


  /* -------------------- LOAD MASTERS -------------------- */
  useEffect(() => {
    fetchMasters();
  }, []);

  const fetchMasters = async () => {
    try {
      const [serviceTypesRes, providersRes] = await Promise.all([
        serviceTypeService.getAll(),
        maintenanceShopService.getAll(),
      ]);

      setServiceTypes(Array.isArray(serviceTypesRes) ? serviceTypesRes : []);
      setProviders(Array.isArray(providersRes) ? providersRes : []);
    } catch (error) {
      console.error("Failed to load maintenance masters", error);
    }
  };


  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: name === "cost" ? parseFloat(value) || "" : value
    });
  };

  const handleSubmit = () => {
    const { scheduledDate, serviceType, provider, cost, description } = form;

    if (!scheduledDate || !serviceType || !provider) {
      alert("Please fill all required fields: Scheduled Date, Service Type, and Provider");
      return;
    }

    // Validate cost if provided
    if (form.cost && (isNaN(form.cost) || form.cost < 0)) {
      alert("Cost must be a valid positive number");
      return;
    }

    onSchedule({
      assetId: asset._id || asset.id,
      scheduledDate,
      serviceType, // MASTER ID
      provider,    // MASTER ID
      cost: cost || null,
      description: form.description || null,
    });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-container" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Schedule Maintenance</h3>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
            {/* Asset Info */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Asset
              </label>
              <input
                type="text"
                value={`${asset?.name || ""} (${asset?.code || asset?.assetCode || ""})`}
                disabled
                style={{ opacity: 0.7 }}
              />
            </div>

            {/* Scheduled Date */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Scheduled Date *
              </label>
              <input
                type="date"
                name="scheduledDate"
                value={form.scheduledDate}
                onChange={handleChange}
                min={new Date().toISOString().split('T')[0]}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  height: "42px"
                }}
              />
            </div>

            {/* Service Type (MASTER) */}
            <div>
              <label className="modal-label">Service Type *</label>
              <select
                name="serviceType"
                value={form.serviceType}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  fontSize: "14px",
                  height: "42px"
                }}
              >
                <option value="">Select Service Type</option>
                {serviceTypes.map(type => (
                  <option key={type._id} value={type._id}>{type.name}</option>
                ))}
              </select>
            </div>

            {/* Service Provider (MASTER) */}
            <div>
              <label className="modal-label">Service Provider *</label>
              <select
                name="provider"
                value={form.provider}
                onChange={handleChange}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  fontSize: "14px",
                  height: "42px"
                }}
              >
                <option value="">Select Service Provider</option>
                {providers.map(shop => (
                  <option key={shop._id} value={shop._id}>{shop.name}</option>
                ))}
              </select>
            </div>
            {/* Cost */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Estimated Cost (AED)
              </label>
              <input
                type="number"
                name="cost"
                placeholder="0.00"
                value={form.cost}
                onChange={handleChange}
                min="0"

              />
            </div>

            {/* Description */}
            <div>
              <label style={{ display: "block", marginBottom: "8px", fontSize: "14px", fontWeight: "500" }}>
                Description (Optional)
              </label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Additional details about the maintenance..."
                rows="4"
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "8px",
                  border: "1px solid #d1d5db",
                  fontSize: "14px",
                  fontFamily: "inherit",
                  resize: "vertical"
                }}
              />
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleSubmit}>
            Schedule Maintenance
          </button>
        </div>
      </div>
    </div>
  );
}




// import React, { useEffect, useState } from "react";
// import "../../style/AddEmployeeModal.css";

// import {
//   serviceTypeService,
//   maintenanceShopService,
// } from "../../services/masterService";

// export default function MaintenanceSchedulerModal({
//   onClose,
//   onSchedule,
//   asset,
// }) {
//   const [serviceTypes, setServiceTypes] = useState([]);
//   const [providers, setProviders] = useState([]);

//   const [form, setForm] = useState({
//     scheduledDate: "",
//     serviceType: "",
//     provider: "",
//     cost: "",
//     description: "",
//   });

//   /* -------------------- LOAD MASTERS -------------------- */
//   useEffect(() => {
//     fetchMasters();
//   }, []);

//   const fetchMasters = async () => {
//     try {
//       const [serviceTypesRes, providersRes] = await Promise.all([
//         serviceTypeService.getAll(),
//         maintenanceShopService.getAll(),
//       ]);

//       setServiceTypes(Array.isArray(serviceTypesRes) ? serviceTypesRes : []);
//       setProviders(Array.isArray(providersRes) ? providersRes : []);
//     } catch (error) {
//       console.error("Failed to load maintenance masters", error);
//     }
//   };

//   /* -------------------- FORM HANDLERS -------------------- */
//   const handleChange = (e) => {
//     const { name, value } = e.target;
//     setForm({
//       ...form,
//       [name]: name === "cost" ? parseFloat(value) || "" : value,
//     });
//   };

//   const handleSubmit = () => {
//     const { scheduledDate, serviceType, provider, cost } = form;

//     if (!scheduledDate || !serviceType || !provider) {
//       alert("Please fill all required fields");
//       return;
//     }

//     if (cost && (isNaN(cost) || cost < 0)) {
//       alert("Cost must be a valid positive number");
//       return;
//     }

//     onSchedule({
//       assetId: asset._id || asset.id,
//       scheduledDate,
//       serviceType, // MASTER ID
//       provider,    // MASTER ID
//       cost: cost || null,
//       description: form.description || null,
//     });
//   };

//   /* -------------------- UI -------------------- */
//   return (
//     <div className="modal-backdrop" onClick={onClose}>
//       <div className="modal-container" onClick={(e) => e.stopPropagation()}>
//         <div className="modal-header">
//           <h3>Schedule Maintenance</h3>
//           <button className="modal-close" onClick={onClose}>
//             ✕
//           </button>
//         </div>

//         <div className="modal-body">
//           <div className="modal-grid" style={{ gridTemplateColumns: "1fr" }}>
//             {/* Asset Info */}
//             <div>
//               <label className="modal-label">Asset</label>
//               <input
//                 type="text"
//                 value={`${asset?.name || ""} (${asset?.assetCode || ""})`}
//                 disabled
//                 style={{ opacity: 0.7 }}
//               />
//             </div>

//             {/* Scheduled Date */}
//             <div>
//               <label className="modal-label">Scheduled Date *</label>
//               <input
//                 type="date"
//                 name="scheduledDate"
//                 value={form.scheduledDate}
//                 onChange={handleChange}
//                 min={new Date().toISOString().split("T")[0]}
//               />
//             </div>

//             {/* Service Type (MASTER) */}
//             <div>
//               <label className="modal-label">Service Type *</label>
//               <select
//                 name="serviceType"
//                 value={form.serviceType}
//                 onChange={handleChange}
//               >
//                 <option value="">Select Service Type</option>
//                 {serviceTypes.map((type) => (
//                   <option key={type._id} value={type._id}>
//                     {type.name}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Service Provider (MASTER) */}
//             <div>
//               <label className="modal-label">Service Provider *</label>
//               <select
//                 name="provider"
//                 value={form.provider}
//                 onChange={handleChange}
//               >
//                 <option value="">Select Service Provider</option>
//                 {providers.map((shop) => (
//                   <option key={shop._id} value={shop._id}>
//                     {shop.name}
//                   </option>
//                 ))}
//               </select>
//             </div>

//             {/* Estimated Cost */}
//             <div>
//               <label className="modal-label">Estimated Cost (AED)</label>
//               <input
//                 type="number"
//                 name="cost"
//                 placeholder="0.00"
//                 value={form.cost}
//                 onChange={handleChange}
//                 min="0"
//                 step="0.01"
//               />
//             </div>

//             {/* Description */}
//             <div>
//               <label className="modal-label">Description (Optional)</label>
//               <textarea
//                 name="description"
//                 value={form.description}
//                 onChange={handleChange}
//                 placeholder="Additional details about the maintenance..."
//                 rows="4"
//                 style={{
//                width: "100%",
//                 padding: "10px 12px",
//                 borderRadius: "8px",
//                 border: "1px solid #d1d5db",
//                  fontSize: "14px",
//                    fontFamily: "inherit",
//                    resize: "vertical"
//                  }}
//               />
//             </div>
//           </div>
//         </div>

//         <div className="modal-footer">
//           <button className="btn-secondary" onClick={onClose}>
//             Cancel
//           </button>
//           <button className="btn-primary" onClick={handleSubmit}>
//             Schedule Maintenance
//           </button>
//         </div>
//       </div>
//     </div>
//   );
// }
