/**
 * Login Page
 * 
 * This page serves as the entry point for returning users to authenticate with the application.
 * It's a critical part of the authentication flow, providing a dedicated interface for users
 * to enter their credentials and access their account.
 * 
 * The page uses a route group structure to organize auth-related pages and leverages the
 * AuthForm component to handle the actual authentication logic.
 */

import AuthForm from '@/components/forms/AuthForm';

/**
 * Login Page Component
 * 
 * This component renders the login interface, providing a clean, focused environment
 * for users to authenticate. It uses a two-column layout on larger screens with:
 * 
 * 1. The authentication form in the left column
 * 2. A branding panel in the right column (visible only on larger screens)
 * 
 * The component delegates the actual authentication logic to the AuthForm component,
 * which handles form state, validation, and Supabase Auth integration.
 * 
 * @returns A React component rendering the login page
 */
export default function LoginPage() {
    return (
        <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
            <div className="flex items-center justify-center py-12">
                <div className="mx-auto grid w-[350px] gap-6">
                    <AuthForm mode="login" />
                </div>
            </div>
            <div className="hidden bg-muted lg:block">
                {/* You can place an image or branding here */}
                <div className="flex flex-col items-center justify-center h-full text-center p-10 bg-zinc-900 text-white">
                    <h1 className="text-4xl font-bold">Polling App</h1>
                    <p className="text-zinc-300 mt-2">Create, share, and vote in real-time.</p>
                </div>
            </div>
        </div>
    );
}