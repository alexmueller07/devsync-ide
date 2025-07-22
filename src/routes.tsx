import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/Layout';
import Home from './pages/Home';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import FileSystem from './pages/FileSystem';
import Editor from './pages/Editor';
import SharedFiles from './pages/SharedFiles';
import RecentFiles from './pages/RecentFiles';
import StarredFiles from './pages/StarredFiles';
import { useAuth } from './contexts/AuthContext';

// Protected Route component
function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { currentUser } = useAuth();
  return currentUser ? <>{children}</> : <Navigate to="/login" />;
}

export default function AppRoutes() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/editor" element={
          <PrivateRoute>
            <FileSystem />
          </PrivateRoute>
        } />
        <Route path="/files" element={
          <PrivateRoute>
            <FileSystem />
          </PrivateRoute>
        } />
        <Route path="/editor/:fileId" element={
          <PrivateRoute>
            <Editor />
          </PrivateRoute>
        } />
        <Route path="/shared" element={
          <PrivateRoute>
            <SharedFiles />
          </PrivateRoute>
        } />
        <Route path="/recent" element={
          <PrivateRoute>
            <RecentFiles />
          </PrivateRoute>
        } />
        <Route path="/starred" element={
          <PrivateRoute>
            <StarredFiles />
          </PrivateRoute>
        } />
      </Routes>
    </Layout>
  );
} 