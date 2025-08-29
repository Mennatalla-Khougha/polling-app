import AuthForm from '@/components/forms/AuthForm';

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