/**
 * Supabase Client Module
 * 
 * This module provides a browser-side Supabase client for client components.
 * It's essential for client-side authentication operations and data fetching.
 * 
 * The client is configured with environment variables to connect to the Supabase project.
 * Using the SSR-compatible client ensures proper cookie handling for authentication.
 */

import { createBrowserClient } from '@supabase/ssr';

/**
 * Creates and returns a Supabase client configured for browser environments.
 * 
 * This function is critical for:
 * 1. Client-side authentication operations (login, signup, password reset)
 * 2. Real-time subscriptions to database changes
 * 3. Client-side data fetching in protected routes
 * 
 * The client uses the public anon key which has limited permissions
 * defined by Row Level Security policies in Supabase.
 * 
 * @returns A configured Supabase client for browser environments
 */
export function createClient() {
    return createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
}