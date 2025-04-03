import React, { useState, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend,
  BarChart,
  Bar,
  ReferenceLine
} from 'recharts';
import { format, parseISO } from 'date-fns';

const ConsolidatedPerformanceChart = ({ strategiesData, individualStocks, summary, investmentManagerRef }) => {
  const [activeTab, setActiveTab] = useState('timeline');
  
  // Generate color palette
  const getStrategyColor = (strategy) => {
    const colors = {
      'hold': '#3498db',
      'withdraw': '#e74c3c',
      'add': '#2ecc71'
    };
    return colors[strategy] || '#777';
  };

  const getStockColor = (index) => {
    const colors = [
      '#3498db', '#e74c3c', '#2ecc71', '#f39c12', '#9b59b6',
      '#1abc9c', '#d35400', '#34495e', '#7f8c8d', '#c0392b'
    ];
    return colors[index % colors.length];
  };
  
  // Format the date for display in tooltip
  const formatDate = (dateStr) => {
    try {
      return format(parseISO(dateStr), 'MMM dd, yyyy');
    } catch (error) {
      return dateStr;
    }
  };
  
  // Prepare the timeline data (line chart data)
  const timelineData = useMemo(() => {
    if (!strategiesData || !strategiesData.hold) return [];
    
    // Portfolio timeline data
    const baseData = strategiesData.hold.map((item, index) => {
      return {
        date: item.date,
        "Portfolio (Hold)": item.portfolio_value,
        "Portfolio (Withdraw 20%)": strategiesData.withdraw[index].portfolio_value,
        "Portfolio (Add 20%)": strategiesData.add[index].portfolio_value,
      };
    });
    
    // Add individual stock data if available
    if (individualStocks && Object.keys(individualStocks).length > 0) {
      Object.values(individualStocks).forEach((stock, stockIndex) => {
        baseData.forEach((dayData, dayIndex) => {
          // Add hold strategy value for each stock
          dayData[`${stock.name}`] = stock.strategies.hold[dayIndex].stock_value;
        });
      });
    }
    
    return baseData;
  }, [strategiesData, individualStocks]);
  
  // Prepare comparison data (bar chart data)
  const comparisonData = useMemo(() => {
    if (!summary) return [];
    
    // Portfolio overall performance
    const data = [
      {
        name: 'Portfolio',
        hold: summary.finalValues.hold - summary.initialValue,
        withdraw: summary.finalValues.withdraw - summary.initialValue,
        add: summary.finalValues.add - summary.initialValue,
        initialValue: summary.initialValue
      }
    ];
    
    // Add individual stock performance if available
    if (individualStocks && Object.keys(individualStocks).length > 0) {
      Object.values(individualStocks).forEach(stock => {
        const holdData = stock.strategies.hold;
        const withdrawData = stock.strategies.withdraw;
        const addData = stock.strategies.add;
        
        const initialValue = holdData[0].stock_value;
        const finalHold = holdData[holdData.length - 1].stock_value;
        const finalWithdraw = withdrawData[withdrawData.length - 1].stock_value;
        const finalAdd = addData[addData.length - 1].stock_value;
        
        data.push({
          name: stock.name,
          hold: finalHold - initialValue,
          withdraw: finalWithdraw - initialValue,
          add: finalAdd - initialValue,
          initialValue: initialValue
        });
      });
    }
    
    return data;
  }, [summary, individualStocks]);
  
  if (!strategiesData || Object.keys(strategiesData).length === 0) {
    return <div>No strategy data available</div>;
  }
  
  // Custom tooltip for timeline chart
  const TimelineTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="custom-tooltip">
          <p className="tooltip-date"><strong>{formatDate(label)}</strong></p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: ${entry.value.toFixed(2)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };
  
  // Custom tooltip for comparison chart
  const ComparisonTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      // Get initial value
      const initialValue = payload[0]?.payload?.initialValue || 0;
      
      return (
        <div className="custom-tooltip">
          <p><strong>{label}</strong></p>
          <p style={{ color: '#777' }}>Initial: ${initialValue.toFixed(2)}</p>
          {payload.map((entry, index) => {
            const finalValue = entry.value + initialValue;
            const percentChange = ((entry.value / initialValue) * 100).toFixed(2);
            const sign = entry.value >= 0 ? '+' : '';
            
            return (
              <p key={index} style={{ color: entry.color }}>
                {entry.name}: ${finalValue.toFixed(2)} ({sign}{percentChange}%)
              </p>
            );
          })}
        </div>
      );
    }
    return null;
  };
  
  // Calculate timeline-specific metrics
  const getTimelineAnalysis = () => {
    if (!timelineData || timelineData.length === 0 || !summary) return null;
    
    // Get first and last data points
    const firstPoint = timelineData[0];
    const lastPoint = timelineData[timelineData.length - 1];
    
    // Calculate percentage changes for each strategy
    const holdChange = ((lastPoint["Portfolio (Hold)"] - firstPoint["Portfolio (Hold)"]) / firstPoint["Portfolio (Hold)"] * 100).toFixed(2);
    const withdrawChange = ((lastPoint["Portfolio (Withdraw 20%)"] - firstPoint["Portfolio (Withdraw 20%)"]) / firstPoint["Portfolio (Withdraw 20%)"] * 100).toFixed(2);
    const addChange = ((lastPoint["Portfolio (Add 20%)"] - firstPoint["Portfolio (Add 20%)"]) / firstPoint["Portfolio (Add 20%)"] * 100).toFixed(2);
    
    // Find the highest and lowest points in the timeline
    let highestValue = 0;
    let lowestValue = Infinity;
    let highestDate = '';
    let lowestDate = '';
    
    timelineData.forEach(point => {
      if (point["Portfolio (Hold)"] > highestValue) {
        highestValue = point["Portfolio (Hold)"];
        highestDate = point.date;
      }
      if (point["Portfolio (Hold)"] < lowestValue) {
        lowestValue = point["Portfolio (Hold)"];
        lowestDate = point.date;
      }
    });
    
    return {
      holdChange,
      withdrawChange,
      addChange,
      highestValue,
      highestDate: formatDate(highestDate),
      lowestValue,
      lowestDate: formatDate(lowestDate),
      timeRange: `${formatDate(firstPoint.date)} - ${formatDate(lastPoint.date)}`
    };
  };
  
  const timelineAnalysis = getTimelineAnalysis();
  
  return (
    <div className="consolidated-chart">
      <h3>Investment Performance Analysis</h3>
      
      <div className="chart-tabs">
        <button 
          className={`tab-button ${activeTab === 'timeline' ? 'active' : ''}`}
          onClick={() => setActiveTab('timeline')}
        >
          Timeline View
        </button>
        <button 
          className={`tab-button ${activeTab === 'comparison' ? 'active' : ''}`}
          onClick={() => setActiveTab('comparison')}
        >
          Strategy Comparison
        </button>
        <div className="export-button-container">
          <button 
            className="export-pdf-btn"
            onClick={() => {
              // Use the ref to call the export function
              if (investmentManagerRef && investmentManagerRef.current) {
                investmentManagerRef.current.exportPDF();
              }
            }}
            disabled={!investmentManagerRef || !summary}
          >
            Export PDF Report
          </button>
        </div>
      </div>
      
      {activeTab === 'timeline' && (
        <div className="timeline-chart">
          <p className="chart-description">
            Performance over time of your portfolio and individual investments
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={timelineData}
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
                <Tooltip content={<TimelineTooltip />} />
                <Legend />
                
                {/* Portfolio strategy lines */}
                <Line
                  type="monotone"
                  dataKey="Portfolio (Hold)"
                  name="Portfolio (Hold)"
                  stroke={getStrategyColor('hold')}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Portfolio (Withdraw 20%)"
                  name="Portfolio (Withdraw 20%)"
                  stroke={getStrategyColor('withdraw')}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="Portfolio (Add 20%)"
                  name="Portfolio (Add 20%)"
                  stroke={getStrategyColor('add')}
                  strokeWidth={2}
                  dot={false}
                  activeDot={{ r: 6 }}
                />
                
                {/* Individual stock lines */}
                {individualStocks && Object.values(individualStocks).map((stock, index) => (
                  <Line
                    key={stock.name}
                    type="monotone"
                    dataKey={stock.name}
                    name={stock.name}
                    stroke={getStockColor(index)}
                    strokeDasharray="5 5"
                    dot={false}
                    activeDot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
          
          {/* Timeline-based summary */}
          {summary && timelineAnalysis && (
            <div className="performance-summary timeline-summary">
              <div className="summary-header">
                <h4>Timeline Analysis</h4>
              </div>
              <div className="summary-grid">
                <div className="summary-item">
                  <span className="label">Best Portfolio Strategy:</span>
                  <span className="value" style={{ color: getStrategyColor(summary.bestStrategy) }}>
                    {summary.bestStrategy === 'hold' ? 'Hold' : 
                     summary.bestStrategy === 'withdraw' ? 'Withdraw 20%' : 'Add 20%'}
                  </span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Time Period:</span>
                  <span className="value">{timelineAnalysis.timeRange}</span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Event:</span>
                  <span className="value">{summary.eventName} ({summary.eventDate})</span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Severity:</span>
                  <span className="value">{summary.eventSeverity}</span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Hold Strategy Change:</span>
                  <span className="value" style={{ color: timelineAnalysis.holdChange >= 0 ? '#2ecc71' : '#e74c3c' }}>
                    {timelineAnalysis.holdChange >= 0 ? '+' : ''}{timelineAnalysis.holdChange}%
                  </span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Withdraw Strategy Change:</span>
                  <span className="value" style={{ color: timelineAnalysis.withdrawChange >= 0 ? '#2ecc71' : '#e74c3c' }}>
                    {timelineAnalysis.withdrawChange >= 0 ? '+' : ''}{timelineAnalysis.withdrawChange}%
                  </span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Add Strategy Change:</span>
                  <span className="value" style={{ color: timelineAnalysis.addChange >= 0 ? '#2ecc71' : '#e74c3c' }}>
                    {timelineAnalysis.addChange >= 0 ? '+' : ''}{timelineAnalysis.addChange}%
                  </span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Peak Portfolio Value:</span>
                  <span className="value">${timelineAnalysis.highestValue.toFixed(2)} ({timelineAnalysis.highestDate})</span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Lowest Portfolio Value:</span>
                  <span className="value">${timelineAnalysis.lowestValue.toFixed(2)} ({timelineAnalysis.lowestDate})</span>
                </div>
                
                <div className="summary-item">
                  <span className="label">Investment Count:</span>
                  <span className="value">
                    {summary.selectedInvestments ? summary.selectedInvestments.length : 0}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
      
      {activeTab === 'comparison' && (
        <div className="comparison-chart">
          <p className="chart-description">
            Compare the final profit/loss across different strategies and investments
          </p>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height={400}>
              <BarChart
                data={comparisonData}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis tickFormatter={(value) => `$${value}`} />
                <Tooltip content={<ComparisonTooltip />} />
                <Legend />
                <ReferenceLine y={0} stroke="#000" />
                <Bar dataKey="hold" name="Hold" fill={getStrategyColor('hold')} />
                <Bar dataKey="withdraw" name="Withdraw 20%" fill={getStrategyColor('withdraw')} />
                <Bar dataKey="add" name="Add 20%" fill={getStrategyColor('add')} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConsolidatedPerformanceChart;
