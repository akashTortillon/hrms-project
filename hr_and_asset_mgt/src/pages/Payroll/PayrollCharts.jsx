import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

/**
 * Stacked Bar Chart for Payroll Trends
 */
export const EmployeePayrollOverviewChart = ({ data = [] }) => {
  return (
    <div className="payroll-chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Employee payroll overview</h3>
        <p className="chart-subtitle">{data[0]?.name || 'Jan'} - {data[data.length-1]?.name || 'Dec'} 2025</p>
      </div>
      <div style={{ width: '100%', height: 300 }}>
        <ResponsiveContainer>
          <BarChart
            data={data}
            margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
            barSize={20}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }} 
              dy={10}
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fill: '#64748b', fontSize: 12 }}
              tickFormatter={(value) => `₦${(value / 1000000).toFixed(0)}m`}
            />
            <Tooltip 
              cursor={{ fill: '#f8fafc' }}
              contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
            />
            <Legend 
              verticalAlign="top" 
              align="center" 
              iconType="circle"
              wrapperStyle={{ paddingBottom: '20px' }}
            />
            <Bar dataKey="netSalary" name="Net salary" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
            <Bar dataKey="deductions" name="Deductions" stackId="a" fill="#ffedd5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/**
 * Semi-circular Donut Chart for Loans & Advances
 */
export const LoansAdvancesChart = ({ data = [], total = 0 }) => {
  const COLORS = ['#3b82f6', '#10b981'];

  return (
    <div className="payroll-chart-container">
      <div className="chart-header">
        <h3 className="chart-title">Loans & Salary Advances</h3>
      </div>
      <div style={{ width: '100%', height: 260, position: 'relative' }}>
        <ResponsiveContainer>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="70%"
              innerRadius={80}
              outerRadius={100}
              startAngle={180}
              endAngle={0}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
        <div style={{
          position: 'absolute',
          top: '55%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center'
        }}>
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>Total</p>
          <p style={{ margin: 0, fontSize: '18px', fontWeight: '800', color: '#0f172a' }}>₦{total.toLocaleString()}</p>
        </div>
      </div>
      <div className="chart-legend-grid">
        {data.map((item, index) => (
          <div key={index} className="legend-item">
            <div className="legend-label-row">
              <span className="legend-dot" style={{ backgroundColor: COLORS[index] }}></span>
              <span className="legend-text">{item.name}</span>
            </div>
            <div className="legend-value">₦{item.value.toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
};
