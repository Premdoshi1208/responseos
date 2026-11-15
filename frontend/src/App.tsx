import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Navbar } from './components/shared/Navbar';
import { HomePage } from './pages/HomePage';
import { CallerPage } from './pages/CallerPage';
import { OperatorPage } from './pages/OperatorPage';
import { HistoryPage } from './pages/HistoryPage';

export const App: React.FC = () => {
  return (
    <div className="min-h-screen bg-midnight-950 text-slate-100 flex flex-col">
      <Routes>
        <Route
          path="/"
          element={
            <>
              <Navbar />
              <HomePage />
            </>
          }
        />
        <Route
          path="/caller"
          element={
            <>
              <Navbar />
              <CallerPage />
            </>
          }
        />
        <Route path="/operator" element={<OperatorPage />} />
        <Route path="/history" element={<HistoryPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </div>
  );
};

export default App;
