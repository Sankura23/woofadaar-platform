import '@testing-library/jest-dom'

// Mock Next.js Request/Response for jsdom environment
global.Request = class Request {
  constructor(url, options = {}) {
    Object.defineProperty(this, 'url', { value: url, writable: false });
    this.method = options.method || 'GET';
    this.headers = new Headers(options.headers || {});
    this._body = options.body;
  }

  async json() {
    return JSON.parse(this._body);
  }

  async text() {
    return this._body;
  }
};

global.Response = class Response {
  constructor(body, options = {}) {
    this.body = body;
    this.status = options.status || 200;
    this.statusText = options.statusText || 'OK';
    this.headers = new Headers(options.headers || {});
  }

  async json() {
    return JSON.parse(this.body);
  }

  static json(data, options = {}) {
    return new Response(JSON.stringify(data), {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    });
  }
};

global.Headers = class Headers extends Map {
  get(name) {
    return super.get(name.toLowerCase());
  }

  set(name, value) {
    return super.set(name.toLowerCase(), value);
  }

  has(name) {
    return super.has(name.toLowerCase());
  }
};

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/',
}));

// Mock environment variables
process.env.JWT_SECRET = 'test-jwt-secret';
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test_woofadaar';
process.env.NODE_ENV = 'test';

// Global test utilities
global.mockRequest = (method, url, body = null, headers = {}) => {
  return new Request(url, {
    method,
    body: body ? JSON.stringify(body) : null,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};