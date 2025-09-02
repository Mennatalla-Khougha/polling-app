// Type declarations for Jest extensions and global utilities

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeValidUUID(): R;
      toHaveStatusCode(expected: number): R;
    }
  }

  var testUtils: {
    waitFor: (ms: number) => Promise<void>;
    useFakeTimers: () => {
      advanceTime: (ms: number) => void;
      runAllTimers: () => void;
      cleanup: () => void;
    };
  };

  namespace NodeJS {
    interface ProcessEnv {
      NEXT_PUBLIC_SUPABASE_URL: string;
      NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
      JEST_VERBOSE?: string;
    }
  }
}

// Mock type definitions for better TypeScript support
export interface MockSupabaseClient {
  auth: {
    getUser: jest.MockedFunction<() => Promise<any>>;
  };
  from: jest.MockedFunction<(table: string) => MockSupabaseClient>;
  select: jest.MockedFunction<(columns: string) => MockSupabaseClient>;
  eq: jest.MockedFunction<(column: string, value: any) => MockSupabaseClient>;
  in: jest.MockedFunction<(column: string, values: any[]) => MockSupabaseClient>;
  single: jest.MockedFunction<() => Promise<any>>;
  insert: jest.MockedFunction<(data: any) => Promise<any>>;
  update: jest.MockedFunction<(data: any) => MockSupabaseClient>;
  delete: jest.MockedFunction<() => MockSupabaseClient>;
}

export interface MockNextRequest {
  json: jest.MockedFunction<() => Promise<any>>;
  headers: Headers;
  method: string;
  url: string;
}

export interface MockNextResponse {
  json: () => Promise<any>;
  status: number;
  headers: Headers;
  ok: boolean;
}

export {};
