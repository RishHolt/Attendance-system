import { Link } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
}

interface Attendance {
    id: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
}

export default function Dashboard() {
    const [user, setUser] = useState<User | null>(null);
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        Promise.all([
            fetch('/api/user', {
                headers: {
                    'Accept': 'application/json',
                },
            }).then((res) => res.json()),
            fetch('/api/attendances', {
                headers: {
                    'Accept': 'application/json',
                },
            }).then((res) => res.json()),
        ])
            .then(([userData, attendanceData]) => {
                setUser(userData);
                setAttendances(attendanceData.data || attendanceData || []);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching data:', error);
                setLoading(false);
            });
    }, []);

    const todayAttendance = attendances.find(
        (a) => new Date(a.date).toDateString() === new Date().toDateString()
    );

    const thisMonthCount = attendances.filter((a) => {
        const attendanceDate = new Date(a.date);
        const now = new Date();
        return attendanceDate.getMonth() === now.getMonth() && attendanceDate.getFullYear() === now.getFullYear();
    }).length;

    const presentCount = attendances.filter((a) => a.status === 'Present').length;
    const lateCount = attendances.filter((a) => a.status === 'Late').length;

    if (loading) {
        return (
            <UserLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 text-white">
                    <h1 className="text-3xl font-bold mb-2">Welcome back, {user?.name || 'User'}! 👋</h1>
                    <p className="text-blue-100">Here's your attendance overview</p>
                </div>

                {/* Today's Status Card */}
                {todayAttendance && (
                    <div className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Status</h2>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                                <p className="text-sm font-medium text-blue-600 mb-1">Time In</p>
                                <p className="text-2xl font-bold text-blue-900">
                                    {todayAttendance.time_in
                                        ? (() => {
                                              const date = new Date(todayAttendance.time_in);
                                              const hours = date.getUTCHours();
                                              const minutes = date.getUTCMinutes();
                                              const period = hours >= 12 ? 'PM' : 'AM';
                                              const displayHours = hours % 12 || 12;
                                              return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
                                          })()
                                        : 'Not timed in'}
                                </p>
                            </div>
                            <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                                <p className="text-sm font-medium text-green-600 mb-1">Time Out</p>
                                <p className="text-2xl font-bold text-green-900">
                                    {todayAttendance.time_out
                                        ? (() => {
                                              const date = new Date(todayAttendance.time_out);
                                              const hours = date.getUTCHours();
                                              const minutes = date.getUTCMinutes();
                                              const period = hours >= 12 ? 'PM' : 'AM';
                                              const displayHours = hours % 12 || 12;
                                              return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
                                          })()
                                        : 'Not timed out'}
                                </p>
                            </div>
                            <div
                                className={`rounded-lg p-4 border ${
                                    todayAttendance.status === 'Present'
                                        ? 'bg-green-50 border-green-200'
                                        : todayAttendance.status === 'Late'
                                            ? 'bg-yellow-50 border-yellow-200'
                                            : 'bg-gray-50 border-gray-200'
                                }`}
                            >
                                <p className="text-sm font-medium mb-1">Status</p>
                                <p
                                    className={`text-2xl font-bold ${
                                        todayAttendance.status === 'Present'
                                            ? 'text-green-900'
                                            : todayAttendance.status === 'Late'
                                                ? 'text-yellow-900'
                                                : 'text-gray-900'
                                    }`}
                                >
                                    {todayAttendance.status}
                                </p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <Link
                        href="/my-attendance"
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-blue-300 group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600 mb-1">This Month</p>
                                <p className="text-3xl font-bold text-gray-900 mb-1">{thisMonthCount}</p>
                                <p className="text-xs text-gray-500">Attendance days</p>
                            </div>
                            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                                📅
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-attendance"
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-green-300 group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600 mb-1">Present</p>
                                <p className="text-3xl font-bold text-gray-900 mb-1">{presentCount}</p>
                                <p className="text-xs text-gray-500">On time days</p>
                            </div>
                            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                                ✅
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-attendance"
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-yellow-300 group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600 mb-1">Late</p>
                                <p className="text-3xl font-bold text-gray-900 mb-1">{lateCount}</p>
                                <p className="text-xs text-gray-500">Late arrivals</p>
                            </div>
                            <div className="w-16 h-16 bg-yellow-100 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                                ⏰
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-qr"
                        className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-purple-300 group"
                    >
                        <div className="flex items-center justify-between">
                            <div className="flex-1">
                                <p className="text-sm font-medium text-gray-600 mb-1">QR Code</p>
                                <p className="text-3xl font-bold text-gray-900 mb-1">📱</p>
                                <p className="text-xs text-gray-500">View QR code</p>
                            </div>
                            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300">
                                📱
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Quick Actions */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Link
                        href="/my-qr"
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 hover:border-indigo-300 group"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                                📱
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">My QR Code</h3>
                                <p className="text-sm text-gray-600">View and share your QR code for attendance scanning</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-schedule"
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 hover:border-blue-300 group"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                                📅
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">My Schedule</h3>
                                <p className="text-sm text-gray-600">Manage your work schedule and days</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-attendance"
                        className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-300 p-6 border border-gray-200 hover:border-green-300 group"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center text-2xl group-hover:scale-110 transition-transform duration-300">
                                ✅
                            </div>
                            <div>
                                <h3 className="text-lg font-semibold text-gray-900 mb-1">My Attendance</h3>
                                <p className="text-sm text-gray-600">View your attendance history and records</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </UserLayout>
    );
}
