import { Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Login from './pages/Login';
import Register from './pages/Register';
import Gigs from './pages/Gigs';
import GigDetail from './pages/GigDetail';
import EditGig from './pages/EditGig';
import BookingSuccess from './pages/BookingSuccess';
import Bookings from './pages/Bookings';
import Dashboard from './pages/Dashboard';
import MyGigs from './pages/MyGigs';
import CreateGig from './pages/CreateGig';
import FreelancerBookings from './pages/FreelancerBookings';
import Income from './pages/Income';
import NotFound from './pages/NotFound';

import AdminLayout from './pages/admin/AdminLayout';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminUserDetail from './pages/admin/AdminUserDetail';
import AdminActivity from './pages/admin/AdminActivity';
import AdminGigs from './pages/admin/AdminGigs';
import AdminBookings from './pages/admin/AdminBookings';

function App() {
  return (
    <>
      <Navbar />
      <ErrorBoundary>
        <Routes>
          {/* Public */}
          <Route path="/" element={<Navigate to="/gigs" replace />} />
          <Route path="/gigs" element={<Gigs />} />
          <Route
            path="/gigs/create"
            element={
              <ProtectedRoute requiredRole="freelancer">
                <CreateGig />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gigs/:id/edit"
            element={
              <ProtectedRoute requiredRole="freelancer">
                <EditGig />
              </ProtectedRoute>
            }
          />
          <Route path="/gigs/:id" element={<GigDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* Client + admin */}
          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/booking/success/:id"
            element={
              <ProtectedRoute>
                <BookingSuccess />
              </ProtectedRoute>
            }
          />

          {/* Freelancer + admin */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute requiredRole="freelancer">
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/my-gigs"
            element={
              <ProtectedRoute requiredRole="freelancer">
                <MyGigs />
              </ProtectedRoute>
            }
          />
          <Route
            path="/freelancer-bookings"
            element={
              <ProtectedRoute requiredRole="freelancer">
                <FreelancerBookings />
              </ProtectedRoute>
            }
          />
          <Route
            path="/income"
            element={
              <ProtectedRoute requiredRole="freelancer">
                <Income />
              </ProtectedRoute>
            }
          />

          {/* Admin only. AdminRoute is stricter than ProtectedRoute: it
              requires role === 'admin' exactly, not a superset. The layout
              wraps every admin page so the tab nav appears consistently. */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminLayout />
              </AdminRoute>
            }
          >
            <Route index element={<AdminDashboard />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="users/:id" element={<AdminUserDetail />} />
            <Route path="activity" element={<AdminActivity />} />
            <Route path="gigs" element={<AdminGigs />} />
            <Route path="bookings" element={<AdminBookings />} />
          </Route>

          {/* Explicit 404, plus a catch-all for anything unknown. */}
          <Route path="/not-found" element={<NotFound />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </ErrorBoundary>
    </>
  );
}

export default App;