import React, { useEffect, useState } from "react";
import { Container, Row, Col } from "react-bootstrap";
import Card from "../../components/reusable/Card.jsx";
import SvgIcon from "../../components/svgIcon/svgView.jsx";
import "../../style/Dashboard.css";
import DashboardInfoCard from "../../components/reusable/DashboardInfoCard.jsx";
import { useNavigate } from "react-router-dom";



import {
  fetchMetrics,
  fetchCompanyDocuments,
  fetchEmployeeVisas,
  fetchPendingApprovals,
  fetchTodaysAttendance
} from "../../services/dashboardServices.js";

function Dashboard() {

  const navigate = useNavigate(); 


const [metrics, setMetrics] = useState([]);
const [companyDocumentExpiries, setCompanyDocumentExpiries] = useState([]);
const [employeeVisaExpiries, setEmployeeVisaExpiries] = useState([]);
const [pendingApprovals, setPendingApprovals] = useState([]);
const [todaysAttendance, setTodaysAttendance] = useState([]);



useEffect(() => {
  // Helper function to safely set array state
  const safeSetArray = (setter, data, fallback = []) => {
    if (Array.isArray(data)) {
      setter(data);
    } else {
      console.error('Expected array but got:', data);
      setter(fallback);
    }
  };

  // Fetch metrics with error handling
  fetchMetrics()
    .then(res => {
      safeSetArray(setMetrics, res.data);
    })
    .catch(err => {
      console.error('Error fetching metrics:', err);
      setMetrics([]); // Set to empty array on error
    });

  // Fetch company documents
  fetchCompanyDocuments()
    .then(res => {
      safeSetArray(setCompanyDocumentExpiries, res.data);
    })
    .catch(err => {
      console.error('Error fetching company documents:', err);
      setCompanyDocumentExpiries([]);
    });

  // Fetch employee visas
  fetchEmployeeVisas()
    .then(res => {
      safeSetArray(setEmployeeVisaExpiries, res.data);
    })
    .catch(err => {
      console.error('Error fetching employee visas:', err);
      setEmployeeVisaExpiries([]);
    });

  // Fetch pending approvals
  fetchPendingApprovals()
    .then(res => {
      safeSetArray(setPendingApprovals, res.data);
    })
    .catch(err => {
      console.error('Error fetching pending approvals:', err);
      setPendingApprovals([]);
    });

  // Fetch today's attendance
  fetchTodaysAttendance()
    .then(res => {
      safeSetArray(setTodaysAttendance, res.data);
    })
    .catch(err => {
      console.error('Error fetching attendance:', err);
      setTodaysAttendance([]);
    });
}, []);





  return (
    <Container fluid className="dashboard-page">
      <Row className="dashboard-cards-row">
        {metrics.map((metric, index) => (
          <Col key={index} className="dashboard-card-col">
            <Card className="dashboard-metric-card">
              <div className="dashboard-card-content">
                <div className="dashboard-card-text">
                  <div className="dashboard-card-title">{metric.title}</div>
                  <div className="dashboard-card-value">{metric.value}</div>
                  <div className="dashboard-card-subtext">{metric.subtext}</div>
                </div>
                <div className={`dashboard-icon-container ${metric.iconBgClass}`}>
                  <SvgIcon name={metric.iconName} size={24} />
                </div>
              </div>
            </Card>
          </Col>
        ))}
      </Row>

      {/* QUICK ACTIONS SECTION */}
      <div className="dashboard-quick-actions">
        <div className="dashboard-quick-actions-title">Quick Actions</div>

        <Card className="dashboard-quick-actions-wrapper">
          <div className="dashboard-quick-actions-grid">
            <Card className="dashboard-quick-action-card" onClick={() => navigate("/employees")}>
              <SvgIcon name="users" size={22} />
              <span>Add Employee</span>
            </Card>

            <Card className="dashboard-quick-action-card">
              <SvgIcon name="dollar" size={22} />
              <span>Process Payroll</span>
            </Card>

            <Card className="dashboard-quick-action-card">
              <SvgIcon name="document" size={22} />
              <span>View Documents</span>
            </Card>

            <Card className="dashboard-quick-action-card">
              <SvgIcon name="reports" size={22} />
              <span>Generate Report</span>
            </Card>
          </div>
        </Card>
      </div>


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
