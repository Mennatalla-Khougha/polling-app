'use client';

/**
 * AuthForm Component
 * 
 * This component provides a unified interface for user authentication, handling both
 * login and registration flows. It's a critical part of the application's security
 * infrastructure, providing the entry point for users to access protected features.
 * 
 * The form adapts its behavior and UI based on the 'mode' prop, showing either
 * login or registration fields and handling the appropriate Supabase Auth calls.
 */

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * Props for the AuthForm component
 * 
 * @property mode - Determines whether the form operates in login or register mode,
 *                  affecting both the UI presentation and form submission behavior
 */
interface AuthFormProps {
    mode: 'login' | 'register';
}

/**
 * Authentication Form Component
 * 
 * This component renders and manages a form for user authentication, handling both
 * login and registration flows through Supabase Auth.
 * 
 * Key responsibilities:
 * 1. Presenting appropriate UI based on authentication mode (login/register)
 * 2. Managing form state and validation
 * 3. Handling authentication API calls to Supabase
 * 4. Providing error feedback and loading states
 * 5. Redirecting users after successful authentication
 * 
 * @param props - Component props containing the authentication mode
 * @returns A form component for user authentication
 */
export default function AuthForm({ mode }: AuthFormProps) {
    // Form state management
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const supabase = createClient();

    const title = mode === 'login' ? 'Welcome Back' : 'Create an Account';
    const description = mode === 'login'
        ? 'Enter your credentials to access your dashboard.'
        : 'Enter your email below to create your account.';
    const buttonText = mode === 'login' ? 'Login' : 'Create Account';
    const linkText = mode === 'login' ? "Don't have an account?" : 'Already have an account?';
    const linkHref = mode === 'login' ? '/register' : '/login';

    /**
     * Handles form submission for both login and registration flows.
     * 
     * This function is the core of the authentication process, managing:
     * 1. Form submission prevention
     * 2. Loading state management
     * 3. Error state clearing
     * 4. Conditional authentication logic based on mode
     * 5. Error handling and user feedback
     * 6. Successful authentication redirects
     * 
     * The function uses different Supabase Auth methods depending on whether
     * the user is registering or logging in.
     * 
     * @param event - The form submission event
     */
    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (mode === 'register') {
            // Registration flow using Supabase Auth
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                setError(error.message);
            } else {
                // Success feedback and redirect to login
                alert('Success! Please check your email to confirm your registration.');
                router.push('/login');
            }
        } else { // Login mode
            // Login flow using Supabase Auth
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
            } else {
                // Redirect to dashboard and refresh to update server components
                router.push('/dashboard');
                router.refresh(); // Important to re-fetch server-side props and update UI
            }
        }
        setLoading(false);
    };

    return (
        <Card className="mx-auto max-w-sm w-full">
            <CardHeader>
                <CardTitle className="text-2xl">{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="bg-red-50 text-red-700 p-3 rounded-md mb-4 text-sm">
                        {error}
                    </div>
                )}
                <form onSubmit={handleSubmit} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            placeholder="name@example.com"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <div className="grid gap-2">
                        <Label htmlFor="password">Password</Label>
                        <Input
                            id="password"
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? 'Please wait...' : buttonText}
                    </Button>
                </form>
                <div className="mt-4 text-center text-sm">
                    {linkText}{' '}
                    <Link href={linkHref} className="underline">
                        {mode === 'login' ? 'Sign up' : 'Sign in'}
                    </Link>
                </div>
            </CardContent>
        </Card>
    );
}