import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import './style.css';

// Vite loads this file from index.html. It creates the React root and renders
// the app component into the <div id="root"></div> element.
createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
