import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState } from 'react';
import { router } from '@inertiajs/react';

interface UserLayoutProps {
    children: ReactNode;
}

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface PageProps {
    auth?: {
        user?: User;
    };
}

export default function UserLayout({ children }: UserLayoutProps) {
    const page = usePage<PageProps & { url?: string }>();
    const { auth } = page.props;
    const url = page.url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const handleLogout = (): void => {
        router.post('/logout');
    };

    const navigation = [
        { name: 'Dashboard', href: '/dashboard', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )},
        { name: 'My QR Code', href: '/my-qr', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
        )},
        { name: 'My Schedule', href: '/my-schedule', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
        )},
        { name: 'My Attendance', href: '/my-attendance', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
        )},
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Navigation Bar */}
            <nav className="bg-white/95 backdrop-blur-md shadow-lg border-b border-gray-200/50 sticky top-0 z-50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link href="/dashboard" className="flex items-center space-x-3 group">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                                    </svg>
                                </div>
                                <div>
                                    <span className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
                                        Attendance System
                                    </span>
                                    <p className="text-xs text-gray-500 -mt-0.5">Track your time</p>
                                </div>
                            </Link>
                        </div>

                        {/* Desktop Navigation */}
                        <div className="hidden md:flex items-center space-x-2">
                            {navigation.map((item, index) => {
                                const isActive = url === item.href || (url && url.startsWith(item.href + '/'));
                                return (
                                    <Link
                                        key={item.name}
                                        href={item.href}
                                        className={`relative flex items-center px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50 scale-105'
                                                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <span className={`mr-2 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                            {item.icon}
                                        </span>
                                        {item.name}
                                        {isActive && (
                                            <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-white rounded-full"></span>
                                        )}
                                    </Link>
                                );
                            })}
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center space-x-3">
                            <div className="hidden sm:flex items-center space-x-3 px-3 py-1.5 bg-gray-50 rounded-xl border border-gray-200">
                                <div className="text-right">
                                    <p className="text-sm font-semibold text-gray-900">{auth?.user?.name || 'User'}</p>
                                    <p className="text-xs text-gray-500">{auth?.user?.email || ''}</p>
                                </div>
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-full flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-blue-200">
                                    {auth?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="px-4 py-2 bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 text-white rounded-xl text-sm font-medium transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 flex items-center space-x-2"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                <span>Logout</span>
                            </button>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    {mobileMenuOpen ? (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    ) : (
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                    )}
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Navigation */}
                <div
                    className={`md:hidden border-t border-gray-200 bg-white/95 backdrop-blur-md overflow-hidden transition-all duration-300 ${
                        mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="px-2 pt-2 pb-3 space-y-1">
                        {navigation.map((item, index) => {
                            const isActive = url === item.href || (url && url.startsWith(item.href + '/'));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center px-4 py-3 rounded-xl text-base font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <span className={`mr-3 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>
                                        {item.icon}
                                    </span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Page Content */}
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">{children}</main>
        </div>
    );
}
