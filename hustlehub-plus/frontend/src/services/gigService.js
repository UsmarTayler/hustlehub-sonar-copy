import api from './api';


export async function getAllGigs(category) {
  const config = category ? { params: { category } } : undefined;
  const response = await api.get('/gigs', config);
  return response.data;
}

export async function getGigById(gigId) {
  const response = await api.get(`/gigs/${gigId}`);
  return response.data;
}

export async function getMyGigs() {
  const response = await api.get('/gigs/my-gigs');
  return response.data;
}

export async function createGig(gigData) {
  const response = await api.post('/gigs', gigData);
  return response.data;
}

export async function updateGig(gigId, updateData) {
  const response = await api.put(`/gigs/${gigId}`, updateData);
  return response.data;
}

export async function deleteGig(gigId) {
  const response = await api.delete(`/gigs/${gigId}`);
  return response.data;
}


export async function createBooking(bookingData) {
  const payload =
    typeof bookingData === 'string' ? { gigId: bookingData } : bookingData;
  const response = await api.post('/bookings', payload);
  return response.data;
}

export async function getMyBookings() {
  const response = await api.get('/bookings/my-bookings');
  return response.data;
}

export async function getFreelancerBookings() {
  const response = await api.get('/bookings/freelancer-bookings');
  return response.data;
}

export async function getBookingById(bookingId) {
  const response = await api.get(`/bookings/${bookingId}`);
  return response.data;
}

export async function updateBookingStatus(bookingId, status) {
  const response = await api.put(`/bookings/${bookingId}/status`, { status });
  return response.data;
}