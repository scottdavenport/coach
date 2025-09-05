export function createMockRequest(
  url: string,
  method: string = 'GET',
  body?: any,
  headers?: Record<string, string>
): any {
  const requestInit: any = {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  };

  if (body) {
    requestInit.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  // Create a mock request object that matches NextRequest interface
  return {
    url,
    method,
    headers: new Headers(requestInit.headers),
    body: requestInit.body,
    json: async () => {
      if (requestInit.body) {
        return JSON.parse(requestInit.body);
      }
      return {};
    },
  };
}

export function createMockFormDataRequest(
  url: string,
  files: File[],
  headers?: Record<string, string>
): any {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));

  return {
    url,
    method: 'POST',
    headers: new Headers(headers),
    body: formData,
    formData: async () => formData,
  };
}

export function createMockUser(overrides: any = {}) {
  return {
    id: 'test-user-id',
    email: 'test@example.com',
    ...overrides,
  };
}

export function createMockSupabaseClient() {
  return {
    auth: {
      getUser: jest.fn(),
    },
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
      insert: jest.fn(() => ({
        select: jest.fn(() => ({
          single: jest.fn(),
        })),
      })),
    })),
    storage: {
      from: jest.fn(() => ({
        upload: jest.fn(),
      })),
    },
  };
}