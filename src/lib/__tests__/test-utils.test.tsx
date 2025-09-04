import { render, screen } from '@/lib/test-utils';
import { mockUser, mockConversation, mockHealthData } from '@/lib/test-utils';

describe('Test Utils', () => {
  it('should render components correctly', () => {
    render(<div data-testid="test-component">Hello World</div>);
    expect(screen.getByTestId('test-component')).toBeInTheDocument();
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('should have mock data available', () => {
    expect(mockUser).toBeDefined();
    expect(mockUser.id).toBe('test-user-id');
    expect(mockUser.email).toBe('test@example.com');
  });

  it('should have mock conversation data', () => {
    expect(mockConversation).toBeDefined();
    expect(mockConversation.user_id).toBe('test-user-id');
    expect(mockConversation.message).toBe('Hello, Coach!');
  });

  it('should have mock health data', () => {
    expect(mockHealthData).toBeDefined();
    expect(mockHealthData.event_type).toBe('check-in');
    expect(mockHealthData.data.weight).toBe(180);
  });
});
