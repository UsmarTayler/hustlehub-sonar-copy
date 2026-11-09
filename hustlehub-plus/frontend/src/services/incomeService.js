import api from './api';


export async function getIncomeSummary() {
  const response = await api.get('/income/summary');
  return response.data;
}


export async function getTransactionHistory() {
  const response = await api.get('/income/transactions');
  return response.data;
}


export async function getIncomeByPeriod(period = 'monthly') {
  const response = await api.get('/income/by-period', { params: { period } });
  return response.data;
}


export async function getTaxEstimation() {
  const response = await api.get('/income/tax-estimation');
  return response.data;
}