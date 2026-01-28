import React, { useEffect, useState, useMemo } from "react";
import { getAssets } from "../../services/assetService"; // Ensure this service exists and points to your updated API
import SvgIcon from "../../components/svgIcon/svgView";
import DataTable from "../../components/reusable/DataTable";
import Card from "../../components/reusable/Card";
import "../../style/Assets.css"; // Reuse stats grid styles

export default function DisposalReport() {
    const [disposedAssets, setDisposedAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDisposedAssets();
    }, []);

    const fetchDisposedAssets = async () => {
        try {
            setLoading(true);
            // Fetch ONLY disposed assets (using the new filtering logic)
            const response = await getAssets({ status: "Disposed", isDeleted: true });
            const data = Array.isArray(response) ? response : [];
            setDisposedAssets(data);
        } catch (error) {
            console.error("Failed to load disposal report", error);
        } finally {
            setLoading(false);
        }
    };

    // Calculate Summary Stats
    const stats = useMemo(() => {
        let totalValue = 0;
        let totalItems = disposedAssets.length;
        let soldCount = 0;
        let scrappedCount = 0;

        disposedAssets.forEach((asset) => {
            // Assuming 'disposalDetails' exists on the asset object from backend
            const details = asset.disposalDetails || {};
            totalValue += Number(details.disposalValue) || 0;

            const method = details.disposalMethod?.toLowerCase() || "";
            if (method.includes("sold")) soldCount++;
            else if (method.includes("scrap") || method.includes("recycle")) scrappedCount++;
        });

        return { totalValue, totalItems, soldCount, scrappedCount };
    }, [disposedAssets]);

    const columns = [
        {
            key: "asset",
            header: "ASSET",
            width: "25%",
            render: (row) => (
                <div>
                    <div style={{ fontWeight: "600", color: "#111827" }}>{row.name}</div>
                    <div style={{ fontSize: "12px", color: "#6b7280" }}>{row.assetCode} • {row.category}</div>
                </div>
            )
        },
        {
            key: "disposalDate",
            header: "DISPOSED DATE",
            width: "15%",
            render: (row) => row.disposalDetails?.disposalDate ? new Date(row.disposalDetails.disposalDate).toISOString().split('T')[0] : "N/A"
        },
        {
            key: "method",
            header: "METHOD",
            width: "15%",
            render: (row) => (
                <span style={{
                    padding: "4px 10px",
                    borderRadius: "12px",
                    backgroundColor: row.disposalDetails?.disposalMethod === 'Sold' ? '#ecfccb' : '#f3f4f6',
                    color: row.disposalDetails?.disposalMethod === 'Sold' ? '#365314' : '#374151',
                    fontSize: "12px",
                    fontWeight: "500"
                }}>
                    {row.disposalDetails?.disposalMethod || "N/A"}
                </span>
            )
        },
        {
            key: "reason",
            header: "REASON",
            width: "20%",
            render: (row) => <span style={{ color: "#4b5563", fontSize: "13px" }}>{row.disposalDetails?.disposalReason || "-"}</span>
        },
        {
            key: "value",
            header: "VALUE RECOUPED",
            width: "15%",
            render: (row) => (
                <div style={{ fontWeight: "600", color: row.disposalDetails?.disposalValue > 0 ? "#16a34a" : "#9ca3af" }}>
                    {row.disposalDetails?.disposalValue ? `AED ${row.disposalDetails.disposalValue.toLocaleString()}` : "AED 0"}
                </div>
            )
        }
    ];

    return (
        <div style={{ padding: "20px" }}>
            {/* Header Cards - Fixed Styles */}
            <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                gap: "20px",
                marginBottom: "25px"
            }}>
                <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div className="icon-wrapper" style={{
                        width: "48px", height: "48px", borderRadius: "12px", background: "#fee2e2",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#991b1b"
                    }}>
                        <SvgIcon name="waste-disposal" size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>{stats.totalItems}</h3>
                        <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Total Disposed</p>
                    </div>
                </div>

                <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div className="icon-wrapper" style={{
                        width: "48px", height: "48px", borderRadius: "12px", background: "#dcfce7",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#166534"
                    }}>
                        <SvgIcon name="dollar" size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>AED {stats.totalValue.toLocaleString()}</h3>
                        <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Total Value Recouped</p>
                    </div>
                </div>

                <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div className="icon-wrapper" style={{
                        width: "48px", height: "48px", borderRadius: "12px", background: "#fef3c7",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#92400e"
                    }}>
                        <SvgIcon name="shopping-cart" size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>{stats.soldCount}</h3>
                        <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Assets Sold</p>
                    </div>
                </div>

                <div className="stat-card" style={{ display: "flex", alignItems: "center", gap: "15px", padding: "20px", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                    <div className="icon-wrapper" style={{
                        width: "48px", height: "48px", borderRadius: "12px", background: "#f3f4f6",
                        display: "flex", alignItems: "center", justifyContent: "center", color: "#374151"
                    }}>
                        <SvgIcon name="recycle" size={24} />
                    </div>
                    <div>
                        <h3 style={{ margin: 0, fontSize: "24px", fontWeight: "700", color: "#111827" }}>{stats.scrappedCount}</h3>
                        <p style={{ margin: 0, fontSize: "14px", color: "#6b7280" }}>Assets Scrapped</p>
                    </div>
                </div>
            </div>

            <Card title="Disposal History Details" className="no-padding-card">
                {loading ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "#6b7280" }}>Loading records...</div>
                ) : (
                    <DataTable
                        columns={columns}
                        data={disposedAssets}
                        rowKey="_id"
                        emptyMessage="No disposed assets found."
                    />
                )}
            </Card>
        </div>
    );
}
