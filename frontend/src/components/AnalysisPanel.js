import React from 'react';

const AnalysisPanel = ({ analysis }) => {
  if (!analysis) {
    return null;
  }

  return (
    <div className="analysis-container">
      <h2>Market Impact Analysis</h2>
      
      <div className="analysis-content">
        <p>{analysis.summary}</p>
      </div>
      
      <div className="metric-cards">
        <div className="metric-card">
          <h3>Market Decline</h3>
          <p className="negative">{analysis.percent_decline}</p>
        </div>
        
        <div className="metric-card">
          <h3>Recovery Time</h3>
          <p>{analysis.recovery_time}</p>
        </div>
        
        {analysis.key_insight && (
          <div className="metric-card">
            <h3>Key Insight</h3>
            <p>{analysis.key_insight}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalysisPanel;
