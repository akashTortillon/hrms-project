import React, { useEffect, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import Card from "../../components/reusable/Card.jsx";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Dashboard.css";
import DashboardInfoCard from "../../components/reusable/DashboardInfoCard.jsx";
import StatCard from "../../components/reusable/StatCard"; // ✅ Integrated Card
import { useNavigate } from "react-router-dom";
import { getDocumentStats } from "../../services/documentService.js";
import { useRole } from "../../contexts/RoleContext.jsx";
import EmployeeDashboard from "./EmployeeDashboard";
import CustomModal from "../../components/reusable/CustomModal.jsx";
import MyPayslipsWidget from "../../components/employee/MyPayslipsWidget.jsx";

import {
  fetchMetrics,
  fetchCompanyDocuments,
  fetchEmployeeVisas,
  fetchPendingApprovals,
  fetchTodaysAttendance,
} from "../../services/dashboardServices.js";

function Dashboard() {
  const navigate = useNavigate();
  const { role, hasPermission } = useRole();

  // Use granular permission to determine dashboard visibility
  const hasAdminAccess = hasPermission("VIEW_ADMIN_DASHBOARD");

  if (!hasAdminAccess) {
    return <EmployeeDashboard />;
  }

  /** 🔢 REAL METRICS (ONLY FIRST CARD) */
  const [metrics, setMetrics] = useState({
    totalEmployees: 0,
    employeesAddedThisMonth: 0,
    pendingApprovals: 0,
    urgentApprovals: 0,
    assetsInService: 0,
    assetsDueService: 0
  });

  // Real document stats
  const [documentStats, setDocumentStats] = useState({ total: 0, valid: 0, expiring: 0, critical: 0, expired: 0 });



  /** 🧱 DUMMY / EXISTING DATA (UNCHANGED) */
  const [companyDocumentExpiries, setCompanyDocumentExpiries] = useState([]);
  const [employeeVisaExpiries, setEmployeeVisaExpiries] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [todaysAttendance, setTodaysAttendance] = useState([]);

  const [showVisaModal, setShowVisaModal] = useState(false);
  const [allVisaExpiries, setAllVisaExpiries] = useState([]);
  const [visaModalLoading, setVisaModalLoading] = useState(false);

  const openVisaModal = () => {
    setShowVisaModal(true);
    setVisaModalLoading(true);
    fetchEmployeeVisas(true)
      .then((res) => setAllVisaExpiries(Array.isArray(res.data) ? res.data : []))
      .catch(() => setAllVisaExpiries([]))
      .finally(() => setVisaModalLoading(false));
  };



  useEffect(() => {
    /** ✅ Fetch REAL metrics */
    fetchMetrics()
      .then((res) => {
        console.log("Dashboard metrics response:", res.data);

        setMetrics({
          totalEmployees: res.data?.totalEmployees ?? 0,
          employeesAddedThisMonth: res.data?.employeesAddedThisMonth ?? 0,
          pendingApprovals: res.data?.pendingApprovals ?? 0,
          urgentApprovals: res.data?.urgentApprovals ?? 0,
          assetsInService: res.data?.assetsInService ?? 0,
          assetsDueService: res.data?.assetsDueService ?? 0
        });
      })
      .catch((err) => {
        console.error("Error fetching dashboard metrics:", err);

        setMetrics({
          totalEmployees: 0,
          employeesAddedThisMonth: 0,
          pendingApprovals: 0,
          urgentApprovals: 0,
          assetsInService: 0,
          assetsDueService: 0
        });
      });

    /** ✅ Fetch REAL document stats */
    getDocumentStats()
      .then((res) => {
        console.log("Document stats response:", res);
        // Ensure we always have a valid object structure
        const stats = res || { total: 0, valid: 0, expiring: 0, critical: 0, expired: 0 };
        setDocumentStats(stats);
      })
      .catch((err) => {
        console.error("Error fetching document stats:", err);
        setDocumentStats({ total: 0, valid: 0, expiring: 0, critical: 0, expired: 0 });
      });

    fetchCompanyDocuments()
      .then((res) => {
        setCompanyDocumentExpiries(
          Array.isArray(res.data) ? res.data : []
        );
      })
      .catch(() => setCompanyDocumentExpiries([]));

    /** ⛔ Dummy calls — DO NOT TOUCH */
    fetchEmployeeVisas()
      .then((res) =>
        setEmployeeVisaExpiries(Array.isArray(res.data) ? res.data : [])
      )
      .catch(() => setEmployeeVisaExpiries([]));

    fetchPendingApprovals()
      .then((res) => {
        if (res.data && Array.isArray(res.data.data)) {
          setPendingApprovals(res.data.data);
        } else {
          setPendingApprovals(Array.isArray(res.data) ? res.data : []);
        }
      })
      .catch(() => setPendingApprovals([]));

    fetchTodaysAttendance()
      .then((res) =>
        setTodaysAttendance(Array.isArray(res.data) ? res.data : [])
      )
      .catch(() => setTodaysAttendance([]));
  }, []);


  const getDocumentsExpiringThisMonth = (documents = []) => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    return documents.filter((doc) => {
      if (!doc.expiryDate) return false;

      const expiry = new Date(doc.expiryDate);

      return (
        expiry.getMonth() === currentMonth &&
        expiry.getFullYear() === currentYear
      );
    }).length;
  };


  /** 🧮 TOP DASHBOARD CARDS */
  const dashboardMetrics = [
    {
      title: "Total Employees",
      value: metrics.totalEmployees,
      subtext: `+${metrics.employeesAddedThisMonth} This Month`,
      iconName: "users",
      iconBgClass: "dashboard-icon-bg-blue",
    },
    {
      title: "Documents Expiring",
      value: (documentStats?.expiring || 0) + (documentStats?.critical || 0), // Both expiring soon + critical
      subtext: "This Month",
      iconName: "exclamation",
      iconBgClass: "dashboard-icon-bg-yellow",
    },
    {
      title: "Pending Approvals",
      value: metrics.pendingApprovals,
      subtext: `${metrics.urgentApprovals} Urgent`,
      iconName: "clock (1)",
      iconBgClass: "dashboard-icon-bg-orange",
    },
    {
      title: "Assets In Service",
      value: metrics.assetsInService,
      subtext: `${metrics.assetsDueService} Due`,
      iconName: "cube",
      iconBgClass: "dashboard-icon-bg-green",
    },
  ];

  /** ⚡ QUICK ACTIONS DATA */
  const quickActions = [
    {
      label: "Add Employee",
      icon: "users",
      path: "/app/employees",
    },
    {
      label: "Process Payroll",
      icon: "dollar",
      path: "/app/payroll",
    },
    {
      label: "View Documents",
      icon: "document",
      path: "/app/documents",
    },
    {
      label: "Generate Report",
      icon: "reports",
      path: "/app/reports",
    },
  ];

  /** 📄 INFO SECTIONS DATA NORMALIZATION */
  const normalizedCompanyDocs = companyDocumentExpiries.map((doc) => {
    const daysLeft = doc.expiryDate
      ? Math.ceil((new Date(doc.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    let variant = "success";
    if (daysLeft <= 7) variant = "danger";
    else if (daysLeft <= 30) variant = "warning";

    return {
      id: doc._id,
      primaryText: doc.name,
      secondaryText: doc.location || "Main Office",
      dateText: doc.expiryDate?.split("T")[0],
      badge: daysLeft !== null ? { text: `${daysLeft} days`, variant } : null,
      ...doc,
    };
  });

  const normalizeVisaRow = (row) => {
    const daysLeft = row.expiryDate
      ? Math.ceil((new Date(row.expiryDate) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    let variant = "success";
    if (daysLeft <= 15) variant = "danger";
    else if (daysLeft <= 45) variant = "warning";

    return {
      id: `${row._id}-${row.documentType}`,
      primaryText: row.name,
      secondaryText: `${row.designation || "Employee"} — ${row.documentType} expiry`,
      dateText: row.expiryDate?.split("T")[0],
      badge: daysLeft !== null ? { text: `${daysLeft} days`, variant } : null,
      ...row,
    };
  };

  const normalizedEmployeeVisas = employeeVisaExpiries.map(normalizeVisaRow);

  const normalizedPendingApprovals = pendingApprovals.map((approval) => ({
    id: approval._id,
    primaryText: approval.userId?.name || "Unknown Requester",
    secondaryText: approval.requestType,
    actions: [
      {
        icon: "circle-tick",
        variant: "success",
        onClick: () => console.log("Approve", approval._id),
      },
      {
        icon: "circle-xmark",
        variant: "danger",
        onClick: () => console.log("Reject", approval._id),
      },
    ],
    ...approval,
  }));

  const normalizedAttendance = todaysAttendance.map((dept) => ({
    id: dept.department,
    primaryText: dept.department,
    progress: {
      present: dept.present,
      total: dept.total,
      leave: dept.leave,
      absent: dept.absent,
    },
  }));

  return (
    <>
    <Container fluid className="dashboard-page">
      {/* 🔝 TOP METRICS */}
      {/* import StatCard from "../../components/reusable/StatCard";

      // ... (inside the component) */}

      {/* 🔝 TOP METRICS */}
      <Row className="dashboard-cards-row">
        {dashboardMetrics.map((metric, index) => {
          // Map old class names to new color variants
          const colorMap = {
            "dashboard-icon-bg-blue": "vibrant-blue",
            "dashboard-icon-bg-yellow": "vibrant-red", // Red in reference (Compliance)
            "dashboard-icon-bg-orange": "vibrant-lightblue", // Sky Blue in reference
            "dashboard-icon-bg-green": "vibrant-dark" // Dark in reference
          };
          const variant = colorMap[metric.iconBgClass] || "vibrant-blue";

          return (
            <Col key={index} className="dashboard-card-col">
              <StatCard
                title={metric.title}
                value={metric.value}
                subtext={metric.subtext}
                iconName={metric.iconName}
                colorVariant={variant}
              />
            </Col>
          );
        })}
      </Row>



      {/* ⚡ QUICK ACTIONS - Hidden if no admin access */}
      {hasAdminAccess && (
        <div className="dashboard-quick-actions">
          {/* <div className="dashboard-quick-actions-title">Quick Actions</div> */}

          <Card className="dashboard-quick-actions-wrapper">
            <div className="dashboard-quick-actions-title">Quick Actions</div>
            <div className="dashboard-quick-actions-grid">
              {quickActions.map((action, index) => (
                <Card
                  key={index}
                  className="dashboard-quick-action-card"
                  onClick={() => navigate(action.path)}
                >
                  <SvgIcon name={action.icon} size={22} />
                  <span>{action.label}</span>
                </Card>
              ))}
            </div>
          </Card>
        </div>
      )}

      {/* 📄 INFO SECTIONS */}
      <Row className="mt-4">
        <Col md={6}>
          <DashboardInfoCard
            title="Company Document Expiries"
            icon="document"
            colorVariant="blue"
            actionLabel="View All"
            onActionClick={() => navigate("/app/documents")}
            onRowClick={() => navigate("/app/documents")}
            items={normalizedCompanyDocs}
          />
        </Col>

        <Col md={6}>
          <DashboardInfoCard
            title="Employee Visa / ID Expiries"
            icon="exclamation"
            colorVariant="orange"
            actionLabel="View All"
            onActionClick={openVisaModal}
            onRowClick={(item) => navigate(`/app/employees/${item._id}?tab=Employment`)}
            items={normalizedEmployeeVisas}
          />
        </Col>
      </Row>

      <Row className="mt-4">
        {hasPermission("APPROVE_REQUESTS") && (
          <Col md={6}>
            <DashboardInfoCard
              title="Pending Approvals"
              icon="clock (1)"
              colorVariant="yellow"
              actionLabel="View All"
              onActionClick={() => navigate("/app/requests")}
              onRowClick={() => navigate("/app/requests")}
              items={normalizedPendingApprovals}
            />
          </Col>
        )}

        <Col md={!hasAdminAccess ? 12 : 6}>
          <DashboardInfoCard
            title="Today's Attendance"
            icon="calendar"
            colorVariant="green"
            actionLabel="View Details"
            onActionClick={() => navigate("/app/attendance")}
            items={normalizedAttendance}
          />
        </Col>
      </Row>

      {/* Self-service payslip access for admins/HR who are also a linked Employee record -
          reuses the exact same widget EmployeeDashboard.jsx already has, so it's an empty
          state (not an error) for admins with no linked employee. */}
      <Row className="mt-4">
        <Col md={12}>
          <MyPayslipsWidget />
        </Col>
      </Row>
    </Container>

    <CustomModal
      show={showVisaModal}
      title="Employee Visa / ID Expiries"
      onClose={() => setShowVisaModal(false)}
      width="700px"
    >
      {visaModalLoading ? (
        <p style={{ textAlign: "center", color: "#6b7280", padding: "20px 0" }}>Loading...</p>
      ) : allVisaExpiries.length === 0 ? (
        <p style={{ textAlign: "center", color: "#6b7280", padding: "20px 0" }}>No expiring visas, passports, or Emirates IDs found.</p>
      ) : (
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid #e5e7eb" }}>
                <th style={{ padding: "8px" }}>Employee</th>
                <th style={{ padding: "8px" }}>Document</th>
                <th style={{ padding: "8px" }}>Expiry Date</th>
                <th style={{ padding: "8px" }}>Status</th>
                <th style={{ padding: "8px" }}></th>
              </tr>
            </thead>
            <tbody>
              {allVisaExpiries.map((row) => (
                <tr
                  key={`${row._id}-${row.documentType}`}
                  style={{ borderBottom: "1px solid #f3f4f6", cursor: "pointer" }}
                  onClick={() => {
                    setShowVisaModal(false);
                    navigate(`/app/employees/${row._id}?tab=Employment`);
                  }}
                >
                  <td style={{ padding: "8px" }}>{row.name}</td>
                  <td style={{ padding: "8px" }}>{row.documentType}</td>
                  <td style={{ padding: "8px" }}>{row.expiryDate?.split("T")[0]}</td>
                  <td style={{ padding: "8px" }}>{row.status}</td>
                  <td style={{ padding: "8px", textAlign: "right" }}>
                    <button
                      type="button"
                      title={`Open ${row.name}'s ${row.documentType} details`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowVisaModal(false);
                        navigate(`/app/employees/${row._id}?tab=Employment`);
                      }}
                      style={{
                        background: "#eff6ff", border: "none", borderRadius: "6px",
                        width: "28px", height: "28px", display: "inline-flex",
                        alignItems: "center", justifyContent: "center", cursor: "pointer"
                      }}
                    >
                      <SvgIcon name="eye" size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </CustomModal>
    </>
  );
}

export default Dashboard;
