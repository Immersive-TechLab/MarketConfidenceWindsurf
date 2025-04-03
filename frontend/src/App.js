import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import MarketChart from './components/MarketChart';
import ChatInput from './components/ChatInput';
import AnalysisPanel from './components/AnalysisPanel';
import ConsolidatedPerformanceChart from './components/ConsolidatedPerformanceChart';
import InvestmentManager from './components/InvestmentManager';
import './App.css';

// Configure the base URL for API requests
const API_BASE_URL = 'http://localhost:5000';
axios.defaults.baseURL = API_BASE_URL;

function App() {
  const [marketData, setMarketData] = useState([]);
  const [timeFrame, setTimeFrame] = useState({
    startDate: null,
    endDate: null
  });
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [error, setError] = useState(null);
  const [strategiesData, setStrategiesData] = useState(null);
  const [strategySummary, setStrategySummary] = useState(null);
  const [simulatingStrategies, setSimulatingStrategies] = useState(false);
  const [userInvestments, setUserInvestments] = useState([]);
  const [selectedInvestments, setSelectedInvestments] = useState([]);
  const [individualStocks, setIndividualStocks] = useState({});
  
  // Use refs to track operation states and prevent infinite loops
  const simulationInProgress = useRef(false);
  const currentEvent = useRef(null);
  const pendingSimulation = useRef(false);
  const investmentManagerRef = useRef(null);

  // Fetch initial market data on component mount
  useEffect(() => {
    fetchMarketData();
  }, []);

  const fetchMarketData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Add retry logic for API calls
      let retries = 3;
      let response;
      
      while (retries > 0) {
        try {
          response = await axios.get(`${API_BASE_URL}/api/market-data`, { timeout: 10000 });
          break; // Success, exit the retry loop
        } catch (err) {
          retries--;
          if (retries === 0) {
            throw err; // No more retries, propagate the error
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
        }
      }
      
      if (response && response.data.status === 'success') {
        setMarketData(response.data.data);
        
        // Extract date range from the data
        if (response.data.data.length > 0) {
          const dates = response.data.data.map(item => new Date(item.date));
          const startDate = new Date(Math.min(...dates));
          const endDate = new Date(Math.max(...dates));
          
          setTimeFrame({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0]
          });
        }
      } else {
        setError('Failed to fetch market data. Please check if the backend server is running.');
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
      setError(`Error: ${err.message || 'Failed to connect to the server. Please ensure the backend is running.'}`);
    } finally {
      setLoading(false);
    }
  };

  const analyzeEvent = async (event) => {
    try {
      setAnalyzing(true);
      setStrategiesData(null);
      setStrategySummary(null);
      setIndividualStocks({});
      setError(null);
      
      // Store current event for potential re-simulation
      currentEvent.current = event;
      
      // Add retry logic for API calls
      let retries = 3;
      let response;
      
      while (retries > 0) {
        try {
          response = await axios.post(`${API_BASE_URL}/api/analyze-event`, { event }, { timeout: 10000 });
          break; // Success, exit the retry loop
        } catch (err) {
          retries--;
          if (retries === 0) {
            throw err; // No more retries, propagate the error
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
        }
      }
      
      if (response && response.data.status === 'success') {
        setMarketData(response.data.data);
        setTimeFrame(response.data.timeFrame);
        setAnalysis(response.data.analysis);
        
        // After successfully analyzing the event, simulate investment strategies
        simulateStrategies(event, userInvestments, selectedInvestments);
      } else {
        setError('Failed to analyze event. Please check if the backend server is running.');
      }
    } catch (err) {
      console.error('Error analyzing event:', err);
      setError(`Error: ${err.message || 'Failed to connect to the server. Please ensure the backend is running.'}`);
    } finally {
      setAnalyzing(false);
    }
  };

  const simulateStrategies = async (event, investments, selectedIds) => {
    // Don't start a new simulation if one is already in progress
    if (simulationInProgress.current) {
      // Queue a simulation for after the current one finishes
      pendingSimulation.current = true;
      return;
    }
    
    try {
      simulationInProgress.current = true;
      setSimulatingStrategies(true);
      
      // Add retry logic for API calls
      let retries = 3;
      let response;
      
      while (retries > 0) {
        try {
          response = await axios.post(`${API_BASE_URL}/api/simulate-strategies`, { 
            event,
            investments,
            selectedInvestments: selectedIds
          }, { timeout: 10000 });
          break; // Success, exit the retry loop
        } catch (err) {
          retries--;
          if (retries === 0) {
            throw err; // No more retries, propagate the error
          }
          // Wait before retrying (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, (3 - retries) * 1000));
        }
      }
      
      if (response && response.data.status === 'success') {
        setStrategiesData(response.data.strategies);
        setStrategySummary(response.data.summary);
        setIndividualStocks(response.data.individualStocks || {});
      } else {
        setError('Failed to simulate investment strategies. Please check if the backend server is running.');
      }
    } catch (err) {
      console.error('Error simulating strategies:', err);
      setError(`Error: ${err.message || 'Failed to connect to the server. Please ensure the backend is running.'}`);
    } finally {
      setSimulatingStrategies(false);
      simulationInProgress.current = false;
      
      // Check if there's a pending simulation that needs to be run
      if (pendingSimulation.current && currentEvent.current) {
        pendingSimulation.current = false;
        // Use a small timeout to ensure state updates are complete
        setTimeout(() => {
          simulateStrategies(currentEvent.current, userInvestments, selectedInvestments);
        }, 100);
      }
    }
  };

  const resetToDefault = () => {
    fetchMarketData();
    setAnalysis(null);
    setStrategiesData(null);
    setStrategySummary(null);
    setIndividualStocks({});
    currentEvent.current = null;
  };

  const handleInvestmentsChange = (investments) => {
    setUserInvestments(investments);
    
    // If we already have an analysis, re-run the simulation with the new investments
    if (currentEvent.current) {
      // Use a small timeout to avoid React batching issues
      setTimeout(() => {
        // Clone the investments to prevent mutation issues
        const investmentsCopy = JSON.parse(JSON.stringify(investments));
        // Use the most recent selection state
        const selectedIdsCopy = investments
          .filter(inv => inv.selected)
          .map(inv => inv.id);
        
        // Set the selected investments state
        setSelectedInvestments(selectedIdsCopy);
        
        // Run the simulation with the latest data
        simulateStrategies(currentEvent.current, investmentsCopy, selectedIdsCopy);
      }, 50);
    }
  };

  const handleSelectionChange = (selectedIds) => {
    setSelectedInvestments(selectedIds);
    
    // If we already have an analysis, re-run the simulation with the updated selection
    if (currentEvent.current) {
      // Use a small timeout to avoid React batching issues
      setTimeout(() => {
        // Clone the investments to prevent mutation issues
        const investmentsCopy = JSON.parse(JSON.stringify(userInvestments));
        const selectedIdsCopy = [...selectedIds];
        
        // Run the simulation with the latest data
        simulateStrategies(currentEvent.current, investmentsCopy, selectedIdsCopy);
      }, 50);
    }
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <h1>Market Confidence Application</h1>
          <p>Analyze the impact of global events on the MSCI World Index</p>
        </header>

        <div className="card">
          <div className="chart-header">
            <h2>MSCI World Index</h2>
            {timeFrame.startDate && timeFrame.endDate && (
              <p>Showing data from {timeFrame.startDate} to {timeFrame.endDate}</p>
            )}
            {analysis && (
              <button onClick={resetToDefault} className="reset-button">
                Reset to Default View
              </button>
            )}
          </div>
          
          {error && <div className="error">{error}</div>}
          
          {loading ? (
            <div className="loading">
              <div className="loading-spinner"></div>
            </div>
          ) : (
            <MarketChart data={marketData} />
          )}
        </div>

        <div className="card">
          <h2>Analyze Global Event Impact</h2>
          <p>Enter a global event to see its impact on the markets</p>
          <ChatInput onSubmit={analyzeEvent} isLoading={analyzing} />
          
          {analyzing && (
            <div className="loading">
              <p>Analyzing the event impact...</p>
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {analysis && <AnalysisPanel analysis={analysis} />}
        </div>

        <div className="card">
          <InvestmentManager 
            ref={investmentManagerRef}
            onInvestmentsChange={handleInvestmentsChange}
            onSelectionChange={handleSelectionChange}
            strategySummary={strategySummary}
          />
        </div>
        
        {simulatingStrategies && (
          <div className="card">
            <div className="loading">
              <p>Simulating investment strategies...</p>
              <div className="loading-spinner"></div>
            </div>
          </div>
        )}

        {strategiesData && !simulatingStrategies && (
          <div className="card">
            <ConsolidatedPerformanceChart 
              strategiesData={strategiesData} 
              individualStocks={individualStocks}
              summary={strategySummary}
              investmentManagerRef={investmentManagerRef}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
