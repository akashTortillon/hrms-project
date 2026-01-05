import Card from "../../components/reusable/Card";
import Button from "../../components/reusable/Button";
import "../../style/Masters.css";

const SIMPLE_SECTIONS = [
  {
    title: "Asset Types",
    items: ["IT Equipment", "Vehicles", "Furniture", "Machinery"],
  },
  {
    title: "Asset Categories",
    items: [
      "Laptops",
      "Desktops",
      "Printers",
      "Mobile Devices",
      "Cars",
      "Vans",
      "Office Furniture",
    ],
  },
  {
    title: "Status Labels",
    items: [
      "In Use",
      "Available",
      "Under Maintenance",
      "Disposed",
      "Retired",
    ],
  },
];

const VENDORS = [
  {
    name: "Dell UAE",
    desc: "IT Equipment Supplier",
  },
  {
    name: "Toyota Al Futtaim",
    desc: "Vehicle Maintenance",
  },
];

const SERVICES = [
  "Routine Maintenance",
  "Repairs",
  "AMC Contract",
];

export default function AssetManagement() {
  return (
    <div className="asset-management">

      {/* Header */}
      <div className="masters-header">
        <h3>Asset Management Masters</h3>
        <p>
          Define asset types, categories, and maintenance providers
        </p>
      </div>

      {/* Asset Definition Sections */}
      <div className="masters-grid">
        {SIMPLE_SECTIONS.map((section) => (
          <Card key={section.title} className="masters-card">
            <div className="masters-card-header">
              <h4>{section.title}</h4>
              <Button size="sm">Add</Button>
            </div>

            <ul className="masters-list">
              {section.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </Card>
        ))}
      </div>

      {/* Vendors */}
      <Card className="vendors-card">
        <div className="masters-card-header">
          <h4>Vendors & Service Providers</h4>
          <Button size="sm">Add Vendor</Button>
        </div>

        <div className="vendors-list">
          {VENDORS.map((vendor) => (
            <div key={vendor.name} className="vendor-item">
              <div>
                <div className="vendor-name">{vendor.name}</div>
                <div className="vendor-desc">{vendor.desc}</div>
              </div>
              <button className="edit-link">Edit</button>
            </div>
          ))}
        </div>
      </Card>

      {/* Service Types */}
      <Card className="service-card">
        <div className="masters-card-header">
          <h4>Service Types</h4>
          <Button size="sm">Add Service</Button>
        </div>

        <ul className="masters-list">
          {SERVICES.map((service) => (
            <li key={service}>{service}</li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
