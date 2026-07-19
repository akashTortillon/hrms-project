import { useState } from "react";
import SvgIcon from "../../../components/svgIcon/svgView";

// Companies expand to show the branches nested under them (branch.parentId === company._id)
export const RenderCompanyAccordion = ({ companies, branches, handleEdit, handleDelete, onAddBranch }) => {
    const [expandedId, setExpandedId] = useState(null);

    if (companies.length === 0) {
        return <p className="text-muted small">No companies found.</p>;
    }

    return (
        <div className="pill-list">
            {companies.map((company) => {
                const isOpen = expandedId === company._id;
                const companyBranches = branches.filter((b) => b.parentId === company._id);

                return (
                    <div key={company._id} className="structure-item" style={{ flexDirection: "column", alignItems: "stretch" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
                            <div
                                style={{ display: "flex", alignItems: "center", flex: 1, cursor: "pointer" }}
                                onClick={() => setExpandedId(isOpen ? null : company._id)}
                            >
                                <span style={{ display: "inline-block", width: "14px", fontSize: "12px", color: "#6b7280", transform: isOpen ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>▶</span>
                                {company.image && (
                                    <div className="rendered-item-logo" style={{ marginLeft: "8px" }}>
                                        <img src={company.image} alt={company.name} />
                                    </div>
                                )}
                                <div className="item-content" style={{ marginLeft: "8px" }}>
                                    <span className="structure-name" style={{ fontSize: "13px", fontWeight: "600" }}>{company.name}</span>
                                    <span style={{ fontSize: "11px", color: "#6b7280", marginLeft: "8px" }}>
                                        {companyBranches.length} branch{companyBranches.length === 1 ? "" : "es"}
                                        {company.code ? ` · Code ID: ${company.code}` : ""}
                                    </span>
                                </div>
                            </div>
                            <div className="structure-actions">
                                <button className="icon-btn edit" onClick={() => handleEdit("Company", company)}>
                                    <SvgIcon name="edit" size={16} />
                                </button>
                                <button className="icon-btn delete" onClick={() => handleDelete("Company", company._id)}>
                                    <SvgIcon name="delete" size={16} />
                                </button>
                            </div>
                        </div>

                        {isOpen && (
                            <div style={{ marginLeft: "22px", marginTop: "10px", display: "flex", flexDirection: "column", gap: "6px" }}>
                                {companyBranches.length === 0 && (
                                    <p className="text-muted small">No branches under this company yet.</p>
                                )}
                                {companyBranches.map((branch) => (
                                    <div key={branch._id} className="structure-item" style={{ background: "#f9fafb" }}>
                                        <span className="structure-name" style={{ fontSize: "13px" }}>{branch.name}</span>
                                        <div className="structure-actions">
                                            <button className="icon-btn edit" onClick={() => handleEdit("Branch", branch)}>
                                                <SvgIcon name="edit" size={16} />
                                            </button>
                                            <button className="icon-btn delete" onClick={() => handleDelete("Branch", branch._id)}>
                                                <SvgIcon name="delete" size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                                <button
                                    className="masters-add-btn"
                                    style={{ alignSelf: "flex-start" }}
                                    onClick={() => onAddBranch(company._id)}
                                >
                                    + Add Branch
                                </button>
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
};
