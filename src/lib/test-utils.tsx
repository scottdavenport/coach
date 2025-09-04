import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';

// Mock Supabase client for testing
const mockSupabaseClient = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: null }, error: null }),
    getSession: () => Promise.resolve({ data: { session: null }, error: null }),
    signInWithOtp: () => Promise.resolve({ data: {}, error: null }),
    signOut: () => Promise.resolve({ error: null }),
  },
  from: () => ({
    select: () => ({
      insert: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      update: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      delete: () => ({
        eq: () => ({
          single: () => Promise.resolve({ data: null, error: null }),
        }),
      }),
      eq: () => ({
        single: () => Promise.resolve({ data: null, error: null }),
      }),
      order: () => ({
        limit: () => Promise.resolve({ data: [], error: null }),
      }),
      limit: () => Promise.resolve({ data: [], error: null }),
    }),
  }),
  storage: {
    from: () => ({
      upload: () => Promise.resolve({ data: null, error: null }),
      createSignedUrl: () =>
        Promise.resolve({ data: { signedUrl: 'test-url' }, error: null }),
    }),
  },
  rpc: () => Promise.resolve({ data: null, error: null }),
};

// Test wrapper component for providers
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => {
  return <>{children}</>;
};

// Custom render function that includes providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: TestWrapper, ...options });

// Export mock Supabase client for testing
export { mockSupabaseClient };

// Mock data for testing
export const mockUser = {
  id: 'test-user-id',
  email: 'test@example.com',
  created_at: '2024-01-01T00:00:00Z',
};

export const mockConversation = {
  id: 'test-conversation-id',
  user_id: 'test-user-id',
  message: 'Hello, Coach!',
  message_type: 'text',
  metadata: {
    role: 'user',
    conversation_id: 'test-conversation-id',
  },
  created_at: '2024-01-01T00:00:00Z',
};

export const mockHealthData = {
  id: 'test-health-id',
  user_id: 'test-user-id',
  event_type: 'check-in',
  data: {
    weight: 180,
    energy: 7,
    mood: 'good',
  },
  confidence: 0.9,
  created_at: '2024-01-01T00:00:00Z',
};

// Test helpers
export const waitFor = (ms: number) =>
  new Promise(resolve => setTimeout(resolve, ms));

export const mockApiResponse = (data: any, status = 200) => {
  return Promise.resolve({
    ok: status >= 200 && status < 300,
    status,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  });
};

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };
