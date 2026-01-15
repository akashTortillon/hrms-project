import React from 'react';
import "./RolesGrid.css"; // Import the standalone CSS

// Helper to get description based on role name
const getRoleDescription = (name) => {
    const lowerName = name.toLowerCase();
    if (lowerName.includes("admin")) return "Full system access";
    if (lowerName.includes("hr manager")) return "HR module access";
    if (lowerName.includes("department head")) return "Department access";
    if (lowerName.includes("employee")) return "Self-service access";
    return "Access restricted by permissions";
};

export const RenderRolesGrid = ({ items = [], handleEdit, handleDelete }) => {
    if (!items || items.length === 0) {
        return <p className="text-muted small">No items found.</p>;
    }

    return (
        <div className="roles-grid-container">
            {items.map((role) => (
                <div
                    key={role._id}
                    className="role-clean-card"
                >
                    {/* Action buttons - Hidden by default, visible on hover */}
                    <div className="role-card-actions">
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleEdit("Role", role);
                            }}
                            className="role-action-btn edit-btn"
                            title="Edit Role"
                        >
                            <svg className="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                        </button>
                        <button
                            type="button"
                            onClick={(e) => {
                                e.stopPropagation();
                                handleDelete("Role", role._id);
                            }}
                            className="role-action-btn delete-btn"
                            title="Delete Role"
                        >
                            <svg className="w-4 h-4" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                        </button>
                    </div>

                    <div className="role-card-content">
                        <h3>{role.name}</h3>
                        <p>{role.description || getRoleDescription(role.name)}</p>
                    </div>
                </div>
            ))}
        </div>
    );
}
