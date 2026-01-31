import React, { useEffect, useState, useMemo } from "react";
import { getAssets } from "../../services/assetService";
import SvgIcon from "../../components/svgIcon/svgView";
import DataTable from "../../components/reusable/DataTable";
import Card from "../../components/reusable/Card";
import StatCard from "../../components/reusable/StatCard"; // ✅ Integrated Card
import "../../style/Assets.css";

export default function DisposalReport() {
    const [disposedAssets, setDisposedAssets] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchDisposedAssets();
    }, []);

    const fetchDisposedAssets = async () => {
        try {
            setLoading(true);
            const response = await getAssets({ status: "Disposed", isDeleted: true });
            const data = Array.isArray(response) ? response : [];
            setDisposedAssets(data);
        } catch (error) {
            console.error("Failed to load disposal report", error);
        } finally {
            setLoading(false);
        }
    };

    const stats = useMemo(() => {
        let totalValue = 0;
        let totalItems = disposedAssets.length;
        let soldCount = 0;
        let scrappedCount = 0;

        disposedAssets.forEach((asset) => {
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
                    <div style={{ fontWeight: "600", color: "var(--color-text-main)" }}>{row.name}</div>
                    <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{row.assetCode} • {row.category}</div>
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
                <span className={`disposal-method-badge ${row.disposalDetails?.disposalMethod === 'Sold' ? 'disposal-method-sold' : 'disposal-method-default'}`}>
                    {row.disposalDetails?.disposalMethod || "N/A"}
                </span>
            )
        },
        {
            key: "reason",
            header: "REASON",
            width: "20%",
            render: (row) => <span style={{ color: "var(--color-text-secondary)", fontSize: "13px" }}>{row.disposalDetails?.disposalReason || "-"}</span>
        },
        {
            key: "value",
            header: "VALUE RECOUPED",
            width: "15%",
            render: (row) => (
                <div className={row.disposalDetails?.disposalValue > 0 ? "disposal-value-positive" : "disposal-value-neutral"}>
                    {row.disposalDetails?.disposalValue ? `AED ${row.disposalDetails.disposalValue.toLocaleString()}` : "AED 0"}
                </div>
            )
        }
    ];

    return (
        <div className="disposal-report-page">
            {/* Stats Grid */}
            {/* Stats Grid */}
            <div className="disposal-stats-grid">
                <StatCard
                    title="Total Disposed"
                    value={stats.totalItems}
                    iconName="waste-disposal"
                    colorVariant="red"
                />
                <StatCard
                    title="Total Value Recouped"
                    value={`AED ${stats.totalValue.toLocaleString()}`}
                    iconName="dollar"
                    colorVariant="green"
                />
                <StatCard
                    title="Assets Sold"
                    value={stats.soldCount}
                    iconName="shopping-cart"
                    colorVariant="yellow"
                />
                <StatCard
                    title="Assets Scrapped"
                    value={stats.scrappedCount}
                    iconName="recycle"
                    colorVariant="gray"
                />
            </div>

            <Card title="Disposal History Details" className="no-padding-card">
                {loading ? (
                    <div style={{ padding: "30px", textAlign: "center", color: "var(--color-text-muted)" }}>Loading records...</div>
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
