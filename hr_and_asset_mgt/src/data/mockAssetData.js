export const mockAssetData = [
    {
        assetCode: "AST020",
        name: "Dell Latitude 5420",
        type: "IT Equipment",
        category: "Laptops",
        status: "Available",
        purchaseDate: "2024-01-15",
        purchaseCost: 4500,
        serialNumber: "DL-5420-X892",
        model: "Latitude 5420",
        brand: "Dell",
        specifications: {
            processor: "Intel i7",
            ram: "16GB",
            storage: "512GB SSD"
        },
        location: "Main Store"
    },
    {
        assetCode: "AST021",
        name: "MacBook Pro M2",
        type: "IT Equipment",
        category: "Laptops",
        status: "In Use",
        purchaseDate: "2024-02-01",
        purchaseCost: 8500,
        serialNumber: "MBP-M2-9988",
        model: "MacBook Pro 14",
        brand: "Apple",
        specifications: {
            processor: "M2 Pro",
            ram: "32GB",
            storage: "1TB SSD"
        },
        location: "Main Store" // Will be overridden if assigned
    },
    {
        assetCode: "AST022",
        name: "iPhone 15 Pro",
        type: "IT Equipment", // Assuming valid type
        category: "Mobiles",
        status: "Under Maintenance",
        purchaseDate: "2023-11-20",
        purchaseCost: 4200,
        serialNumber: "IP15-P-7766",
        model: "iPhone 15 Pro",
        brand: "Apple",
        specifications: {
            color: "Titanium",
            storage: "256GB"
        },
        location: "Main Store"
    }
];
