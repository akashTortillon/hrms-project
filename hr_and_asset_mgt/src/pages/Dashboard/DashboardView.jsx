import React, { useEffect, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import Card from "../../components/reusable/Card.jsx";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Dashboard.css";
import DashboardInfoCard from "../../components/reusable/DashboardInfoCard.jsx";
import { useNavigate } from "react-router-dom";
import { getDocumentStats } from "../../services/documentService.js";

import {
  fetchMetrics,
  fetchCompanyDocuments,
  fetchEmployeeVisas,
  fetchPendingApprovals,
  fetchTodaysAttendance,
} from "../../services/dashboardServices.js";

function Dashboard() {
  const navigate = useNavigate();

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

    fetchEmployeeVisas()
      .then((res) =>
        setEmployeeVisaExpiries(Array.isArray(res.data) ? res.data : [])
      )
      .catch(() => setEmployeeVisaExpiries([]));

    fetchPendingApprovals()
      .then((res) =>
        setPendingApprovals(Array.isArray(res.data) ? res.data : [])
      )
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

  const normalizedEmployeeVisas = employeeVisaExpiries.map((emp) => {
    const daysLeft = emp.visaExpiry
      ? Math.ceil((new Date(emp.visaExpiry) - new Date()) / (1000 * 60 * 60 * 24))
      : null;

    let variant = "success";
    if (daysLeft <= 15) variant = "danger";
    else if (daysLeft <= 45) variant = "warning";

    return {
      id: emp._id,
      primaryText: emp.name,
      secondaryText: emp.designation || "Employment Visa",
      dateText: emp.visaExpiry?.split("T")[0],
      badge: daysLeft !== null ? { text: `${daysLeft} days`, variant } : null,
      ...emp,
    };
  });

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
    <Container fluid className="dashboard-page">
      {/* 🔝 TOP METRICS */}
      <Row className="dashboard-cards-row">
        {dashboardMetrics.map((metric, index) => (
          <Col key={index} className="dashboard-card-col">
            <Card className="dashboard-metric-card">
              <div className="dashboard-card-content">
                <div className="dashboard-card-text">
                  <div className="dashboard-card-title">{metric.title}</div>
                  <div className="dashboard-card-value">{metric.value}</div>
                  <div className="dashboard-card-subtext">
                    {metric.subtext}
                  </div>
                </div>
                <div
                  className={`dashboard-icon-container ${metric.iconBgClass}`}
                >
                  <SvgIcon name={metric.iconName} size={24} />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* ⚡ QUICK ACTIONS */}
      <div className="dashboard-quick-actions">
        <div className="dashboard-quick-actions-title">Quick Actions</div>

        <Card className="dashboard-quick-actions-wrapper">
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

      {/* 📄 INFO SECTIONS */}
      <Row className="mt-4">
        <Col md={6}>
          <DashboardInfoCard
            title="Company Document Expiries"
            icon="document"
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
            actionLabel="View All"
            onActionClick={() => navigate("/app/employees")}
            onRowClick={(item) => navigate(`/app/employees/${item.employeeId || item._id}`)}
            items={normalizedEmployeeVisas}
          />
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={6}>
          <DashboardInfoCard
            title="Pending Approvals"
            icon="clock (1)"
            actionLabel="View All"
            onActionClick={() => navigate("/app/requests")}
            onRowClick={() => navigate("/app/requests")}
            items={normalizedPendingApprovals}
          />
        </Col>

        <Col md={6}>
          <DashboardInfoCard
            title="Today's Attendance"
            icon="calendar"
            actionLabel="View Details"
            onActionClick={() => navigate("/app/attendance")}
            items={normalizedAttendance}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;
