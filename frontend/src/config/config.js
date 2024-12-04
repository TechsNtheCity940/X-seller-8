export const config = {
  api: {
    baseUrl: import.meta.env.VITE_API_URL || 'http://localhost:5000',
    wsUrl: import.meta.env.VITE_WS_URL || 'ws://localhost:5000',
  },
  uploads: {
    allowedTypes: [
      'image/png', 
      'image/jpeg', 
      'application/pdf', 
      'text/csv',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ],
    maxSize: 50 * 1024 * 1024 // 50MB
  },
  paths: {
    uploads: '/uploads',
    outputs: '/outputs'
  }
}; 