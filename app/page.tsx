"use client";

export const dynamic = "force-dynamic";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import Link from "next/link";
import {
  BarChart3,
  Users,
  Zap,
  Shield,
  QrCode,
  Clock,
  ArrowRight,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-800">
      {/* Header */}
      <header className="border-b bg-white/50 backdrop-blur-sm dark:bg-slate-950/50 dark:border-slate-800">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <BarChart3 className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
              PollCraft
            </h1>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <nav className="flex items-center space-x-6">
              <Link
                href="/polls"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                Browse Polls
              </Link>
              <Link
                href="/dashboard"
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
              >
                Dashboard
              </Link>
              <Link href="/auth/signin">
                <Button variant="outline" size="sm">
                  Sign In
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">Get Started</Button>
              </Link>
            </nav>
            <ThemeToggle />
          </div>

          {/* Mobile actions */}
          <div className="md:hidden flex items-center space-x-2">
            <ThemeToggle />
            <button
              className="p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-slate-950 border-t dark:border-slate-800">
            <div className="container mx-auto px-4 py-4 space-y-4">
              <Link
                href="/polls"
                className="block text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Browse Polls
              </Link>
              <Link
                href="/dashboard"
                className="block text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                Dashboard
              </Link>
              <div className="flex flex-col space-y-2">
                <Link
                  href="/auth/signin"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button variant="outline" size="sm" className="w-full">
                    Sign In
                  </Button>
                </Link>
                <Link
                  href="/auth/signup"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <Button size="sm" className="w-full">
                    Get Started
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        )}
      </header>

      <main>
        {/* Hero Section */}
        <section className="container mx-auto px-4 py-24 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-6xl font-bold text-slate-900 dark:text-slate-100 mb-8 leading-tight">
              Create & Share Polls
              <br />
              <span className="text-blue-600 dark:text-blue-400">
                Get Instant Feedback
              </span>
            </h1>
            <p className="text-xl text-slate-600 dark:text-slate-300 mb-12 max-w-2xl mx-auto leading-relaxed">
              Build engaging polls, gather real-time responses, and share
              insights instantly. Perfect for teams, events, education, and
              decision making.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg px-8 py-3">
                  Create Your First Poll
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="/polls">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-3"
                >
                  Browse Public Polls
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Everything You Need for Effective Polling
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300">
              Powerful features designed for creators and participants alike
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Real-time Results
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Watch votes come in live with instant updates and beautiful
                  visualizations
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="h-6 w-6 text-green-600 dark:text-green-400" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  QR Code Sharing
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Share polls instantly with generated QR codes for easy mobile
                  access
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Multiple Vote Options
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Support for single choice, multiple choice, and anonymous
                  voting
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Shield className="h-6 w-6 text-orange-600 dark:text-orange-400" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Secure & Private
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Control who can vote with authentication options and privacy
                  settings
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 bg-red-100 dark:bg-red-900/30 rounded-lg flex items-center justify-center mb-4">
                  <Clock className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Time Management
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Set expiration dates and control when your polls are active
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:shadow-lg dark:hover:shadow-slate-900/20 transition-shadow">
              <CardHeader>
                <div className="h-12 w-12 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center mb-4">
                  <BarChart3 className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <CardTitle className="text-slate-900 dark:text-slate-100">
                  Analytics Dashboard
                </CardTitle>
                <CardDescription className="text-slate-600 dark:text-slate-300">
                  Track engagement with detailed analytics and response insights
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </section>

        {/* How It Works */}
        <section className="bg-slate-50 dark:bg-slate-900/50 py-16">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                How It Works
              </h2>
              <p className="text-lg text-slate-600 dark:text-slate-300">
                Get started in minutes with our simple three-step process
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
              <div className="text-center">
                <div className="h-16 w-16 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">1</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  Create Your Poll
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Add your question and options. Choose your privacy settings
                  and voting rules.
                </p>
              </div>

              <div className="text-center">
                <div className="h-16 w-16 bg-green-600 dark:bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">2</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  Share & Collect
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  Share via link, QR code, or social media. Watch responses come
                  in real-time.
                </p>
              </div>

              <div className="text-center">
                <div className="h-16 w-16 bg-purple-600 dark:bg-purple-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <span className="text-white font-bold text-xl">3</span>
                </div>
                <h3 className="text-xl font-semibold mb-2 text-slate-900 dark:text-slate-100">
                  Analyze Results
                </h3>
                <p className="text-slate-600 dark:text-slate-300">
                  View live results, export data, and make informed decisions
                  based on feedback.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-16 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl font-bold text-slate-900 dark:text-slate-100 mb-4">
              Ready to Start Polling?
            </h2>
            <p className="text-lg text-slate-600 dark:text-slate-300 mb-8">
              Join thousands of users who trust PollCraft for their polling
              needs. Create your account and start building engaging polls
              today.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/auth/signup">
                <Button size="lg" className="text-lg px-8 py-3">
                  Sign Up Free
                </Button>
              </Link>
              <Link href="/polls">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-lg px-8 py-3"
                >
                  Try a Demo Poll
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-slate-50 dark:bg-slate-950 dark:border-slate-800">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <BarChart3 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <span className="font-semibold text-slate-900 dark:text-slate-100">
                PollCraft
              </span>
            </div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm text-slate-600 dark:text-slate-300">
              <Link
                href="/about"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                About
              </Link>
              <Link
                href="/privacy"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                Privacy
              </Link>
              <Link
                href="/terms"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                Terms
              </Link>
              <Link
                href="/contact"
                className="hover:text-slate-900 dark:hover:text-slate-100"
              >
                Contact
              </Link>
            </nav>
          </div>
          <div className="text-center mt-8 pt-8 border-t dark:border-slate-800 text-sm text-slate-500 dark:text-slate-400">
            <p>&copy; 2024 PollCraft. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
