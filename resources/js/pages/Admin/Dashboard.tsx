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
        checked_in: number;
        checked_out: number;
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
    check_in: string | null;
    check_out: string | null;
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
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl shadow-lg p-6 text-white">
                    <h1 className="text-3xl font-bold mb-2">Welcome to Admin Dashboard</h1>
                    <p className="text-indigo-100">Monitor and manage your attendance system</p>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {statCards.map((card, index) => (
                        <Link
                            key={index}
                            href={card.link}
                            className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 p-6 border border-gray-200 hover:border-indigo-300 group"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-600 mb-1">{card.title}</p>
                                    <p className="text-3xl font-bold text-gray-900 mb-1">{card.value}</p>
                                    <p className="text-xs text-gray-500">{card.subtitle}</p>
                                </div>
                                <div className={`${card.color} w-16 h-16 rounded-xl flex items-center justify-center text-3xl group-hover:scale-110 transition-transform duration-300`}>
                                    {card.icon}
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>

                {/* Today's Quick Stats */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Today's Activity</h2>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Checked In</span>
                                <span className="text-lg font-bold text-blue-600">{stats.today.checked_in}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Checked Out</span>
                                <span className="text-lg font-bold text-green-600">{stats.today.checked_out}</span>
                            </div>
                            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                                <span className="text-sm font-medium text-gray-700">Pending Checkout</span>
                                <span className="text-lg font-bold text-yellow-600">
                                    {stats.today.checked_in - stats.today.checked_out}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Top Users */}
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4">Top Users This Month</h2>
                        <div className="space-y-3">
                            {topUsers.length > 0 ? (
                                topUsers.map((user, index) => (
                                    <div
                                        key={user.id}
                                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                                    >
                                        <div className="flex items-center space-x-3">
                                            <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                                                {index + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                                                <p className="text-xs text-gray-500">{user.email}</p>
                                            </div>
                                        </div>
                                        <span className="text-sm font-bold text-indigo-600">{user.attendances_count} days</span>
                                    </div>
                                ))
                            ) : (
                                <p className="text-sm text-gray-500 text-center py-4">No data available</p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Recent Attendances */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-gray-900">Recent Attendances</h2>
                        <Link
                            href="/admin/attendances"
                            className="text-sm font-medium text-indigo-600 hover:text-indigo-800"
                        >
                            View All →
                        </Link>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
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
                                {recentAttendances.length > 0 ? (
                                    recentAttendances.map((attendance) => (
                                        <tr key={attendance.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">{attendance.user.name}</div>
                                                    <div className="text-sm text-gray-500">{attendance.user.email}</div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {formatDate(attendance.date)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatTime(attendance.check_in)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                {formatTime(attendance.check_out)}
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
                                        <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
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
