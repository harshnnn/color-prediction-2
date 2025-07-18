import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import GameBoard from './components/GameBoard';
import LoginPage from './components/LoginPage';
import DepositPage from './components/DepositPage';
import WithdrawalPage from './components/WithdrawalPage';
import { AuthProvider, useAuth } from './context/AuthContext';
import './App.css';
import Transactions from './components/Transactions';
import ChangePassword from './components/ChangePassword';

// Protected route component
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#111827] to-[#1f2937]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-[#111827] to-[#1f2937]">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-blue-500"></div>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />} />
        <Route path="/" element={
          <ProtectedRoute>
            <GameBoard />
          </ProtectedRoute>
        } />
        <Route path="/Deposit" element={
          <ProtectedRoute>
            <DepositPage />
          </ProtectedRoute>
        } />
        <Route path="/Withdrawl" element={
          <ProtectedRoute>
            <WithdrawalPage />
          </ProtectedRoute>
        } />
        <Route path ="/transactions" element={
          <ProtectedRoute>
           <Transactions/>
          </ProtectedRoute>
        }/>
        <Route path="/change-password" element={
          <ProtectedRoute>
            <ChangePassword />
          </ProtectedRoute>
        } />
      </Routes>
    </Router>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
