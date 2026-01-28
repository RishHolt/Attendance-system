import { Link, usePage } from '@inertiajs/react';
import { ReactNode, useState, useEffect } from 'react';
import { router } from '@inertiajs/react';

interface AdminLayoutProps {
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

export default function AdminLayout({ children }: AdminLayoutProps) {
    const page = usePage<PageProps & { url?: string }>();
    const { auth } = page.props;
    const url = page.url || (typeof window !== 'undefined' ? window.location.pathname : '');
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());

    const handleLogout = (): void => {
        router.post('/logout');
    };

    useEffect(() => {
        const timer = setInterval(() => {
            setCurrentTime(new Date());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    const navigation = [
        { name: 'Dashboard', href: '/admin/dashboard', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        )},
        { name: 'Attendance Logs', href: '/admin/attendances', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
            </svg>
        )},
        { name: 'User Management', href: '/admin/users', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
        )},
        { name: 'QR Scanner', href: '/scanner', icon: (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
        )},
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-gray-50">
            {/* Sidebar */}
            <div
                className={`fixed inset-y-0 left-0 z-50 w-64 bg-gradient-to-br from-indigo-900 via-indigo-800 to-purple-900 text-white transform transition-transform duration-300 ease-in-out shadow-2xl ${
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                } lg:translate-x-0`}
            >
                <div className="flex flex-col h-full">
                    {/* Logo */}
                    <div className="flex items-center justify-between h-20 px-6 border-b border-indigo-700/50 bg-indigo-900/50 backdrop-blur-sm">
                        <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center backdrop-blur-sm">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <div>
                                <h1 className="text-xl font-bold tracking-tight">Admin Panel</h1>
                                <p className="text-xs text-indigo-300">Control Center</p>
                            </div>
                        </div>
                        <button
                            onClick={() => setSidebarOpen(false)}
                            className="lg:hidden text-white/80 hover:text-white hover:bg-white/10 rounded-lg p-1.5 transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
                        {navigation.map((item, index) => {
                            const isActive = url === item.href || (url && url.startsWith(item.href + '/'));
                            return (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className={`group flex items-center px-4 py-3 rounded-xl transition-all duration-200 ${
                                        isActive
                                            ? 'bg-white/20 text-white shadow-lg backdrop-blur-sm scale-105'
                                            : 'text-indigo-100 hover:bg-white/10 hover:text-white'
                                    }`}
                                    style={{ animationDelay: `${index * 50}ms` }}
                                >
                                    <span className={`mr-3 transition-transform duration-200 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}>
                                        {item.icon}
                                    </span>
                                    <span className="font-medium">{item.name}</span>
                                    {isActive && (
                                        <span className="ml-auto w-2 h-2 bg-white rounded-full animate-pulse"></span>
                                    )}
                                </Link>
                            );
                        })}
                    </nav>

                    {/* User Info */}
                    <div className="px-4 py-4 border-t border-indigo-700/50 bg-indigo-900/30 backdrop-blur-sm">
                        <div className="flex items-center mb-3 p-3 rounded-xl bg-white/10 backdrop-blur-sm">
                            <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-full flex items-center justify-center font-bold text-white shadow-lg ring-2 ring-white/20">
                                {auth?.user?.name?.charAt(0).toUpperCase() || 'A'}
                            </div>
                            <div className="ml-3 flex-1 min-w-0">
                                <p className="text-sm font-semibold truncate">{auth?.user?.name || 'Admin'}</p>
                                <p className="text-xs text-indigo-300 truncate">{auth?.user?.email || ''}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleLogout}
                            className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-xl text-sm font-medium transition-all duration-200 hover:scale-105 hover:shadow-lg border border-white/20"
                        >
                            <span className="flex items-center justify-center">
                                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                                </svg>
                                Logout
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Main Content */}
            <div className={`transition-all duration-300 ${sidebarOpen ? 'lg:ml-64' : 'lg:ml-64'}`}>
                {/* Top Bar */}
                <div className="bg-white/80 backdrop-blur-md shadow-sm border-b border-gray-200/50 sticky top-0 z-40">
                    <div className="flex items-center justify-between h-16 px-6">
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="lg:hidden text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg p-2 transition-colors"
                        >
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </button>
                        <div className="flex-1 lg:ml-0 ml-4">
                            <h2 className="text-lg font-bold text-gray-900">
                                {navigation.find((item) => url === item.href || (url && url.startsWith(item.href + '/')))?.name || 'Admin'}
                            </h2>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="hidden sm:flex flex-col items-end px-3 py-1.5 bg-gray-100 rounded-lg">
                                <div className="text-sm font-semibold text-gray-900">
                                    {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
                                </div>
                                <div className="flex items-center space-x-1.5 text-xs text-gray-600">
                                    <svg className="w-3.5 h-3.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                    </svg>
                                    <span>
                                        {currentTime.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Page Content */}
                <main className="p-6">{children}</main>
            </div>

            {/* Overlay for mobile */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}
        </div>
    );
}
