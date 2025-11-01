import { beforeAll, afterEach } from 'vitest'

// Setup test environment
beforeAll(() => {
  // Mock console.log to reduce test noise
  global.console.log = () => {}
  global.console.warn = () => {}
})

// Cleanup after each test
afterEach(() => {
  // Clear all mocks
})

