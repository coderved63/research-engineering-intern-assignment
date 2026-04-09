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

export const getTopicTrends = (params) =>
  api.get('/timeseries/topics', { params })

export const askAboutChart = (data) =>
  api.post('/timeseries/ask', data)

// Search
export const searchPosts = (data) =>
  api.post('/search', data)

export const searchTimeSeries = (data) =>
  api.post('/search/timeseries', data)

// Network
export const getNetworkGraph = (params) =>
  api.get('/network/graph', { params })

export const removeNetworkNode = (author, params = {}) =>
  api.get(`/network/remove-node/${encodeURIComponent(author)}`, { params })

// Clusters
export const getClusters = (params) =>
  api.get('/clusters', { params })

// Summary
export const generateSummary = (data) =>
  api.post('/summary/generate', data)

// Overview stats
export const getOverviewStats = () =>
  api.get('/overview/stats')

// Embeddings summary
export const getEmbeddingsSummary = () =>
  api.get('/embeddings/summary')

// Compare two subreddits
export const getCompareSubreddits = (sub1, sub2) =>
  api.get('/compare', { params: { sub1, sub2 } })

export default api
