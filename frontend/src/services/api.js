import axios from 'axios'

const api = axios.create({
  baseURL: '/api/v1',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Time Series
export const getTimeSeriesPosts = (params) =>
  api.get('/timeseries/posts', { params })

export const getTimeSeriesEngagement = (params) =>
  api.get('/timeseries/engagement', { params })

// Search
export const searchPosts = (data) =>
  api.post('/search', data)

// Network
export const getNetworkGraph = (params) =>
  api.get('/network/graph', { params })

export const removeNetworkNode = (author) =>
  api.get(`/network/remove-node/${encodeURIComponent(author)}`)

// Clusters
export const getClusters = (params) =>
  api.get('/clusters', { params })

// Summary
export const generateSummary = (data) =>
  api.post('/summary/generate', data)

// Overview stats
export const getOverviewStats = () =>
  api.get('/overview/stats')

export default api
