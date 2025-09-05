/**
 * Auth Callback Route Handler
 * 
 * This module is a critical part of the OAuth authentication flow, handling the callback
 * from Supabase Auth after a user has authenticated. It's responsible for exchanging
 * the temporary authorization code for a permanent session token.
 * 
 * Without this route handler, users would be unable to complete the authentication
 * process, as the OAuth flow requires a callback endpoint to finalize the session.
 */

import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

/**
 * GET Request Handler for Auth Callback
 * 
 * This function is the core of the OAuth authentication flow, processing the callback
 * from Supabase Auth and establishing the user's session. It performs several critical tasks:
 * 
 * 1. Extracts the authorization code from the URL parameters
 * 2. Determines the redirect destination after successful authentication
 * 3. Exchanges the temporary code for a permanent session via Supabase
 * 4. Manages cookies and session state through the Supabase server client
 * 5. Redirects the user to the appropriate destination based on authentication result
 * 
 * Without this handler, users would be left in an authentication limbo - having started
 * the auth process but unable to complete it and access protected resources.
 * 
 * @param request - The incoming HTTP request containing auth code in search params
 * @returns A redirect response to either the next page or an error page
 */
export async function GET(request: Request) {
    // Parse the URL and extract critical auth parameters
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get('code');
    // if "next" is in param, use it as the redirect URL
    const next = searchParams.get('next') ?? '/dashboard';

    if (code) {
        // Initialize the server-side Supabase client with cookie handling
        const supabase = await createClient();
        // Exchange the temporary code for a permanent session
        // This step is crucial - it validates the auth code and establishes the session
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (!error) {
            // Authentication successful - redirect to the intended destination
            return NextResponse.redirect(`${origin}${next}`);
        }
    }

    // Authentication failed - redirect to error page with instructions
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}