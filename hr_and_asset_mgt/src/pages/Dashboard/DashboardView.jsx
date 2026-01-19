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
      });
    })
    .catch((err) => {
      console.error("Error fetching dashboard metrics:", err);

      setMetrics({
        totalEmployees: 0,
        employeesAddedThisMonth: 0,
      });
    });

    /** ✅ Fetch REAL document stats */
    getDocumentStats()
      .then((res) => {
        console.log("Document stats response:",res);
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
      value: 7,
      subtext: "3 Urgent",
      iconName: "clock (1)",
      iconBgClass: "dashboard-icon-bg-orange",
    },
    {
      title: "Assets In Service",
      value: 5,
      subtext: "3 Due",
      iconName: "cube",
      iconBgClass: "dashboard-icon-bg-green",
    },
  ];

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
            <Card
  className="dashboard-quick-action-card"
  onClick={() => navigate("/app/employees")}
>
  <SvgIcon name="users" size={22} />
  <span>Add Employee</span>
</Card>

<Card
  className="dashboard-quick-action-card"
  onClick={() => navigate("/app/payroll")}
>
  <SvgIcon name="dollar" size={22} />
  <span>Process Payroll</span>
</Card>

<Card
  className="dashboard-quick-action-card"
  onClick={() => navigate("/app/documents")}
>
  <SvgIcon name="document" size={22} />
  <span>View Documents</span>
</Card>

<Card
  className="dashboard-quick-action-card"
  onClick={() => navigate("/app/reports")}
>
  <SvgIcon name="reports" size={22} />
  <span>Generate Report</span>
</Card>

          </div>
        </Card>
      </div>

      {/* 📄 INFO SECTIONS (UNCHANGED) */}
      <Row className="mt-4">
        <Col md={6}>
          <DashboardInfoCard
            title="Company Document Expiries"
            icon="document"
            actionLabel="View All"
            items={companyDocumentExpiries}
          />
        </Col>

        <Col md={6}>
          <DashboardInfoCard
            title="Employee Visa / ID Expiries"
            icon="exclamation"
            actionLabel="View All"
            items={employeeVisaExpiries}
          />
        </Col>
      </Row>

      <Row className="mt-4">
        <Col md={6}>
          <DashboardInfoCard
            title="Pending Approvals"
            icon="clock (1)"
            actionLabel="View All"
            items={pendingApprovals}
          />
        </Col>

        <Col md={6}>
          <DashboardInfoCard
            title="Today's Attendance"
            icon="calendar"
            actionLabel="View Details"
            items={todaysAttendance}
          />
        </Col>
      </Row>
    </Container>
  );
}

export default Dashboard;
