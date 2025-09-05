'use client';

/**
 * AuthContext Module
 * 
 * This module provides a global authentication context for the application, enabling
 * consistent access to the current user's authentication state across components.
 * 
 * The authentication state is synchronized with Supabase Auth, ensuring that
 * the UI always reflects the current authentication status, even after page refreshes
 * or when returning to the application after closing the browser.
 */

import { createContext, useContext, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import type { User } from '@supabase/supabase-js';

/**
 * Defines the shape of the authentication context.
 * 
 * @property user - The currently authenticated user or null if not authenticated
 * @property loading - Indicates whether the authentication state is still being determined
 */
type AuthContextType = {
    user: User | null;
    loading: boolean;
};

/**
 * Creates the authentication context with default values.
 * Initial state assumes no authenticated user and that authentication is in progress.
 */
const AuthContext = createContext<AuthContextType>({ user: null, loading: true });

/**
 * AuthProvider Component
 * 
 * Wraps the application to provide authentication state to all child components.
 * This component is responsible for:
 * 1. Initializing the authentication state from Supabase
 * 2. Listening for authentication state changes
 * 3. Updating the context when authentication state changes
 * 4. Cleaning up listeners when the component unmounts
 * 
 * @param children - The child components that will have access to the auth context
 */
export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
    const supabase = createClient();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    /**
     * Effect hook to initialize and synchronize authentication state.
     * 
     * This effect performs three critical functions:
     * 1. Initially fetches the current user state from Supabase
     * 2. Sets up a listener for auth state changes (login, logout, token refresh)
     * 3. Cleans up the listener when the component unmounts to prevent memory leaks
     * 
     * The auth state is kept in sync with Supabase, ensuring the UI always
     * reflects the current authentication status.
     */
    useEffect(() => {
        const getUser = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            setUser(user);
            setLoading(false);
        };

        getUser();

        const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
            setUser(session?.user ?? null);
            setLoading(false);
        });

        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [supabase.auth]);

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
};

/**
 * Custom hook to access the authentication context.
 * 
 * This hook simplifies access to the authentication state throughout the application.
 * Components can use this hook to determine if a user is logged in and access user data.
 * 
 * @returns The current authentication context containing user and loading state
 * @example
 * const { user, loading } = useAuth();
 * 
 * if (loading) return <LoadingSpinner />;
 * if (!user) return <LoginPrompt />;
 * return <UserDashboard user={user} />;
 */
export const useAuth = () => useContext(AuthContext);