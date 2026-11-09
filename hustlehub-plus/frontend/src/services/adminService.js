import api from './api';



// ---------- Dashboard ----------

export async function getDashboardStats() {
  const response = await api.get('/admin/stats');
  return response.data;
}

// ---------- Users ----------

export async function listUsers(params = {}) {
  const response = await api.get('/admin/users', { params });
  return response.data;
}

export async function getUser(userId) {
  const response = await api.get(`/admin/users/${userId}`);
  return response.data;
}

export async function updateUserRole(userId, role) {
  const response = await api.patch(`/admin/users/${userId}/role`, { role });
  return response.data;
}

export async function updateUserStatus(userId, status) {
  const response = await api.patch(`/admin/users/${userId}/status`, { status });
  return response.data;
}

export async function deleteUser(userId) {
  const response = await api.delete(`/admin/users/${userId}`);
  return response.data;
}

// ---------- Activity ----------

export async function listActivity(params = {}) {
  const response = await api.get('/admin/activity', { params });
  return response.data;
}

export async function getActivityStats() {
  const response = await api.get('/admin/activity/stats');
  return response.data;
}

// ---------- Gigs ----------

export async function listGigs(params = {}) {
  const response = await api.get('/admin/gigs', { params });
  return response.data;
}

export async function updateGigStatus(gigId, status) {
  const response = await api.patch(`/admin/gigs/${gigId}/status`, { status });
  return response.data;
}

export async function deleteGigAdmin(gigId) {
  const response = await api.delete(`/admin/gigs/${gigId}`);
  return response.data;
}

// ---------- Bookings ----------

export async function listBookings(params = {}) {
  const response = await api.get('/admin/bookings', { params });
  return response.data;
}

export async function updateBookingStatusAdmin(bookingId, status) {
  const response = await api.put(`/admin/bookings/${bookingId}/status`, { status });
  return response.data;
}

export async function deleteBookingAdmin(bookingId) {
  const response = await api.delete(`/admin/bookings/${bookingId}`);
  return response.data;
}