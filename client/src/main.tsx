// Client entry point
import React from 'react';
import { createRoot } from 'react-dom/client';
import MMOInterface from './App';
import './App.css';

const container = document.getElementById('root');
if (!container) {
  throw new Error('Root element not found');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <MMOInterface />
  </React.StrictMode>
);
