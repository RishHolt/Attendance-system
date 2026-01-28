import { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';

interface Attendance {
    id: number;
    date: string;
    check_in: string | null;
    check_out: string | null;
    status: string;
}

export default function MyAttendance() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/attendances')
            .then((res) => res.json())
            .then((data) => {
                setAttendances(data.data || data || []);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching attendances:', error);
                setLoading(false);
            });
    }, []);

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (timeString: string | null): string => {
        if (!timeString) return '-';
        const date = new Date(timeString);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'Present':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'Late':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Unscheduled':
                return 'bg-gray-100 text-gray-800 border-gray-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string): string => {
        switch (status) {
            case 'Present':
                return '✅';
            case 'Late':
                return '⏰';
            case 'Unscheduled':
                return '📋';
            default:
                return '📋';
        }
    };

    if (loading) {
        return (
            <UserLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading attendance records...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <div className="space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Attendance</h1>
                    <p className="text-gray-600 mt-1">View your attendance history and records</p>
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Records</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{attendances.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">📊</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Present Days</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {attendances.filter((a) => a.status === 'Present').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">✅</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Late Days</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {attendances.filter((a) => a.status === 'Late').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">⏰</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                        <h2 className="text-lg font-semibold text-gray-900">Attendance History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Check In
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Check Out
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Status
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="px-6 py-12 text-center">
                                            <div className="text-gray-400 text-4xl mb-3">📋</div>
                                            <p className="text-gray-500 font-medium">No attendance records found</p>
                                            <p className="text-sm text-gray-400 mt-1">Your attendance records will appear here</p>
                                        </td>
                                    </tr>
                                ) : (
                                    attendances.map((attendance, index) => (
                                        <tr
                                            key={attendance.id}
                                            className="hover:bg-gray-50 transition-colors"
                                            style={{
                                                animation: `fadeIn 0.3s ease-in-out ${index * 0.05}s both`,
                                            }}
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm font-medium text-gray-900">{formatDate(attendance.date)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {formatTime(attendance.check_in) !== '-' ? (
                                                        <span className="font-medium text-gray-900">{formatTime(attendance.check_in)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-sm text-gray-500">
                                                    {formatTime(attendance.check_out) !== '-' ? (
                                                        <span className="font-medium text-gray-900">{formatTime(attendance.check_out)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-3 py-1 inline-flex items-center text-xs leading-5 font-semibold rounded-full border ${getStatusColor(attendance.status)}`}
                                                >
                                                    <span className="mr-1">{getStatusIcon(attendance.status)}</span>
                                                    {attendance.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </UserLayout>
    );
}
