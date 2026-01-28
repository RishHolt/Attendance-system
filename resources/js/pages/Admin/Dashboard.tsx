import { Link } from '@inertiajs/react';
import AdminLayout from '../../components/AdminLayout';

interface Stats {
    users: {
        total: number;
        admins: number;
        regular: number;
    };
    today: {
        total: number;
        present: number;
        late: number;
        absent: number;
        timed_in: number;
        timed_out: number;
    };
    week: {
        total: number;
        present: number;
        late: number;
    };
    month: {
        total: number;
        present: number;
        late: number;
    };
}

interface User {
    id: number;
    name: string;
    email: string;
    attendances_count: number;
}

interface Attendance {
    id: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    user: {
        id: number;
        name: string;
        email: string;
    };
}

interface DashboardProps {
    stats: Stats;
    recentAttendances: Attendance[];
    topUsers: User[];
}

export default function AdminDashboard({ stats, recentAttendances, topUsers }: DashboardProps) {
    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

    const statCards = [
        {
            title: 'Total Users',
            value: stats.users.total,
            subtitle: `${stats.users.regular} regular, ${stats.users.admins} admins`,
            icon: '👥',
            color: 'bg-blue-500',
            link: '/admin/users',
        },
        {
            title: "Today's Attendance",
            value: stats.today.total,
            subtitle: `${stats.today.present} present, ${stats.today.late} late`,
            icon: '📊',
            color: 'bg-green-500',
            link: '/admin/attendances',
        },
        {
            title: 'This Week',
            value: stats.week.total,
            subtitle: `${stats.week.present} present, ${stats.week.late} late`,
            icon: '📅',
            color: 'bg-purple-500',
            link: '/admin/attendances',
        },
        {
            title: 'This Month',
            value: stats.month.total,
            subtitle: `${stats.month.present} present, ${stats.month.late} late`,
            icon: '📈',
            color: 'bg-indigo-500',
            link: '/admin/attendances',
        },
    ];

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Welcome Section */}
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 shadow-lg p-6 rounded-xl text-white">
                    <h1 className="mb-2 font-bold text-3xl">Welcome to Admin Dashboard</h1>
                    <p className="text-indigo-100">Monitor and manage your attendance system</p>
                </div>

                {/* Stats Cards */}
                <div className="gap-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
                    {statCards.map((card, index) => (
                        <Link
                            key={index}
                            href={card.link}
                            className="group bg-white shadow-md hover:shadow-xl p-6 border border-gray-200 hover:border-indigo-300 rounded-xl transition-all duration-300"
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex-1">
                                    <p className="mb-1 font-medium text-gray-600 text-sm">{card.title}</p>
                                    <p className="mb-1 font-bold text-gray-900 text-3xl">{card.value}</p>
                                    <p className="text-gray-500 text-xs">{card.subtitle}</p>
                                </div>
                                <div className={`${card.color} w-16 h-16 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300`}>
                                    {card.icon}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Today's Quick Stats */}
                <div className="gap-6 grid grid-cols-1 md:grid-cols-2">
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <h2 className="mb-4 font-semibold text-gray-900 text-lg">Today's Activity</h2>
                        <div className="space-y-3">
                            <div className="flex justify-between items-center bg-blue-50 p-3 rounded-lg">
                                <span className="font-medium text-gray-700 text-sm">Timed In</span>
                                <span className="font-bold text-blue-600 text-lg">{stats.today.timed_in}</span>
                            </div>
                            <div className="flex justify-between items-center bg-green-50 p-3 rounded-lg">
                                <span className="font-medium text-gray-700 text-sm">Timed Out</span>
                                <span className="font-bold text-green-600 text-lg">{stats.today.timed_out}</span>
                            </div>
                            <div className="flex justify-between items-center bg-yellow-50 p-3 rounded-lg">
                                <span className="font-medium text-gray-700 text-sm">Late</span>
                                <span className="font-bold text-yellow-600 text-lg">{stats.today.late}</span>
                            </div>
                            <div className="flex justify-between items-center bg-red-50 p-3 rounded-lg">
                                <span className="font-medium text-gray-700 text-sm">Absent</span>
                                <span className="font-bold text-red-600 text-lg">{stats.today.absent || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Top Users */}
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <h2 className="mb-4 font-semibold text-gray-900 text-lg">Most Active</h2>
                        <div className="space-y-3">
                            {topUsers.length > 0 ? (
                                topUsers.map((user, index) => (
                                    <div
                                        key={user.id}
                                        className="flex justify-between items-center bg-gray-50 hover:bg-gray-100 p-3 rounded-lg transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="flex justify-center items-center bg-indigo-600 rounded-full w-8 h-8 font-semibold text-white text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="font-medium text-gray-900 text-sm">{user.name}</p>
                                                <p className="text-gray-500 text-xs">{user.email}</p>
                                            </div>
                                        </div>
                                        <span className="font-bold text-indigo-600 text-sm">{user.attendances_count} days</span>
                                    </div>
                                ))
                            ) : (
                                <p className="py-4 text-gray-500 text-sm text-center">No data available</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Attendances */}
                <div className="bg-white shadow-md border border-gray-200 rounded-xl overflow-hidden">
                    <div className="flex justify-between items-center px-6 py-4 border-gray-200 border-b">
                        <h2 className="font-semibold text-gray-900 text-lg">Recent Attendances</h2>
                        <Link
                            href="/admin/attendances"
                            className="font-medium text-indigo-600 hover:text-indigo-800 text-sm"
                        >
                            View All →
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="divide-y divide-gray-200 min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        User
                                    </th>
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
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {recentAttendances.length > 0 ? (
                                    recentAttendances.map((attendance) => (
                                        <tr key={attendance.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">{attendance.user.name}</div>
                                                    <div className="text-gray-500 text-sm">{attendance.user.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                                                {formatDate(attendance.date)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                                                {formatTime(attendance.time_in)}
                                            </td>
                                            <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                                                {formatTime(attendance.time_out)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span
                                                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusColor(attendance.status)}`}
                                                >
                                                    {attendance.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-4 text-gray-500 text-center">
                                            No recent attendances
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
