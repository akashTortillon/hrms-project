import SvgIcon from "../../../components/svgIcon/svgView.jsx";
import "../../../style/Masters.css";

export default function MastersCard({
    title,
    description,
    onAdd,
    headerAction,
    children,
    className = "",
    search,
    onSearchChange,
    searchPlaceholder = "Search...",
    filterValue,
    onFilterChange,
    filterOptions,
    filterLabel = "All"
}) {
    return (
        <div className={`masters-card-container ${className}`}>
            <div className="masters-card-header-clean">
                <div className="flex flex-col gap-1">
                    <h4 className="masters-card-title">{title}</h4>
                    {description && <p className="text-sm text-gray-500 font-normal">{description}</p>}
                </div>
                {headerAction ? headerAction : (onAdd && (
                    <button className="masters-add-btn" onClick={onAdd}>
                        + Add
                    </button>
                ))}
            </div>
            {(onSearchChange || onFilterChange) && (
                <div style={{ display: "flex", gap: "10px", padding: "0 16px 12px" }}>
                    {onSearchChange && (
                        <div style={{ position: "relative", flex: 1 }}>
                            <span style={{ position: "absolute", left: "10px", top: "50%", transform: "translateY(-50%)", display: "flex" }}>
                                <SvgIcon name="search" size={14} />
                            </span>
                            <input
                                type="text"
                                value={search || ""}
                                onChange={(e) => onSearchChange(e.target.value)}
                                placeholder={searchPlaceholder}
                                style={{ width: "100%", padding: "8px 12px 8px 32px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "13px" }}
                            />
                        </div>
                    )}
                    {onFilterChange && (
                        <select
                            value={filterValue || ""}
                            onChange={(e) => onFilterChange(e.target.value)}
                            style={{ padding: "8px 10px", borderRadius: "6px", border: "1px solid #e5e7eb", fontSize: "13px", backgroundColor: "white", minWidth: "160px" }}
                        >
                            <option value="">{filterLabel}</option>
                            {filterOptions.map(opt => (
                                <option key={opt} value={opt}>{opt}</option>
                            ))}
                        </select>
                    )}
                </div>
            )}
            <div className="masters-card-body">
                {children}
            </div>
        </div>
    );
}
