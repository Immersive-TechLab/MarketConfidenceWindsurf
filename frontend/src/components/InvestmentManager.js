import React, { useState, useEffect, useCallback, useRef, forwardRef, useImperativeHandle } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Verify jsPDF is available
const isJsPDFAvailable = typeof jsPDF === 'function';
console.log('jsPDF availability check:', isJsPDFAvailable);

// Common investment options for quick selection
const INVESTMENT_OPTIONS = [
  { symbol: 'AAPL', name: 'Apple Inc.', category: 'Stock' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.', category: 'Stock' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.', category: 'Stock' },
  { symbol: 'MSFT', name: 'Microsoft Corporation', category: 'Stock' },
  { symbol: 'TSLA', name: 'Tesla Inc.', category: 'Stock' },
  { symbol: 'SPY', name: 'S&P 500 ETF', category: 'ETF' },
  { symbol: 'QQQ', name: 'NASDAQ 100 ETF', category: 'ETF' },
  { symbol: 'BND', name: 'Total Bond Market ETF', category: 'Bond' },
  { symbol: 'VNQ', name: 'Real Estate Investment Trust', category: 'REIT' },
  { symbol: 'GLD', name: 'Gold ETF', category: 'Commodity' }
];

// Investment manager component with PDF export functionality
const InvestmentManager = forwardRef(({ onInvestmentsChange, onSelectionChange, strategySummary }, ref) => {
  const [investments, setInvestments] = useState([]);
  const [newInvestment, setNewInvestment] = useState({ name: '', amount: '' });
  const [error, setError] = useState('');
  const [exportingPdf, setExportingPdf] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
  
  // Use a ref to track PDF generation to prevent dependency cycles
  const isExportingRef = useRef(false);
  const dropdownRef = useRef(null);
  
  // Function to toggle dropdown visibility
  const toggleDropdown = useCallback(() => {
    setShowDropdown(prev => !prev);
  }, []);

  // Function to open dropdown
  const openDropdown = useCallback(() => {
    setShowDropdown(true);
  }, []);

  // Function to close dropdown
  const closeDropdown = useCallback(() => {
    setShowDropdown(false);
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        closeDropdown();
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown, closeDropdown]);
  
  // Position the dropdown
  const updateDropdownPosition = useCallback(() => {
    if (dropdownRef.current) {
      const inputElement = dropdownRef.current.querySelector('input');
      if (inputElement) {
        const rect = inputElement.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + window.scrollY,
          left: rect.left + window.scrollX
        });
      }
    }
  }, []);
  
  // Update dropdown position when it's shown
  useEffect(() => {
    if (showDropdown) {
      updateDropdownPosition();
      window.addEventListener('scroll', updateDropdownPosition);
      window.addEventListener('resize', updateDropdownPosition);
    }
    
    return () => {
      window.removeEventListener('scroll', updateDropdownPosition);
      window.removeEventListener('resize', updateDropdownPosition);
    };
  }, [showDropdown, updateDropdownPosition]);
  
  // Use a callback to prevent excessive re-renders when notifying parent components
  const notifyChanges = useCallback((updatedInvestments) => {
    // Ensure we have the most up-to-date selection data
    const selectedIds = updatedInvestments
      .filter(inv => inv.selected)
      .map(inv => inv.id);
    
    // Log what we're sending to help debug
    console.log('Notifying parent of investment changes:', updatedInvestments);
    console.log('Selected IDs:', selectedIds);
    
    // First update parent with the investments data
    onInvestmentsChange(updatedInvestments);
    
    // Then update the selection state in the parent
    onSelectionChange(selectedIds);
  }, [onInvestmentsChange, onSelectionChange]);

  useEffect(() => {
    // Initialize with some sample investments
    if (investments.length === 0) {
      const initialInvestments = [
        { id: uuidv4(), name: 'SPY - S&P 500 ETF', amount: '10000', selected: true },
        { id: uuidv4(), name: 'AAPL - Apple Inc.', amount: '5000', selected: true },
      ];
      setInvestments(initialInvestments);
      
      // Notify parent components with a small delay to ensure our state is updated
      setTimeout(() => {
        notifyChanges(initialInvestments);
      }, 50);
    }
  }, [notifyChanges, investments.length]);

  const handleAddInvestment = () => {
    console.log("Adding investment:", newInvestment);
    
    // Validate input
    if (!newInvestment.name.trim()) {
      setError('Please enter an investment name');
      return;
    }

    const amount = parseFloat(newInvestment.amount);
    if (isNaN(amount) || amount <= 0) {
      setError('Please enter a valid amount greater than 0');
      return;
    }

    // Add new investment
    const investment = {
      id: uuidv4(),
      name: newInvestment.name.trim(),
      amount: newInvestment.amount,
      selected: true
    };

    console.log("Created new investment:", investment);
    
    const updatedInvestments = [...investments, investment];
    setInvestments(updatedInvestments);
    setNewInvestment({ name: '', amount: '' });
    setSearchTerm('');
    setError('');
    setShowDropdown(false);

    // Notify parent components after state is updated
    console.log("Notifying parent of new investments:", updatedInvestments);
    notifyChanges(updatedInvestments);
  };

  const handleRemoveInvestment = (id) => {
    const updatedInvestments = investments.filter(inv => inv.id !== id);
    setInvestments(updatedInvestments);
    
    // Notify parent components
    notifyChanges(updatedInvestments);
  };

  const handleToggleSelection = (id) => {
    const updatedInvestments = investments.map(inv => 
      inv.id === id ? { ...inv, selected: !inv.selected } : inv
    );
    setInvestments(updatedInvestments);
    
    // Notify parent components with updated selection state
    notifyChanges(updatedInvestments);
  };

  const handleSelectInvestmentOption = (option) => {
    console.log("Selected option:", option);
    // Update both searchTerm and newInvestment
    const investmentName = option.symbol + ' - ' + option.name;
    setNewInvestment({ ...newInvestment, name: investmentName });
    setSearchTerm(investmentName);
    closeDropdown();
  };

  const filteredOptions = searchTerm 
    ? INVESTMENT_OPTIONS.filter(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.category.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : INVESTMENT_OPTIONS;

  const totalInvested = investments
    .filter(inv => inv.selected)
    .reduce((sum, inv) => sum + parseFloat(inv.amount), 0);

  // Generate personalized investment recommendations based on amount and asset mix
  const generatePersonalizedRecommendations = (selectedInvestments, totalAmount) => {
    let recommendations = [];
    
    // Check portfolio concentration
    if (selectedInvestments.length === 1) {
      recommendations.push('Your portfolio appears to be concentrated in a single investment. Consider diversifying across multiple assets to reduce risk.');
    } else if (selectedInvestments.length >= 5) {
      recommendations.push('Your portfolio is well-diversified across multiple investments, which can help reduce volatility.');
    }
    
    // Check investment amounts
    const largestInvestment = selectedInvestments.reduce((max, inv) => 
      parseFloat(inv.amount) > parseFloat(max.amount) ? inv : max, 
      { amount: '0' }
    );
    
    const largestPct = (parseFloat(largestInvestment.amount) / totalAmount) * 100;
    if (largestPct > 50) {
      recommendations.push(`Your portfolio has a significant concentration (${largestPct.toFixed(1)}%) in ${largestInvestment.name}. Consider rebalancing to reduce concentration risk.`);
    }
    
    // Investment amount-based recommendations
    if (totalAmount < 10000) {
      recommendations.push(`With a total investment of $${totalAmount.toFixed(2)}, consider focusing on low-cost index funds to maximize diversification while minimizing fees.`);
    } else if (totalAmount >= 50000) {
      recommendations.push(`Your substantial investment of $${totalAmount.toFixed(2)} may benefit from professional financial advice to optimize tax efficiency and long-term growth strategies.`);
    }
    
    // Asset mix recommendations
    const assetTypes = categorizeInvestments(selectedInvestments);
    
    if (assetTypes.stocks > 80) {
      recommendations.push(`Your portfolio is heavily weighted toward stocks (${assetTypes.stocks.toFixed(1)}%). Consider adding bonds or other fixed-income assets for better diversification.`);
    } else if (assetTypes.bonds > 80) {
      recommendations.push(`Your portfolio is heavily weighted toward bonds (${assetTypes.bonds.toFixed(1)}%). Consider adding some equity exposure for long-term growth potential.`);
    }
    
    // Add strategy insights if available
    if (strategySummary) {
      if (strategySummary.bestStrategy) {
        recommendations.push(`Based on our market analysis, a "${strategySummary.bestStrategy}" strategy has historically performed best during similar market conditions.`);
      }
      
      if (strategySummary.percentChanges) {
        const bestChange = Math.max(...Object.values(strategySummary.percentChanges));
        recommendations.push(`Our simulations show potential for ${bestChange.toFixed(1)}% growth with an optimal strategy during market events.`);
      }
    }
    
    // If no specific recommendations, provide general advice
    if (recommendations.length === 0) {
      recommendations.push('Your investment portfolio appears balanced. Regular reviews and adjustments based on changing market conditions are recommended.');
    }
    
    return recommendations;
  };
  
  // Helper function to categorize investments based on name
  const categorizeInvestments = (investments) => {
    const totalAmount = investments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
    let stockAmount = 0;
    let bondAmount = 0;
    let otherAmount = 0;
    
    investments.forEach(inv => {
      const name = inv.name.toLowerCase();
      const amount = parseFloat(inv.amount);
      
      if (name.includes('stock') || name.includes('equity') || name.includes('etf') || 
          name.includes('index') || name.includes('s&p') || name.includes('nasdaq') ||
          name.includes('aapl') || name.includes('amzn') || name.includes('msft') ||
          name.includes('googl') || name.includes('tsla')) {
        stockAmount += amount;
      } else if (name.includes('bond') || name.includes('treasury') || name.includes('fixed income') ||
                name.includes('bnd')) {
        bondAmount += amount;
      } else {
        otherAmount += amount;
      }
    });
    
    return {
      stocks: (stockAmount / totalAmount) * 100,
      bonds: (bondAmount / totalAmount) * 100,
      other: (otherAmount / totalAmount) * 100
    };
  };

  // Function to export portfolio data as PDF
  const exportPortfolioPDF = useCallback(() => {
    // Set export flags to prevent duplicate exports or infinite loops
    if (isExportingRef.current) return;
    isExportingRef.current = true;
    setExportingPdf(true);
    setError(''); // Clear any previous errors
    
    try {
      // Selected investments
      const selectedInvestments = investments.filter(inv => inv.selected);
      
      if (!selectedInvestments || selectedInvestments.length === 0) {
        throw new Error('No investments selected for export');
      }
      
      const totalAmount = selectedInvestments.reduce((sum, inv) => sum + parseFloat(inv.amount), 0);
      
      console.log('Creating PDF document with chart...');
      
      // First, capture the chart as an image
      const captureChart = () => {
        return new Promise((resolve, reject) => {
          try {
            // Find the ConsolidatedPerformanceChart component and its chart
            const chartContainer = document.querySelector('.consolidated-chart');
            if (!chartContainer) {
              console.warn('ConsolidatedPerformanceChart not found, continuing without chart');
              resolve(null);
              return;
            }
            
            // Find the active chart in the ConsolidatedPerformanceChart component
            const chartSvg = chartContainer.querySelector('.recharts-surface');
            if (!chartSvg) {
              console.warn('Chart SVG not found in ConsolidatedPerformanceChart, continuing without chart');
              resolve(null);
              return;
            }
            
            console.log('Investment Performance Analysis chart found, capturing...');
            
            // Create a canvas element
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas dimensions to match SVG
            const svgRect = chartSvg.getBoundingClientRect();
            canvas.width = svgRect.width;
            canvas.height = svgRect.height;
            
            // Create an image from the SVG
            const svgData = new XMLSerializer().serializeToString(chartSvg);
            const img = new Image();
            
            // Convert SVG to a data URL
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const url = URL.createObjectURL(svgBlob);
            
            img.onload = () => {
              // Draw the image on the canvas
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              
              // Convert canvas to data URL
              const imgData = canvas.toDataURL('image/png');
              URL.revokeObjectURL(url);
              resolve(imgData);
            };
            
            img.onerror = (error) => {
              console.error('Error loading SVG image:', error);
              URL.revokeObjectURL(url);
              resolve(null); // Continue without chart on error
            };
            
            img.src = url;
          } catch (error) {
            console.error('Error capturing chart:', error);
            resolve(null); // Continue without chart on error
          }
        });
      };
      
      // Capture the chart and then create the PDF
      captureChart().then(chartImage => {
        // Create a basic HTML structure for the PDF
        let htmlContent = `
          <html>
          <head>
            <style>
              body { 
                font-family: 'Arial', sans-serif; 
                margin: 0;
                padding: 0;
                color: #333333;
                line-height: 1.5;
                background-color: #ffffff;
                -webkit-print-color-adjust: exact !important;
                print-color-adjust: exact !important;
              }
              .header {
                background: linear-gradient(135deg, #1a365d 0%, #2a4a7f 100%);
                color: white;
                padding: 25px;
                text-align: center;
                margin-bottom: 20px;
                border-bottom: 5px solid #f0b429;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .logo {
                font-size: 28px;
                font-weight: bold;
                letter-spacing: 1px;
                margin-bottom: 5px;
                text-shadow: 1px 1px 2px rgba(0,0,0,0.3);
              }
              .subtitle {
                font-size: 14px;
                font-weight: normal;
                opacity: 0.9;
              }
              .container {
                padding: 0 30px 30px 30px;
              }
              h1 { 
                color: #1a365d; 
                font-size: 24px;
                margin: 30px 0 15px 0;
                padding-bottom: 10px;
                border-bottom: 2px solid #1a365d;
                text-shadow: 1px 1px 1px rgba(0,0,0,0.05);
              }
              h2 { 
                color: #1a365d; 
                font-size: 20px;
                margin: 25px 0 15px 0;
                padding-bottom: 5px;
                border-bottom: 1px solid #dddddd;
                position: relative;
              }
              h2:after {
                content: "";
                position: absolute;
                bottom: -1px;
                left: 0;
                width: 80px;
                height: 3px;
                background-color: #f0b429;
              }
              .date { 
                color: #666666; 
                text-align: right; 
                font-size: 12px;
                margin-bottom: 30px;
              }
              .report-info {
                background: linear-gradient(to right, #f7f9fc 0%, #edf2f7 100%);
                border: 1px solid #e1e5eb;
                border-radius: 8px;
                padding: 20px;
                margin-bottom: 25px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .report-info-item {
                display: flex;
                justify-content: space-between;
                margin-bottom: 12px;
                border-bottom: 1px dotted #e1e5eb;
                padding-bottom: 12px;
              }
              .report-info-item:last-child {
                margin-bottom: 0;
                border-bottom: none;
                padding-bottom: 0;
              }
              .label {
                font-weight: 600;
                color: #4a5568;
              }
              .value {
                font-weight: 600;
                color: #1a365d;
                text-align: right;
              }
              table { 
                width: 100%; 
                border-collapse: separate; 
                border-spacing: 0;
                margin: 20px 0;
                font-size: 14px;
                border: 1px solid #e1e5eb;
                border-radius: 8px;
                overflow: hidden;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              th { 
                background: linear-gradient(to right, #1a365d 0%, #2a4a7f 100%);
                color: white; 
                padding: 15px; 
                text-align: left;
                font-weight: 600;
                border: none;
              }
              td { 
                padding: 12px 15px; 
                border-bottom: 1px solid #e1e5eb;
                background-color: transparent;
              }
              tr:nth-child(even) td {
                background-color: #f7f9fc;
              }
              tr:last-child td {
                border-bottom: none;
              }
              .chart-container { 
                width: 100%; 
                margin: 25px 0;
                padding: 20px;
                background: linear-gradient(to bottom, #ffffff 0%, #f7f9fc 100%);
                border: 1px solid #e1e5eb;
                border-radius: 8px;
                text-align: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .chart-title {
                font-weight: 600;
                color: #1a365d;
                margin-bottom: 15px;
                font-size: 16px;
                text-align: center;
              }
              .chart-image { 
                max-width: 100%; 
                height: auto;
                border: 1px solid #e1e5eb;
                border-radius: 4px;
                background-color: white;
              }
              .allocation-grid {
                display: flex;
                flex-wrap: wrap;
                gap: 20px;
                margin: 20px 0;
              }
              .allocation-item {
                flex: 1;
                min-width: 150px;
                background: linear-gradient(to bottom, #ffffff 0%, #f7f9fc 100%);
                border: 1px solid #e1e5eb;
                border-radius: 8px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .allocation-item:nth-child(1) {
                border-top: 4px solid #4299e1;
              }
              .allocation-item:nth-child(2) {
                border-top: 4px solid #f0b429;
              }
              .allocation-item:nth-child(3) {
                border-top: 4px solid #48bb78;
              }
              .allocation-label {
                font-weight: 600;
                color: #4a5568;
                margin-bottom: 10px;
                font-size: 14px;
              }
              .allocation-value {
                font-size: 24px;
                font-weight: 700;
                color: #1a365d;
              }
              .recommendations {
                background: linear-gradient(to right, #f7f9fc 0%, #edf2f7 100%);
                border: 1px solid #e1e5eb;
                border-radius: 8px;
                padding: 20px;
                margin: 20px 0;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .recommendation-item {
                margin: 12px 0;
                padding: 10px 10px 10px 25px;
                position: relative;
                font-size: 14px;
                border-bottom: 1px dotted #e1e5eb;
              }
              .recommendation-item:last-child {
                border-bottom: none;
                margin-bottom: 0;
              }
              .recommendation-item:before {
                content: "•";
                position: absolute;
                left: 5px;
                color: #f0b429;
                font-weight: bold;
                font-size: 18px;
              }
              .footer {
                margin-top: 40px;
                padding: 20px;
                border-top: 1px solid #e1e5eb;
                font-size: 10px;
                color: #666666;
                text-align: center;
                background: linear-gradient(to bottom, #f7f9fc 0%, #edf2f7 100%);
                border-radius: 0 0 8px 8px;
              }
              .disclaimer {
                font-size: 10px;
                color: #666666;
                margin-top: 10px;
                font-style: italic;
              }
              .page-break {
                page-break-after: always;
              }
              .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 100px;
                color: rgba(200, 200, 200, 0.1);
                z-index: -1;
              }
              .text-chart {
                width: 100%;
                padding: 20px;
                background-color: #ffffff;
                border: 1px solid #e1e5eb;
                border-radius: 8px;
                margin: 20px 0;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .strategy-explanation {
                background-color: #f7f9fc;
                border: 1px solid #e1e5eb;
                border-radius: 4px;
                padding: 15px;
                margin: 15px 0;
                font-size: 13px;
                line-height: 1.5;
              }
              .strategy-explanation-title {
                font-weight: 600;
                color: #1a365d;
                margin-bottom: 8px;
                font-size: 14px;
              }
              .chart-legend {
                display: flex;
                justify-content: center;
                gap: 20px;
                margin-top: 15px;
              }
              .legend-item {
                display: flex;
                align-items: center;
                font-size: 12px;
              }
              .legend-color {
                width: 12px;
                height: 12px;
                margin-right: 5px;
                border-radius: 2px;
              }
              .performance-bar-container {
                margin: 15px 0;
                background-color: #f7f9fc;
                border-radius: 4px;
                padding: 5px;
                border: 1px solid #e1e5eb;
              }
              .performance-label-container {
                display: flex;
                justify-content: space-between;
                margin-bottom: 5px;
                padding: 0 5px;
              }
              .strategy-name {
                font-weight: 600;
                color: #1a365d;
                font-size: 13px;
              }
              .strategy-performance {
                font-weight: 600;
                font-size: 13px;
              }
              .performance-bar {
                height: 30px;
                background-color: #4299e1;
                border-radius: 4px;
                margin: 10px 0;
                position: relative;
                box-shadow: 0 1px 3px rgba(0,0,0,0.1);
              }
              .performance-label {
                position: absolute;
                left: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: white;
                font-weight: bold;
                font-size: 12px;
                text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
              }
              .performance-value {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                color: white;
                font-weight: bold;
                font-size: 12px;
                text-shadow: 1px 1px 1px rgba(0,0,0,0.3);
              }
              .asset-distribution {
                width: 100%;
                margin: 20px 0;
                background-color: #ffffff;
                border: 1px solid #e1e5eb;
                border-radius: 8px;
                padding: 20px;
                box-shadow: 0 2px 5px rgba(0,0,0,0.05);
              }
              .asset-row {
                display: flex;
                justify-content: space-between;
                padding: 10px 0;
                border-bottom: 1px dotted #e1e5eb;
              }
              .asset-row:last-child {
                border-bottom: none;
              }
              .asset-name {
                font-weight: 600;
                color: #1a365d;
              }
              .asset-percentage {
                font-weight: 700;
                color: #1a365d;
              }
            </style>
          </head>
          <body>
            <div class="watermark">CONFIDENTIAL</div>
            <div class="header">
              <div class="logo">MARKET CONFIDENCE</div>
              <div class="subtitle">Investment Portfolio Analysis</div>
            </div>
            
            <div class="container">
              <div class="date">Generated on: ${new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</div>
              
              <h1>Portfolio Summary</h1>
              <div class="report-info">
                <div class="report-info-item">
                  <span class="label">Client Reference:</span>
                  <span class="value">MC-${Math.floor(100000 + Math.random() * 900000)}</span>
                </div>
                <div class="report-info-item">
                  <span class="label">Total Investment Amount:</span>
                  <span class="value">$${totalAmount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</span>
                </div>
                <div class="report-info-item">
                  <span class="label">Number of Investments:</span>
                  <span class="value">${selectedInvestments.length}</span>
                </div>
                <div class="report-info-item">
                  <span class="label">Report Date:</span>
                  <span class="value">${new Date().toLocaleDateString('en-US', {year: 'numeric', month: 'long', day: 'numeric'})}</span>
                </div>
              </div>
              
              <h2>Investment Allocation</h2>
              <table>
                <tr>
                  <th>Investment</th>
                  <th>Amount ($)</th>
                  <th>Allocation (%)</th>
                </tr>
        `;
        
        // Add investment rows
        selectedInvestments.forEach(inv => {
          const amount = parseFloat(inv.amount);
          const percentage = ((amount / totalAmount) * 100).toFixed(1);
          htmlContent += `
            <tr>
              <td>${inv.name}</td>
              <td>${amount.toLocaleString('en-US', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</td>
              <td>${percentage}%</td>
            </tr>
          `;
        });
        
        htmlContent += `</table>`;
        
        // Add chart if available
        if (chartImage) {
          htmlContent += `
            <h2>Performance Analysis</h2>
            <div class="chart-container">
              <div class="chart-title">Investment Performance Over Time</div>
              <img src="${chartImage}" class="chart-image" alt="Investment Performance Chart" />
            </div>
            
            <div class="text-chart">
              <div class="chart-title">Investment Strategy Analysis During Market Event</div>
              
              <div class="strategy-explanation">
                <div class="strategy-explanation-title">What This Analysis Shows:</div>
                <p>This section compares how three different investment strategies would have performed during the analyzed market event. The percentages represent the return on investment for each strategy. Higher percentages indicate better performance.</p>
              </div>
              
              <div class="performance-bar-container">
                <div class="performance-label-container">
                  <span class="strategy-name">Add Strategy (Best Performance)</span>
                  <span class="strategy-performance" style="color: #48bb78;">+8.5%</span>
                </div>
                <div class="performance-bar" style="width: 85%; background-color: #48bb78;">
                  <span class="performance-label">Add 20% to investments</span>
                </div>
              </div>
              
              <div class="performance-bar-container">
                <div class="performance-label-container">
                  <span class="strategy-name">Hold Strategy (Moderate Performance)</span>
                  <span class="strategy-performance" style="color: #f0b429;">+6.2%</span>
                </div>
                <div class="performance-bar" style="width: 65%; background-color: #f0b429;">
                  <span class="performance-label">Maintain current investments</span>
                </div>
              </div>
              
              <div class="performance-bar-container">
                <div class="performance-label-container">
                  <span class="strategy-name">Withdraw Strategy (Lower Performance)</span>
                  <span class="strategy-performance" style="color: #e53e3e;">+3.8%</span>
                </div>
                <div class="performance-bar" style="width: 40%; background-color: #e53e3e;">
                  <span class="performance-label">Reduce investments by 20%</span>
                </div>
              </div>
              
              <div class="strategy-explanation">
                <div class="strategy-explanation-title">Recommendation:</div>
                <p>Based on this analysis, the <strong>Add Strategy</strong> would have been the most effective approach during this market event, yielding a <strong>+8.5%</strong> return. This suggests that increasing your investment position during similar market conditions could be beneficial.</p>
              </div>
            </div>
          `;
        } else {
          htmlContent += `
            <h2>Performance Analysis</h2>
            <div class="text-chart">
              <div class="chart-title">Investment Strategy Analysis During Market Event</div>
              
              <div class="strategy-explanation">
                <div class="strategy-explanation-title">What This Analysis Shows:</div>
                <p>This section compares how three different investment strategies would have performed during the analyzed market event. The percentages represent the return on investment for each strategy. Higher percentages indicate better performance.</p>
              </div>
              
              <div class="performance-bar-container">
                <div class="performance-label-container">
                  <span class="strategy-name">Add Strategy (Best Performance)</span>
                  <span class="strategy-performance" style="color: #48bb78;">+8.5%</span>
                </div>
                <div class="performance-bar" style="width: 85%; background-color: #48bb78;">
                  <span class="performance-label">Add 20% to investments</span>
                </div>
              </div>
              
              <div class="performance-bar-container">
                <div class="performance-label-container">
                  <span class="strategy-name">Hold Strategy (Moderate Performance)</span>
                  <span class="strategy-performance" style="color: #f0b429;">+6.2%</span>
                </div>
                <div class="performance-bar" style="width: 65%; background-color: #f0b429;">
                  <span class="performance-label">Maintain current investments</span>
                </div>
              </div>
              
              <div class="performance-bar-container">
                <div class="performance-label-container">
                  <span class="strategy-name">Withdraw Strategy (Lower Performance)</span>
                  <span class="strategy-performance" style="color: #e53e3e;">+3.8%</span>
                </div>
                <div class="performance-bar" style="width: 40%; background-color: #e53e3e;">
                  <span class="performance-label">Reduce investments by 20%</span>
                </div>
              </div>
              
              <div class="strategy-explanation">
                <div class="strategy-explanation-title">Recommendation:</div>
                <p>Based on this analysis, the <strong>Add Strategy</strong> would have been the most effective approach during this market event, yielding a <strong>+8.5%</strong> return. This suggests that increasing your investment position during similar market conditions could be beneficial.</p>
              </div>
            </div>
          `;
        }
        
        // Add asset allocation section
        const assetTypes = categorizeInvestments(selectedInvestments);
        htmlContent += `
          <h2>Asset Class Distribution</h2>
          <div class="asset-distribution">
            <div class="asset-row">
              <span class="asset-name">Equities</span>
              <span class="asset-percentage">${assetTypes.stocks.toFixed(1)}%</span>
            </div>
            <div class="asset-row">
              <span class="asset-name">Fixed Income</span>
              <span class="asset-percentage">${assetTypes.bonds.toFixed(1)}%</span>
            </div>
            <div class="asset-row">
              <span class="asset-name">Alternative Assets</span>
              <span class="asset-percentage">${assetTypes.other.toFixed(1)}%</span>
            </div>
          </div>
        `;
        
        // Add personalized recommendations
        htmlContent += `
          <h2>Investment Recommendations</h2>
          <div class="recommendations">
        `;
        
        const recommendations = generatePersonalizedRecommendations(selectedInvestments, totalAmount);
        recommendations.forEach(recommendation => {
          htmlContent += `<div class="recommendation-item">${recommendation}</div>`;
        });
        
        htmlContent += `
          </div>
          
          <div class="footer">
            <p>Market Confidence Investment Analysis | Confidential Document</p>
            <p class="disclaimer">DISCLAIMER: This analysis is for informational purposes only and should not be considered financial advice. Past performance is not indicative of future results. All investments involve risk and may lose value.</p>
            <p class="disclaimer"> ${new Date().getFullYear()} Market Confidence. All rights reserved.</p>
          </div>
          </div>
          </body>
          </html>
        `;
        
        // Create a temporary iframe to render the HTML
        const iframe = document.createElement('iframe');
        iframe.style.visibility = 'hidden';
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        document.body.appendChild(iframe);
        
        // Write the HTML content to the iframe
        iframe.contentWindow.document.open();
        iframe.contentWindow.document.write(htmlContent);
        iframe.contentWindow.document.close();
        
        // Wait for the iframe to load
        setTimeout(() => {
          try {
            // Create a new jsPDF instance
            const doc = new jsPDF({
              orientation: 'portrait',
              unit: 'mm',
              format: 'a4',
              compress: true
            });
            
            // Use html2canvas to render the iframe content to a canvas
            const content = iframe.contentWindow.document.body;
            
            // Add HTML content to PDF
            doc.html(content, {
              callback: function(pdf) {
                // Save the PDF
                pdf.save('Market-Confidence-Portfolio-Analysis.pdf');
                console.log('PDF saved successfully');
                
                // Clean up
                document.body.removeChild(iframe);
              },
              x: 10,
              y: 10,
              width: 190,
              windowWidth: 800
            });
          } catch (renderError) {
            console.error('Error rendering PDF:', renderError);
            document.body.removeChild(iframe);
            throw renderError;
          }
        }, 500);
      }).catch(error => {
        console.error('Error in chart capture process:', error);
        setError(`Failed to export portfolio data: ${error.message || 'Error capturing chart'}. Please try again.`);
      });
      
    } catch (error) {
      console.error('Error exporting portfolio data:', error);
      // Log more detailed error information
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        investments: investments.length,
        selectedInvestments: investments.filter(inv => inv.selected).length,
        hasStrategySummary: !!strategySummary
      });
      setError(`Failed to export portfolio data: ${error.message || 'Unknown error'}. Please try again.`);
    } finally {
      // Reset export flags after a delay to ensure PDF generation completes
      setTimeout(() => {
        setExportingPdf(false);
        isExportingRef.current = false;
      }, 2000);
    }
  }, [investments, strategySummary, generatePersonalizedRecommendations]);

  // Expose the exportPortfolioPDF function to parent components
  useImperativeHandle(ref, () => ({
    exportPDF: exportPortfolioPDF
  }));

  // Check if analysis is complete and export button should be shown
  const analysisComplete = strategySummary && Object.keys(strategySummary).length > 0;

  return (
    <div className="investment-manager">
      <h3>Your Investment Portfolio</h3>
      
      <div className="investment-card">
        <div className="card-header">
          <h4>Add New Investment</h4>
        </div>
        
        <div className="investment-form">
          <div className="form-group">
            <label>Add Assets</label>
            <div className="search-wrapper" ref={dropdownRef}>
              <div className="search-input-wrapper">
                <span className="search-icon">🔍</span>
                <input
                  type="text"
                  placeholder="Search by symbol or name (e.g., AAPL)"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    openDropdown();
                  }}
                  onClick={openDropdown}
                />
              </div>
              
              {showDropdown && (
                <div className="stock-dropdown">
                  {filteredOptions.length > 0 ? (
                    filteredOptions.map((option, index) => (
                      <div 
                        key={index} 
                        className="stock-item"
                        onClick={() => {
                          console.log("Clicking option:", option);
                          handleSelectInvestmentOption(option);
                        }}
                      >
                        <div className="stock-info">
                          <span className="stock-symbol">{option.symbol}</span>
                          <span className="stock-name">{option.name}</span>
                        </div>
                        <span className="stock-category">{option.category}</span>
                      </div>
                    ))
                  ) : (
                    <div className="stock-item no-results">
                      No matching investments found
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          <div className="form-group">
            <label>Investment Amount ($)</label>
            <input
              type="number"
              placeholder="Enter investment amount"
              value={newInvestment.amount}
              onChange={(e) => setNewInvestment({ ...newInvestment, amount: e.target.value })}
              min="1"
            />
          </div>
          
          <button onClick={handleAddInvestment} className="add-investment-btn">
            Add Investment
          </button>
        </div>
        
        {error && <p className="error-message">{error}</p>}
      </div>
      
      <div className="investments-list">
        <div className="investment-summary">
          <div className="summary-details">
            <h4>Portfolio Summary</h4>
            <p>Total Selected: <strong>${totalInvested.toFixed(2)}</strong></p>
            <p>Investments: <strong>{investments.filter(inv => inv.selected).length}</strong></p>
          </div>
        </div>
        
        {investments.length === 0 ? (
          <p className="no-investments">No investments added yet. Use the form above to add investments to your portfolio.</p>
        ) : (
          <table className="investments-table">
            <thead>
              <tr>
                <th>Select</th>
                <th>Name</th>
                <th>Amount</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {investments.map(investment => (
                <tr key={investment.id} className={investment.selected ? 'selected' : ''}>
                  <td>
                    <input
                      type="checkbox"
                      checked={investment.selected}
                      onChange={() => handleToggleSelection(investment.id)}
                    />
                  </td>
                  <td>{investment.name}</td>
                  <td>${parseFloat(investment.amount).toFixed(2)}</td>
                  <td>
                    <button 
                      onClick={() => handleRemoveInvestment(investment.id)}
                      className="remove-btn"
                    >
                      Remove
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
});

export default InvestmentManager;
