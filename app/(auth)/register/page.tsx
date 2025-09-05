/**
 * Register Page
 * 
 * This page serves as the entry point for new users to create an account in the application.
 * It's a critical part of the user acquisition flow, providing a dedicated interface for
 * users to register and begin using the application's features.
 * 
 * The page uses a route group structure to organize auth-related pages and leverages the
 * AuthForm component to handle the actual registration logic.
 */

import AuthForm from '@/components/forms/AuthForm';

/**
 * Register Page Component
 * 
 * This component renders the registration interface, providing a clean, focused environment
 * for users to create a new account. It uses a two-column layout on larger screens with:
 * 
 * 1. The registration form in the left column
 * 2. A branding panel in the right column (visible only on larger screens)
 * 
 * The component delegates the actual registration logic to the AuthForm component,
 * which handles form state, validation, and Supabase Auth integration.
 * 
 * @returns A React component rendering the registration page
 */
export default function RegisterPage() {
    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-6">
                    <AuthForm mode="register" />
                </div>
            </div>
            <div className="hidden bg-muted lg:block">
                {/* This branding panel should be consistent */}
                <div className="flex flex-col items-center justify-center h-full text-center p-10 bg-zinc-900 text-white">
                    <h1 className="text-4xl font-bold">Polling App</h1>
                    <p className="text-zinc-300 mt-2">Create, share, and vote in real-time.</p>
                </div>
            </div>
        </div>
    );
}