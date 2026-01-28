import { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';

interface Attendance {
    id: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    total_time: string | null;
    is_overtime?: boolean;
}

export default function MyAttendance() {
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [pagination, setPagination] = useState<{
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({
        week: '',
        month: '',
        year: '',
        search: '',
    });
    const [showFilters, setShowFilters] = useState(false);

    const fetchAttendances = (page: number = 1): void => {
        setLoading(true);
        const params = new URLSearchParams();
        params.append('page', page.toString());
        if (filters.week) params.append('week', filters.week);
        if (filters.month) params.append('month', filters.month);
        if (filters.year) params.append('year', filters.year);
        if (filters.search) params.append('search', filters.search);

        fetch(`/api/attendances?${params.toString()}`)
            .then((res) => res.json())
            .then((data) => {
                // Laravel pagination returns data directly with pagination metadata
                if (data.data && Array.isArray(data.data) && data.current_page !== undefined) {
                    // Paginated response
                    setAttendances(data.data);
                    setPagination({
                        current_page: data.current_page || 1,
                        last_page: data.last_page || 1,
                        per_page: data.per_page || 10,
                        total: data.total || 0,
                        links: data.links || [],
                    });
                } else if (Array.isArray(data)) {
                    // Non-paginated response (fallback)
                    setAttendances(data);
                    setPagination(null);
                } else if (data.data && Array.isArray(data.data)) {
                    // Response wrapped in data key
                    setAttendances(data.data);
                    setPagination(null);
                } else {
                    setAttendances([]);
                    setPagination(null);
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching attendances:', error);
                setLoading(false);
            });
    };

    useEffect(() => {
        fetchAttendances();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleFilterChange = (key: string, value: string): void => {
        setFilters({ ...filters, [key]: value });
    };

    const applyFilters = (): void => {
        fetchAttendances(1);
    };

    const clearFilters = (): void => {
        const clearedFilters = {
            week: '',
            month: '',
            year: '',
            search: '',
        };
        setFilters(clearedFilters);
        setTimeout(() => {
            fetchAttendances();
        }, 0);
    };

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    };

    const formatTime = (timeString: string | null): string => {
        if (!timeString) return '-';
        const date = new Date(timeString);
        if (isNaN(date.getTime())) {
            return '-';
        }
        // Extract time components from UTC to avoid timezone conversion issues
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12; // Convert to 12-hour format
        return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const formatTotalTime = (totalTime: string | null, isOvertime?: boolean): React.JSX.Element | string => {
        if (!totalTime) return '-';
        if (isOvertime && totalTime.includes('Overtime:')) {
            // Format: "8 Hours (Overtime: +3 Hours)"
            return (
                <span>
                    <span>{totalTime.split('(')[0]}</span>
                    <span className="font-semibold text-green-600"> ({totalTime.split('(')[1]}</span>
                </span>
            );
        }
        return totalTime;
    };

    const calculateWeeklyTotalHours = (): { total: number; overtime: number } => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weekAttendances = attendances.filter((attendance) => {
            const attendanceDate = new Date(attendance.date);
            return attendanceDate >= startOfWeek && attendanceDate <= endOfWeek && attendance.total_time;
        });

        let totalHours = 0;
        let overtimeHours = 0;

        weekAttendances.forEach((attendance) => {
            if (!attendance.total_time) return;

            // Parse total_time string: "8 Hours" or "8 Hours (Overtime: +2 Hours)"
            const timeMatch = attendance.total_time.match(/([\d.]+)\s*Hours/);
            if (timeMatch) {
                const hours = parseFloat(timeMatch[1]);
                totalHours += hours;

                // Check for overtime
                const overtimeMatch = attendance.total_time.match(/Overtime:\s*\+([\d.]+)\s*Hours/);
                if (overtimeMatch) {
                    overtimeHours += parseFloat(overtimeMatch[1]);
                }
            }
        });

        return { total: totalHours, overtime: overtimeHours };
    };

    const getStatusColor = (status: string): string => {
        switch (status) {
            case 'Present':
                return 'bg-green-100 text-green-800 border-green-200';
            case 'Late':
                return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'Absent':
                return 'bg-red-100 text-red-800 border-red-200';
            case 'No Time Out':
                return 'bg-orange-100 text-orange-800 border-orange-200';
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
            case 'Absent':
                return '❌';
            case 'No Time Out':
                return '⚠️';
            case 'Unscheduled':
                return '📋';
            default:
                return '📋';
        }
    };

    if (loading) {
        return (
            <UserLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                        <div className="mx-auto border-indigo-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
                        <p className="mt-4 text-gray-600">Loading attendance records...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-gray-900 text-3xl">My Attendance</h1>
                        <p className="mt-1 text-gray-600">View your attendance history and records</p>
                    </div>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="bg-white hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                    >
                        {showFilters ? 'Hide' : 'Show'} Filters
                    </button>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Week</label>
                                <input
                                    type="date"
                                    value={filters.week}
                                    onChange={(e) => handleFilterChange('week', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Month</label>
                                <input
                                    type="month"
                                    value={filters.month}
                                    onChange={(e) => handleFilterChange('month', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Year</label>
                                <input
                                    type="number"
                                    value={filters.year}
                                    onChange={(e) => handleFilterChange('year', e.target.value)}
                                    placeholder="YYYY"
                                    min="2000"
                                    max="2100"
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Search Date</label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="YYYY-MM-DD"
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                        </div>
                        <div className="flex justify-end items-center space-x-3 mt-4">
                            <button
                                onClick={clearFilters}
                                className="bg-gray-100 hover:bg-gray-200 px-4 py-2 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                            >
                                Clear
                            </button>
                            <button
                                onClick={applyFilters}
                                className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                            >
                                Apply Filters
                            </button>
                        </div>
                    </div>
                )}

                {/* Summary Cards */}
                <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Total Records</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">{attendances.length}</p>
                            </div>
                            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">📊</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Present Days</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">
                                    {attendances.filter((a) => a.status === 'Present').length}
                                </p>
                            </div>
                            <div className="flex justify-center items-center bg-green-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">✅</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Late Days</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">
                                    {attendances.filter((a) => a.status === 'Late').length}
                                </p>
                            </div>
                            <div className="flex justify-center items-center bg-yellow-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">⏰</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md p-6 border border-indigo-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-indigo-700 text-sm">Total Hours This Week</p>
                                <p className="mt-1 font-bold text-indigo-900 text-2xl">
                                    {(() => {
                                        const { total, overtime } = calculateWeeklyTotalHours();
                                        if (overtime > 0) {
                                            return (
                                                <span>
                                                    {total.toFixed(1)}h
                                                    <span className="ml-2 text-green-600 text-lg">(+{overtime.toFixed(1)}h OT)</span>
                                                </span>
                                            );
                                        }
                                        return `${total.toFixed(1)}h`;
                                    })()}
                                </p>
                            </div>
                            <div className="flex justify-center items-center bg-indigo-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">⏱️</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white shadow-md border border-gray-200 rounded-xl overflow-hidden">
                    <div className="bg-gray-50 px-6 py-4 border-gray-200 border-b">
                        <h2 className="font-semibold text-gray-900 text-lg">Attendance History</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="divide-y divide-gray-200 min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Time In
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Time Out
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Total Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-12 text-center">
                                            <div className="mb-3 text-gray-400 text-4xl">📋</div>
                                            <p className="font-medium text-gray-500">No attendance records found</p>
                                            <p className="mt-1 text-gray-400 text-sm">Your attendance records will appear here</p>
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
                                                <div className="font-medium text-gray-900 text-sm">{formatDate(attendance.date)}</div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-gray-500 text-sm">
                                                    {formatTime(attendance.time_in) !== '-' ? (
                                                        <span className="font-medium text-gray-900">{formatTime(attendance.time_in)}</span>
                                                    ) : (
                                                        <span className="text-gray-400">-</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="text-gray-500 text-sm">
                                                    {formatTime(attendance.time_out) !== '-' ? (
                                                        <span className="font-medium text-gray-900">{formatTime(attendance.time_out)}</span>
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
                                            <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                                                {formatTotalTime(attendance.total_time, attendance.is_overtime)}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {pagination && pagination.last_page > 1 && (
                        <div className="bg-gray-50 px-6 py-4 border-gray-200 border-t">
                            <div className="flex justify-between items-center">
                                <div className="text-gray-700 text-sm">
                                    Showing {((pagination.current_page - 1) * pagination.per_page) + 1} to{' '}
                                    {Math.min(pagination.current_page * pagination.per_page, pagination.total)} of{' '}
                                    {pagination.total} results
                                </div>
                                <div className="flex items-center space-x-2">
                                    {pagination.links.map((link, index) => {
                                        if (link.url === null) {
                                            return (
                                                <span
                                                    key={index}
                                                    className={`px-3 py-2 text-sm font-medium ${
                                                        link.active
                                                            ? 'bg-indigo-600 text-white'
                                                            : 'bg-white text-gray-500 cursor-not-allowed'
                                                    } rounded-lg border border-gray-300`}
                                                    dangerouslySetInnerHTML={{ __html: link.label }}
                                                />
                                            );
                                        }
                                        return (
                                            <button
                                                key={index}
                                                onClick={() => {
                                                    if (link.url) {
                                                        const url = new URL(link.url, window.location.origin);
                                                        const page = url.searchParams.get('page') || '1';
                                                        fetchAttendances(parseInt(page, 10));
                                                    }
                                                }}
                                                className={`px-3 py-2 text-sm font-medium rounded-lg border transition-colors ${
                                                    link.active
                                                        ? 'bg-indigo-600 text-white border-indigo-600'
                                                        : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                                                }`}
                                                dangerouslySetInnerHTML={{ __html: link.label }}
                                            />
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    )}
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
