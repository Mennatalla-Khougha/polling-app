# Testing Documentation for Polling App

This document provides comprehensive information about the testing setup, structure, and guidelines for the polling application.

## Overview

The testing setup uses Jest with Next.js integration and includes comprehensive test coverage for the voting API endpoint, with specific focus on preventing duplicate votes from the same user.

## Test Structure

```
__tests__/
├── api/
│   └── votes/
│       ├── route.test.ts              # Main API route tests
│       ├── duplicate-votes.test.ts    # Duplicate vote prevention tests
│       └── integration.test.ts        # End-to-end integration tests
├── lib/
│   └── validations/
│       └── vote-schema.test.ts        # Validation schema tests
├── utils/
│   ├── test-helpers.ts                # Test utilities and mock data
│   └── mock-verification.test.ts      # Mock setup verification
└── setup.test.ts                      # Test environment verification
```

## Running Tests

### Basic Commands

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage report
npm run test:coverage
```

### Test Filtering

```bash
# Run specific test file
npm test -- route.test.ts

# Run tests matching pattern
npm test -- --testNamePattern="duplicate vote"

# Run tests for specific directory
npm test -- __tests__/api/votes/
```

## Key Test Categories

### 1. API Route Tests (`route.test.ts`)

Tests the main `/api/votes` POST endpoint with comprehensive coverage of:

- **Authentication**: Verifies user must be logged in
- **Input Validation**: Tests request body validation using Zod schema
- **Poll Validation**: Ensures poll exists, is public, and not expired
- **Option Validation**: Verifies selected options belong to the poll
- **Business Logic**: Tests single vs multi-vote restrictions
- **Database Operations**: Mocks all Supabase interactions
- **Error Handling**: Comprehensive error scenario coverage
- **Response Format**: Validates response structure and status codes

### 2. Duplicate Vote Prevention Tests (`duplicate-votes.test.ts`)

Specifically focuses on preventing the same user from voting twice:

- **Same User Protection**: Prevents duplicate votes from same user on same poll
- **Different Users**: Allows different users to vote on same poll
- **Different Polls**: Allows same user to vote on different polls
- **Database Query Structure**: Verifies correct user_id and poll_id filtering
- **Edge Cases**: Handles database errors during duplicate checking

### 3. Integration Tests (`integration.test.ts`)

End-to-end testing of complete voting workflows:

- **Complete Flow**: Tests entire voting process from auth to response
- **Multi-vote Scenarios**: Complex multi-option voting flows
- **Error Recovery**: Tests error scenarios and recovery
- **Business Logic**: Comprehensive business rule validation
- **Race Conditions**: Simulates concurrent vote attempts
- **Data Consistency**: Verifies data integrity throughout process

### 4. Validation Schema Tests (`vote-schema.test.ts`)

Tests the Zod validation schema:

- **Valid Data**: Various valid vote request formats
- **Invalid Data**: Comprehensive invalid input testing
- **UUID Validation**: Proper UUID format checking
- **Edge Cases**: Empty arrays, null values, type mismatches
- **Error Messages**: Validates specific error messages and paths

## Mock Setup

### Supabase Client Mocking

The test setup includes comprehensive Supabase client mocking:

```typescript
// Mock client creation
const mockSupabase = createMockSupabaseClient();

// Method chaining support
mockSupabase.from.mockReturnValue(mockSupabase);
mockSupabase.select.mockReturnValue(mockSupabase);

// Query simulation
mockSupabase.single.mockResolvedValue({
  data: mockPoll,
  error: null,
});
```

### Request/Response Mocking

```typescript
// Mock request creation
const mockRequest = createMockRequest({
  poll_id: 'uuid',
  option_ids: ['uuid1', 'uuid2'],
});

// Response verification
expect(response.status).toBe(201);
expect(await response.json()).toEqual({
  success: true,
  updated_options: expect.any(Array),
});
```

## Test Data

### Standard Test Data

The `test-helpers.ts` file provides consistent test data:

```typescript
export const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  user_metadata: { display_name: 'Test User' },
};

export const mockPoll = {
  id: 'poll-123',
  title: 'Test Poll',
  is_public: true,
  allow_multiple_votes: false,
  expires_at: null,
};
```

### Helper Functions

```typescript
// Create different poll types
const multiVotePoll = createMultiVotePoll();
const expiredPoll = createExpiredPoll();
const privatePoll = createPrivatePoll();

// Generate UUIDs
const validUUID = generateValidUUID();
```

## Coverage Requirements

Current coverage thresholds:

- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

### Coverage Areas

- ✅ Authentication flow
- ✅ Input validation
- ✅ Database queries
- ✅ Business logic enforcement
- ✅ Error handling
- ✅ Response formatting
- ✅ Duplicate vote prevention
- ✅ Multi-vote scenarios

## Key Test Scenarios

### Authentication Tests

```typescript
it('should return 401 when user is not authenticated', async () => {
  mockSupabase.auth.getUser.mockResolvedValue({
    data: { user: null },
    error: new Error('Not authenticated'),
  });
  // ... rest of test
});
```

### Duplicate Vote Prevention

```typescript
it('should prevent the same user from voting twice', async () => {
  // Mock existing vote found
  mockSupabase.single.mockResolvedValueOnce({
    data: { id: 'existing-vote-123' },
    error: null,
  });

  const response = await POST(mockRequest);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: 'You have already voted on this poll',
  });
});
```

### Business Logic Tests

```typescript
it('should enforce single-choice restriction', async () => {
  const multiVoteRequest = {
    poll_id: 'poll-123',
    option_ids: ['option-1', 'option-2'], // Multiple options
  };

  // Mock single-choice poll
  mockSupabase.single.mockResolvedValueOnce({
    data: { ...mockPoll, allow_multiple_votes: false },
    error: null,
  });

  const response = await POST(mockRequest);
  expect(response.status).toBe(400);
  expect(await response.json()).toEqual({
    error: 'This poll only allows one choice',
  });
});
```

## Best Practices

### 1. Mock Management

- Always clear mocks between tests using `jest.clearAllMocks()`
- Use `beforeEach` and `afterEach` for consistent setup/cleanup
- Mock at the appropriate level (module vs function)

### 2. Test Organization

- Group related tests using `describe` blocks
- Use descriptive test names that explain the scenario
- Follow AAA pattern: Arrange, Act, Assert

### 3. Assertion Patterns

```typescript
// Good: Specific assertions
expect(response.status).toBe(201);
expect(responseData.success).toBe(true);

// Good: Structure validation
expect(responseData).toEqual({
  success: true,
  updated_options: expect.any(Array),
});

// Good: Mock call verification
expect(mockSupabase.insert).toHaveBeenCalledWith([
  {
    poll_id: 'poll-123',
    option_id: 'option-1',
    user_id: 'user-123',
  },
]);
```

### 4. Error Testing

Always test both success and failure paths:

```typescript
// Test success case
it('should successfully create vote', async () => {
  // ... setup for success
  expect(response.status).toBe(201);
});

// Test corresponding failure case
it('should fail when poll not found', async () => {
  // ... setup for failure
  expect(response.status).toBe(404);
});
```

## Debugging Tests

### Common Issues

1. **Mock not being called**: Check mock setup and method chaining
2. **Async/await issues**: Ensure all async operations are properly awaited
3. **Type errors**: Verify mock types match expected interfaces
4. **Timing issues**: Use proper async handling and mock timers when needed

### Debug Utilities

```typescript
// Enable verbose logging
process.env.JEST_VERBOSE = 'true';

// Check mock calls
console.log('Mock calls:', mockSupabase.insert.mock.calls);

// Verify mock setup
expect(jest.isMockFunction(mockSupabase.from)).toBe(true);
```

## Continuous Integration

Tests are configured to run in CI with:

- Full test suite execution
- Coverage reporting
- Failure on coverage threshold miss
- Test results summary

## Future Improvements

- [ ] Add performance tests for high-load scenarios
- [ ] Implement visual regression tests for UI components
- [ ] Add end-to-end tests with real database
- [ ] Include accessibility testing
- [ ] Add load testing for concurrent votes

## Contributing

When adding new tests:

1. Follow existing patterns and structure
2. Maintain or improve coverage thresholds
3. Update this documentation for new test categories
4. Ensure tests are deterministic and don't depend on external state
5. Add comprehensive error scenarios
6. Include edge cases and boundary conditions

For questions about testing, refer to this documentation or check existing test examples in the codebase.