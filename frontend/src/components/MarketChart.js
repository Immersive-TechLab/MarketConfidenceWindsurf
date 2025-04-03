import React from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format, parseISO } from 'date-fns';

const MarketChart = ({ data }) => {
  if (!data || data.length === 0) {
    return <div>No market data available</div>;
  }

  // Format the date for display in tooltip
  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch (error) {
      return dateStr;
    }
  };

  // Custom tooltip component
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}>
          <p style={{ margin: 0 }}><strong>{formatDate(label)}</strong></p>
          <p style={{ margin: 0, color: '#3498db' }}>
            Close: ${payload[0].value.toFixed(2)}
          </p>
          {payload[1] && (
            <p style={{ margin: 0, color: '#2ecc71' }}>
              Open: ${payload[1].value.toFixed(2)}
            </p>
          )}
          {payload[2] && (
            <p style={{ margin: 0, color: '#e74c3c' }}>
              Low: ${payload[2].value.toFixed(2)}
            </p>
          )}
          {payload[3] && (
            <p style={{ margin: 0, color: '#f39c12' }}>
              High: ${payload[3].value.toFixed(2)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="chart-container">
      <ResponsiveContainer width="100%" height={400}>
        <AreaChart
          data={data}
          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="colorClose" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#3498db" stopOpacity={0.8} />
              <stop offset="95%" stopColor="#3498db" stopOpacity={0.1} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
          <XAxis 
            dataKey="date" 
            tickFormatter={(tick) => {
              try {
                return format(parseISO(tick), 'MMM yyyy');
              } catch (error) {
                return tick;
              }
            }}
            tick={{ fontSize: 12 }}
          />
          <YAxis 
            tickFormatter={(tick) => `$${tick}`}
            domain={['auto', 'auto']}
            tick={{ fontSize: 12 }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend verticalAlign="top" height={36} />
          <Area 
            type="monotone" 
            dataKey="close" 
            name="Close Price"
            stroke="#3498db" 
            fillOpacity={1} 
            fill="url(#colorClose)" 
            activeDot={{ r: 6 }} 
          />
          <Area 
            type="monotone" 
            dataKey="open" 
            name="Open Price"
            stroke="#2ecc71" 
            fill="none" 
            activeDot={{ r: 4 }} 
          />
          <Area 
            type="monotone" 
            dataKey="low" 
            name="Low Price"
            stroke="#e74c3c" 
            fill="none" 
            activeDot={{ r: 4 }} 
          />
          <Area 
            type="monotone" 
            dataKey="high" 
            name="High Price"
            stroke="#f39c12" 
            fill="none" 
            activeDot={{ r: 4 }} 
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MarketChart;
