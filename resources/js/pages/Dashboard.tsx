import { Link, router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import UserLayout from '../components/UserLayout';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    qr_token?: string;
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

    const handleQuickCheckIn = async (): Promise<void> => {
        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            const response = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    qr_token: user?.qr_token || '',
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Checked In!',
                    text: data.message || 'You have successfully checked in.',
                    timer: 2000,
                    showConfirmButton: false,
                });
                router.reload();
            } else {
                throw new Error(data.message || 'Failed to check in');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to check in',
            });
        }
    };

    const handleQuickCheckOut = async (): Promise<void> => {
        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            const response = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    qr_token: user?.qr_token || '',
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Checked Out!',
                    text: data.message || 'You have successfully checked out.',
                    timer: 2000,
                    showConfirmButton: false,
                });
                router.reload();
            } else {
                throw new Error(data.message || 'Failed to check out');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to check out',
            });
        }
    };

    if (loading) {
        return (
            <UserLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                        <div className="mx-auto border-indigo-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
                        <p className="mt-4 text-gray-600">Loading...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-blue-600 to-indigo-600 shadow-lg p-6 rounded-xl text-white">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="mb-2 font-bold text-3xl">Welcome back, {user?.name || 'User'}! 👋</h1>
                            <p className="text-blue-100">Here's your attendance overview</p>
                        </div>
                        <div className="flex gap-3">
                            {todayAttendance && !todayAttendance.time_in && (
                                <button
                                    onClick={handleQuickCheckIn}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-lg font-semibold text-white hover:scale-105 transition-all duration-200"
                                >
                                    Quick Check-In
                                </button>
                            )}
                            {todayAttendance && todayAttendance.time_in && !todayAttendance.time_out && (
                                <button
                                    onClick={handleQuickCheckOut}
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-lg font-semibold text-white hover:scale-105 transition-all duration-200"
                                >
                                    Quick Check-Out
                                </button>
                            )}
                            {todayAttendance && (
                                <Link
                                    href="/my-attendance"
                                    className="bg-white/20 hover:bg-white/30 backdrop-blur-sm px-6 py-3 rounded-lg font-semibold text-white hover:scale-105 transition-all duration-200"
                                >
                                    View Attendance
                                </Link>
                            )}
                        </div>
                    </div>
                </div>

                {/* Today's Status Card */}
                {todayAttendance && (
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <h2 className="mb-4 font-semibold text-gray-900 text-lg">Today's Status</h2>
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-3">
                            <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                                <p className="mb-1 font-medium text-blue-600 text-sm">Time In</p>
                                <p className="font-bold text-blue-900 text-2xl">
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
                            <div className="bg-green-50 p-4 border border-green-200 rounded-lg">
                                <p className="mb-1 font-medium text-green-600 text-sm">Time Out</p>
                                <p className="font-bold text-green-900 text-2xl">
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
                                <p className="mb-1 font-medium text-sm">Status</p>
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
                <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    <Link
                        href="/my-attendance"
                        className="group bg-white shadow-md hover:shadow-xl p-6 border border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-300"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <p className="mb-1 font-medium text-gray-600 text-sm">This Month</p>
                                <p className="mb-1 font-bold text-gray-900 text-3xl">{thisMonthCount}</p>
                                <p className="text-gray-500 text-xs">Attendance days</p>
                            </div>
                            <div className="flex justify-center items-center bg-blue-100 rounded-xl w-16 h-16 text-3xl group-hover:scale-110 transition-transform duration-300">
                                📅
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-attendance"
                        className="group bg-white shadow-md hover:shadow-xl p-6 border border-gray-200 hover:border-green-300 rounded-xl transition-all duration-300"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <p className="mb-1 font-medium text-gray-600 text-sm">Present</p>
                                <p className="mb-1 font-bold text-gray-900 text-3xl">{presentCount}</p>
                                <p className="text-gray-500 text-xs">On time days</p>
                            </div>
                            <div className="flex justify-center items-center bg-green-100 rounded-xl w-16 h-16 text-3xl group-hover:scale-110 transition-transform duration-300">
                                ✅
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-attendance"
                        className="group bg-white shadow-md hover:shadow-xl p-6 border border-gray-200 hover:border-yellow-300 rounded-xl transition-all duration-300"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <p className="mb-1 font-medium text-gray-600 text-sm">Late</p>
                                <p className="mb-1 font-bold text-gray-900 text-3xl">{lateCount}</p>
                                <p className="text-gray-500 text-xs">Late arrivals</p>
                            </div>
                            <div className="flex justify-center items-center bg-yellow-100 rounded-xl w-16 h-16 text-3xl group-hover:scale-110 transition-transform duration-300">
                                ⏰
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-qr"
                        className="group bg-white shadow-md hover:shadow-xl p-6 border border-gray-200 hover:border-purple-300 rounded-xl transition-all duration-300"
                    >
                        <div className="flex justify-between items-center">
                            <div className="flex-1">
                                <p className="mb-1 font-medium text-gray-600 text-sm">QR Code</p>
                                <p className="mb-1 font-bold text-gray-900 text-3xl">📱</p>
                                <p className="text-gray-500 text-xs">View QR code</p>
                            </div>
                            <div className="flex justify-center items-center bg-purple-100 rounded-xl w-16 h-16 text-3xl group-hover:scale-110 transition-transform duration-300">
                                📱
                            </div>
                        </div>
                    </Link>
                </div>

                {/* Quick Actions */}
                <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
                    <Link
                        href="/my-qr"
                        className="group bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 hover:border-indigo-300 rounded-xl transition-all duration-300"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex justify-center items-center bg-indigo-100 rounded-lg w-12 h-12 text-2xl group-hover:scale-110 transition-transform duration-300">
                                📱
                            </div>
                            <div>
                                <h3 className="mb-1 font-semibold text-gray-900 text-lg">My QR Code</h3>
                                <p className="text-gray-600 text-sm">View and share your QR code for attendance scanning</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-schedule"
                        className="group bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 hover:border-blue-300 rounded-xl transition-all duration-300"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-12 h-12 text-2xl group-hover:scale-110 transition-transform duration-300">
                                📅
                            </div>
                            <div>
                                <h3 className="mb-1 font-semibold text-gray-900 text-lg">My Schedule</h3>
                                <p className="text-gray-600 text-sm">Manage your work schedule and days</p>
                            </div>
                        </div>
                    </Link>

                    <Link
                        href="/my-attendance"
                        className="group bg-white shadow-md hover:shadow-lg p-6 border border-gray-200 hover:border-green-300 rounded-xl transition-all duration-300"
                    >
                        <div className="flex items-center space-x-4">
                            <div className="flex justify-center items-center bg-green-100 rounded-lg w-12 h-12 text-2xl group-hover:scale-110 transition-transform duration-300">
                                ✅
                            </div>
                            <div>
                                <h3 className="mb-1 font-semibold text-gray-900 text-lg">My Attendance</h3>
                                <p className="text-gray-600 text-sm">View your attendance history and records</p>
                            </div>
                        </div>
                    </Link>
                </div>
            </div>
        </UserLayout>
    );
}
