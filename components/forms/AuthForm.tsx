'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface AuthFormProps {
    mode: 'login' | 'register';
}

export default function AuthForm({ mode }: AuthFormProps) {
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

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setLoading(true);
        setError(null);

        if (mode === 'register') {
            const { error } = await supabase.auth.signUp({
                email,
                password,
            });
            if (error) {
                setError(error.message);
            } else {
                // You might want to show a success message or redirect
                alert('Success! Please check your email to confirm your registration.');
                router.push('/login');
            }
        } else { // Login mode
            const { error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });
            if (error) {
                setError(error.message);
            } else {
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