/**
 * Supabase Server Client Module
 * 
 * This module provides a server-side Supabase client for server components and API routes.
 * It's essential for server-side authentication verification and secure data operations.
 * 
 * The server client handles cookie management for authentication sessions and
 * provides access to database operations with server-side permissions.
 */

import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';

/**
 * Creates and returns a Supabase client configured for server environments.
 * 
 * This function is critical for:
 * 1. Verifying authentication in API routes and server components
 * 2. Performing database operations with server-side permissions
 * 3. Managing authentication cookies in a Next.js-compatible way
 * 4. Enforcing Row Level Security policies on the server
 * 
 * The server client uses the Next.js cookies API to handle authentication session cookies,
 * ensuring proper authentication state management across requests.
 * 
 * @returns A configured Supabase client for server environments with cookie handling
 */
export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                /**
                 * Gets a cookie value by name from the Next.js cookie store
                 * Essential for retrieving authentication session cookies
                 */
                get(name: string) {
                    return cookieStore.get(name)?.value;
                },
                /**
                 * Sets a cookie with the given name, value, and options
                 * Used when refreshing authentication sessions
                 */
                set(name: string, value: string, options: CookieOptions) {
                    cookieStore.set({ name, value, ...options });
                },
                /**
                 * Removes a cookie by setting its value to empty string
                 * Used during logout operations
                 */
                remove(name: string, options: CookieOptions) {
                    cookieStore.set({ name, value: '', ...options });
                },
            },
        }
    );
}