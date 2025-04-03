# Market Confidence Application

This application allows users to analyze the impact of global events on the MSCI World Index. Users can enter global events (e.g., "COVID-19 pandemic" or "2008 financial crisis") and the application will:

1. Display relevant market data for the time period of the event
2. Generate an analysis of the event's impact on the market
3. Show key metrics including the percent decline and recovery time

## Features

- Interactive chart showing MSCI World Index data
- Event analysis powered by LLM (OpenAI)
- Detailed impact analysis with recovery time metrics
- Modern, responsive UI

## Project Structure

- `/backend`: Python Flask API
- `/frontend`: React.js frontend

## Setup Instructions

### Prerequisites

- Node.js (v14 or later)
- Python (v3.8 or later)
- OpenAI API key

### Backend Setup

1. Navigate to the backend directory:
   ```
   cd backend
   ```

2. Create a virtual environment (optional but recommended):
   ```
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. Install dependencies:
   ```
   pip install -r requirements.txt
   ```

4. Set up your OpenAI API key:
   - Edit the `.env` file and replace `your_openai_api_key_here` with your actual OpenAI API key

5. Start the backend server:
   ```
   python app.py
   ```

### Frontend Setup

1. Navigate to the frontend directory:
   ```
   cd frontend
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Start the development server:
   ```
   npm start
   ```

## Usage

1. The application will open in your browser at http://localhost:3000
2. The default view shows the MSCI World Index for the past 5 years
3. Enter a global event in the input field (e.g., "COVID-19 pandemic", "2008 financial crisis")
4. View the analysis and the market chart adjusted to the relevant time period
5. Use the "Reset to Default View" button to return to the 5-year view

## Note

For full functionality, an OpenAI API key is required. Without an API key, the application will provide limited functionality.

## Technologies Used

- **Backend**: Python, Flask, Pandas, yfinance, OpenAI
- **Frontend**: React, Recharts, Axios
