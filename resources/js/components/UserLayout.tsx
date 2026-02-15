import { Link, usePage } from '@inertiajs/react';
import { router } from '@inertiajs/react';
import type { ReactNode } from 'react';
import { useState } from 'react';

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
    const page = usePage<PageProps & { url?: string; [key: string]: unknown }>();
    const { auth } = page.props;
    const url = page.url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

    const handleLogout = (): void => {
        router.post('/logout');
    };

    const [dropdownOpen, setDropdownOpen] = useState(false);

    const navigation = [
        {
            name: 'Dashboard',
            href: '/dashboard',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                    />
                </svg>
            ),
        },
        {
            name: 'Attendance',
            href: '/my-attendance',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            ),
        },
        {
            name: 'Schedule',
            href: '/my-schedule',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            ),
        },
        {
            name: 'QR Code',
            href: '/my-qr',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                </svg>
            ),
        },
    ];

    const moreMenu = [
        {
            name: 'Calendar',
            href: '/calendar',
            icon: (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                </svg>
            ),
        },
    ];

    return (
        <div className="bg-gradient-to-br from-blue-50 via-white to-indigo-50 min-h-screen">
            {/* Navigation Bar */}
            <nav className="top-0 z-50 sticky bg-white/95 shadow-lg backdrop-blur-md border-gray-200/50 border-b">
                <div className="mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
                    <div className="flex justify-between items-center h-16">
                        <div className="flex items-center">
                            <Link href="/dashboard" className="group flex items-center space-x-3">
                                <div className="flex justify-center items-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-lg rounded-xl w-10 h-10 group-hover:scale-110 transition-transform duration-200">
                                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                        />
                                    </svg>
                                </div>
                                <div>
                                    <span className="bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600 font-bold text-transparent text-xl">
                                        Attendance System
                                    </span>
                                    <p className="-mt-0.5 text-gray-500 text-xs">Track your time</p>
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
                                        className={`relative flex items-center rounded-xl px-4 py-2 text-sm font-medium transition-all duration-200 ${
                                            isActive
                                                ? 'scale-105 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg shadow-blue-500/50'
                                                : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                        }`}
                                        style={{ animationDelay: `${index * 30}ms` }}
                                    >
                                        <span className={`mr-2 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                                        {item.name}
                                        {isActive && (
                                            <span className="-bottom-1 left-1/2 absolute bg-white rounded-full w-1 h-1 -translate-x-1/2 transform"></span>
                                        )}
                                    </Link>
                                );
                            })}


                            {/* More Menu Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setDropdownOpen(!dropdownOpen)}
                                    className="flex items-center hover:bg-blue-50 px-4 py-2 rounded-xl font-medium text-gray-700 hover:text-blue-600 text-sm transition-all duration-200"
                                >
                                    <svg className="mr-2 w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                    </svg>
                                    More
                                </button>

                                {dropdownOpen && (
                                    <>
                                        <div
                                            className="z-10 fixed inset-0"
                                            onClick={() => setDropdownOpen(false)}
                                        ></div>
                                        <div className="right-0 z-20 absolute bg-white shadow-lg mt-2 py-2 border border-gray-200 rounded-xl w-48">
                                            {moreMenu.map((item) => {
                                                const isActive = url === item.href || (url && url.startsWith(item.href + '/'));
                                                return (
                                                    <Link
                                                        key={item.name}
                                                        href={item.href}
                                                        onClick={() => setDropdownOpen(false)}
                                                        className={`flex items-center px-4 py-2 text-sm transition-colors ${
                                                            isActive
                                                                ? 'bg-blue-50 text-blue-600 font-medium'
                                                                : 'text-gray-700 hover:bg-gray-50'
                                                        }`}
                                                    >
                                                        <span className="mr-3">{item.icon}</span>
                                                        {item.name}
                                                    </Link>
                                                );
                                            })}
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* User Menu */}
                        <div className="flex items-center space-x-3">
                            {/* Profile Dropdown */}
                            <div className="relative">
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="hidden sm:flex items-center space-x-3 bg-gray-50 hover:bg-gray-100 px-3 py-1.5 border border-gray-200 rounded-xl transition-colors cursor-pointer"
                                >
                                    <div className="text-right">
                                        <p className="font-semibold text-gray-900 text-sm">{auth?.user?.name || 'User'}</p>
                                        <p className="text-gray-500 text-xs">{auth?.user?.email || ''}</p>
                                    </div>
                                    <div className="flex justify-center items-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg rounded-full ring-2 ring-blue-200 w-10 h-10 font-bold text-white">
                                        {auth?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                    </div>
                                    <svg
                                        className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${
                                            profileDropdownOpen ? 'rotate-180' : ''
                                        }`}
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                </button>

                                {/* Mobile Profile Button */}
                                <button
                                    onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                                    className="sm:hidden flex justify-center items-center bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 shadow-lg rounded-full ring-2 ring-blue-200 w-10 h-10 font-bold text-white"
                                >
                                    {auth?.user?.name?.charAt(0).toUpperCase() || 'U'}
                                </button>

                                {profileDropdownOpen && (
                                    <>
                                        <div
                                            className="z-10 fixed inset-0"
                                            onClick={() => setProfileDropdownOpen(false)}
                                        ></div>
                                        <div className="right-0 z-20 absolute bg-white shadow-lg mt-2 py-2 border border-gray-200 rounded-xl w-56">
                                            <div className="px-4 py-3 border-gray-100 border-b">
                                                <p className="font-semibold text-gray-900 text-sm">{auth?.user?.name || 'User'}</p>
                                                <p className="mt-1 text-gray-500 text-xs">{auth?.user?.email || ''}</p>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    setProfileDropdownOpen(false);
                                                    handleLogout();
                                                }}
                                                className="flex items-center hover:bg-red-50 px-4 py-2 w-full text-red-600 text-sm transition-colors"
                                            >
                                                <svg className="mr-3 w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                                    />
                                                </svg>
                                                Logout
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Mobile menu button */}
                            <button
                                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                                className="md:hidden hover:bg-gray-100 p-2 rounded-lg text-gray-600 hover:text-gray-900 transition-colors"
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
                    className={`overflow-hidden border-t border-gray-200 bg-white/95 backdrop-blur-md transition-all duration-300 md:hidden ${
                        mobileMenuOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                    }`}
                >
                    <div className="space-y-1 px-2 pt-2 pb-3">
                        {navigation.map((item, index) => {
                            const isActive = url === item.href || (url && url.startsWith(item.href + '/'));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <span className={`mr-3 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                        {moreMenu.map((item) => {
                            const isActive = url === item.href || (url && url.startsWith(item.href + '/'));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    onClick={() => setMobileMenuOpen(false)}
                                    className={`flex items-center rounded-xl px-4 py-3 text-base font-medium transition-all duration-200 ${
                                        isActive
                                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg'
                                            : 'text-gray-700 hover:bg-blue-50 hover:text-blue-600'
                                    }`}
                                >
                                    <span className={`mr-3 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}>{item.icon}</span>
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>
                </div>
            </nav>

            {/* Page Content */}
            <main className="mx-auto px-4 sm:px-6 lg:px-8 py-8 max-w-7xl">{children}</main>
        </div>
    );
}
