import React, { useState } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend 
} from 'recharts';
import { format, parseISO } from 'date-fns';

const IndividualStockCharts = ({ individualStocks, summary, timeFrame }) => {
  const [selectedStrategy, setSelectedStrategy] = useState('hold');
  
  if (!individualStocks || Object.keys(individualStocks).length === 0) {
    return null;
  }
  
  // Format the date for display
  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch (error) {
      return dateStr;
    }
  };
  
  // Strategy options
  const strategies = [
    { id: 'hold', label: 'Hold', color: '#3498db' },
    { id: 'withdraw', label: 'Withdraw 20%', color: '#e74c3c' },
    { id: 'add', label: 'Add 20%', color: '#2ecc71' }
  ];
  
  // Get selected investments
  const selectedInvestments = summary && summary.userInvestments
    ? summary.userInvestments.filter(inv => summary.selectedInvestments.includes(inv.id))
    : [];
    
  // Prepare data for the combined chart - one line per stock for the selected strategy
  const prepareComparisonData = () => {
    // Find a stock to use as the base for dates
    const stockIds = Object.keys(individualStocks);
    if (stockIds.length === 0) return [];
    
    // Use the first stock's data points for dates
    const firstStockData = individualStocks[stockIds[0]].strategies[selectedStrategy];
    
    return firstStockData.map((dataPoint, index) => {
      const point = { date: dataPoint.date };
      
      // Add value for each stock
      stockIds.forEach(stockId => {
        const stock = individualStocks[stockId];
        point[stock.name] = stock.strategies[selectedStrategy][index].stock_value;
      });
      
      return point;
    });
  };
  
  // Custom tooltip for comparison chart
  const CustomComparisonTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px',
          maxWidth: '300px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{formatDate(label)}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {entry.name}: ${entry.value.toFixed(2)}
            </p>
          ))}
          <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#666' }}>
            Strategy: {strategies.find(s => s.id === selectedStrategy).label}
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Custom tooltip for individual stock charts
  const CustomStockTooltip = ({ active, payload, label, stockName }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip" style={{
          backgroundColor: '#fff',
          padding: '10px',
          border: '1px solid #ccc',
          borderRadius: '5px'
        }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>{formatDate(label)}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ margin: 0, color: entry.color }}>
              {entry.name}: ${entry.value.toFixed(2)}
            </p>
          ))}
          <p style={{ margin: '5px 0 0', fontSize: '12px', color: '#666' }}>
            {stockName}
          </p>
        </div>
      );
    }
    return null;
  };
  
  // Generate colors for multiple stocks
  const getStockColor = (index) => {
    const colors = [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6', 
      '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#c0392b'
    ];
    return colors[index % colors.length];
  };
  
  return (
    <div className="individual-stock-charts">
      <h3>Individual Investment Performance</h3>
      
      {/* Strategy selector */}
      <div className="strategy-selector">
        <p>Select a strategy to compare performance across all investments:</p>
        <div className="strategy-buttons">
          {strategies.map(strategy => (
            <button
              key={strategy.id}
              className={`strategy-button ${selectedStrategy === strategy.id ? 'active' : ''}`}
              style={{ 
                backgroundColor: selectedStrategy === strategy.id ? strategy.color : 'transparent',
                color: selectedStrategy === strategy.id ? 'white' : '#333',
                borderColor: strategy.color
              }}
              onClick={() => setSelectedStrategy(strategy.id)}
            >
              {strategy.label}
            </button>
          ))}
        </div>
      </div>
      
      {/* All stocks comparison chart */}
      <div className="comparison-chart-container">
        <h4>All Selected Investments ({selectedStrategy})</h4>
        <ResponsiveContainer width="100%" height={400}>
          <LineChart
            data={prepareComparisonData()}
            margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
            <XAxis 
              dataKey="date" 
              tickFormatter={(tick) => format(parseISO(tick), 'MMM yyyy')}
              tick={{ fontSize: 12 }}
            />
            <YAxis 
              tickFormatter={(tick) => `$${tick}`}
              domain={['auto', 'auto']}
              tick={{ fontSize: 12 }}
            />
            <Tooltip content={<CustomComparisonTooltip />} />
            <Legend />
            
            {Object.values(individualStocks).map((stock, index) => (
              <Line 
                key={stock.name}
                type="monotone" 
                dataKey={stock.name} 
                name={stock.name}
                stroke={getStockColor(index)} 
                dot={false}
                activeDot={{ r: 6 }} 
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      
      {/* Individual stock charts */}
      <h4>Individual Investment Charts</h4>
      <div className="individual-charts-grid">
        {Object.values(individualStocks).map((stock, index) => (
          <div key={stock.name} className="individual-chart-container">
            <div className="stock-header">
              <h5>{stock.name}</h5>
              <p className="initial-amount">Initial: ${stock.initialAmount.toFixed(2)}</p>
            </div>
            
            <ResponsiveContainer width="100%" height={250}>
              <LineChart
                data={Object.keys(stock.strategies).map(strategy => {
                  // Transform data for each strategy into a format suitable for the chart
                  const lastIndex = stock.strategies[strategy].length - 1;
                  const finalValue = stock.strategies[strategy][lastIndex].stock_value;
                  const initialValue = stock.strategies[strategy][0].stock_value;
                  const percentChange = ((finalValue - initialValue) / initialValue) * 100;
                  
                  return {
                    strategy,
                    name: strategy === 'hold' ? 'Hold' : 
                           strategy === 'withdraw' ? 'Withdraw 20%' : 'Add 20%',
                    color: strategy === 'hold' ? '#3498db' : 
                            strategy === 'withdraw' ? '#e74c3c' : '#2ecc71',
                    data: stock.strategies[strategy],
                    finalValue,
                    percentChange: percentChange.toFixed(2)
                  };
                }).reduce((result, strategyData) => {
                  // Map each strategy's data points to include the strategy name
                  strategyData.data.forEach((point, i) => {
                    if (!result[i]) {
                      result[i] = { date: point.date };
                    }
                    result[i][strategyData.strategy] = point.stock_value;
                  });
                  return result;
                }, [])}
                margin={{ top: 10, right: 0, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f5f5f5" />
                <XAxis 
                  dataKey="date" 
                  tickFormatter={(tick) => format(parseISO(tick), 'MMM yyyy')}
                  tick={{ fontSize: 10 }}
                />
                <YAxis 
                  tickFormatter={(tick) => `$${tick}`}
                  domain={['auto', 'auto']}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip content={(props) => <CustomStockTooltip {...props} stockName={stock.name} />} />
                <Legend />
                {strategies.map(strategy => (
                  <Line 
                    key={strategy.id}
                    type="monotone" 
                    dataKey={strategy.id} 
                    name={strategy.label}
                    stroke={strategy.color} 
                    dot={false}
                    activeDot={{ r: 4 }} 
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
            
            <div className="strategy-results">
              {strategies.map(strategy => {
                const strategyData = stock.strategies[strategy.id];
                const lastIndex = strategyData.length - 1;
                const finalValue = strategyData[lastIndex].stock_value;
                const initialValue = strategyData[0].stock_value;
                const percentChange = ((finalValue - initialValue) / initialValue) * 100;
                
                return (
                  <div key={strategy.id} className="strategy-result">
                    <span className="strategy-name" style={{ color: strategy.color }}>
                      {strategy.label}:
                    </span>
                    <span className="final-value">${finalValue.toFixed(2)}</span>
                    <span 
                      className="percent-change"
                      style={{ color: percentChange >= 0 ? '#2ecc71' : '#e74c3c' }}
                    >
                      {percentChange >= 0 ? '+' : ''}{percentChange.toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default IndividualStockCharts;
