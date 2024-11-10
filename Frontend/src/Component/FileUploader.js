import React, { useState } from 'react';
import './FileUploader.css';
import { useNavigate } from 'react-router-dom';

const FileUploader = () => {
  const [csvData, setCSVData] = useState([]);
  const [fileName, setFileName] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const handleAnalyze = async () => {
    if (!fileName) {
      setError('Please upload a file first');
      return;
    }

    setIsLoading(true);
    try {
      // Get the file input element
      const fileInput = document.getElementById('csvInput');
      const file = fileInput.files[0];

      if (!file) {
        setError('No file selected');
        setIsLoading(false);
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      // Make API call to Flask backend
      const response = await fetch('http://localhost:5000/api/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      
      // Store the analysis results
      setAnalysisResult(result);
      localStorage.setItem('defectAnalysis', JSON.stringify(result));
      
      // Navigate to dashboard with the results
      navigate('/dashboard');
    } catch (error) {
      console.error('Error during analysis:', error);
      setError(`Analysis failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setFileName(file.name);
      setError(null); // Clear any previous errors
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { data } = processCSV(e.target.result);
          setCSVData(data);
        } catch (error) {
          setError('Error processing CSV file');
          console.error('CSV processing error:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) {
      setFileName(file.name);
      setError(null); // Clear any previous errors
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const { data } = processCSV(e.target.result);
          setCSVData(data);
        } catch (error) {
          setError('Error processing CSV file');
          console.error('CSV processing error:', error);
        }
      };
      reader.readAsText(file);
    }
  };

  const processCSV = (csv) => {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(header => header.trim());
    const data = [];

    for (let i = 1; i < lines.length; i++) {
      if (lines[i].trim() === '') continue;
      const values = lines[i].split(',').map(value => value.trim());
      const row = {};
      headers.forEach((header, index) => {
        row[header] = values[index];
      });
      data.push(row);
    }

    return { headers, data };
  };

  return (
    <div className="container">
      <div className="card">
        <div className="card-header">
          <h1 className="card-title">Steel Plate Defect Classification</h1>
        </div>
        
        <div className="card-content">
          {/* File Upload Area */}
          <div 
            className={`upload-area ${isDragging ? 'dragging' : ''} ${csvData.length > 0 ? 'uploaded' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="file-input"
              id="csvInput"
            />
            <label htmlFor="csvInput" className="upload-label">
              <div className="upload-icon">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
              </div>
              <span className="upload-text">
                {fileName ? fileName : 'Drop CSV file here or click to upload'}
              </span>
              {fileName && !isLoading && (
                <span className="success-text">✓ File uploaded successfully</span>
              )}
            </label>
          </div>

          {/* Error Message */}
          {error && (
            <div className="error-message" style={{ color: 'red', marginTop: '1rem', textAlign: 'center' }}>
              {error}
            </div>
          )}

          {/* Loading Animation */}
          {isLoading && (
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p className="loading-text">Processing data...</p>
            </div>
          )}

          {/* Data Table */}
          {!isLoading && csvData.length > 0 && (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    {Object.keys(csvData[0]).map((header) => (
                      <th key={header}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {csvData.map((row, index) => (
                    <tr key={index}>
                      {Object.values(row).map((value, i) => (
                        <td key={i}>{value}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleAnalyze}
            disabled={csvData.length === 0 || isLoading}
            className="submit-button"
          >
            <svg className="button-icon" xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 3h18v18H3z"/>
              <path d="M3 9h18"/>
              <path d="M3 15h18"/>
              <path d="M9 3v18"/>
              <path d="M15 3v18"/>
            </svg>
            Analyze Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;