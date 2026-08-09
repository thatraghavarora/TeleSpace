import { Navigate, Route, Routes } from "react-router-dom";
import Dashboard from "./pages/Dashboard.jsx";
import Debug from "./pages/Debug.jsx";
import LandingPage from "./pages/LandingPage.jsx";
import Login from "./pages/Login.jsx";
import Verify from "./pages/Verify.jsx";
import { useAuthStore } from "./store/authStore.js";

function ProtectedRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  return token ? children : <Navigate to="/login" replace />;
}

function PublicOnlyRoute({ children }) {
  const token = useAuthStore((state) => state.token);
  return token ? <Navigate to="/dashboard" replace /> : children;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
      <Route path="/debug" element={<Debug />} />
      <Route path="/verify" element={<PublicOnlyRoute><Verify /></PublicOnlyRoute>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
