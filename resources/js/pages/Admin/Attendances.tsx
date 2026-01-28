import { Link, router } from '@inertiajs/react';
import { useState } from 'react';
import Swal from 'sweetalert2';
import AdminLayout from '../../components/AdminLayout';

interface User {
    id: number;
    name: string;
    email: string;
    role?: string;
    user_id?: number;
}

interface Attendance {
    id: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    total_time: string | null;
    is_overtime?: boolean;
    user: User;
}

interface AttendancesProps {
    attendances: {
        data: Attendance[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
    users: User[];
    filters: {
        start_date?: string;
        end_date?: string;
        user_id?: string;
        status?: string;
        search?: string;
        week?: string;
        month?: string;
        year?: string;
    };
}

export default function AdminAttendances({ attendances, users, filters: initialFilters }: AttendancesProps) {
    const [filters, setFilters] = useState({
        start_date: initialFilters.start_date || '',
        end_date: initialFilters.end_date || '',
        user_id: initialFilters.user_id || '',
        status: initialFilters.status || '',
        search: initialFilters.search || '',
        week: initialFilters.week || '',
        month: initialFilters.month || '',
        year: initialFilters.year || '',
    });

    const [showFilters, setShowFilters] = useState(false);
    const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
    const [editForm, setEditForm] = useState<{ time_in: string; time_out: string }>({ time_in: '', time_out: '' });
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState<{ user_id: string; date: string; time_in: string; time_out: string }>({
        user_id: '',
        date: new Date().toISOString().split('T')[0],
        time_in: '',
        time_out: '',
    });

    const handleFilterChange = (key: string, value: string): void => {
        setFilters({ ...filters, [key]: value });
    };

    const applyFilters = (): void => {
        router.get('/admin/attendances', filters, {
            preserveState: true,
            preserveScroll: true,
        });
    };

    const clearFilters = (): void => {
        const clearedFilters = {
            start_date: '',
            end_date: '',
            user_id: '',
            status: '',
            search: '',
            week: '',
            month: '',
            year: '',
        };
        setFilters(clearedFilters);
        router.get('/admin/attendances', {}, {
            preserveState: true,
            preserveScroll: true,
        });
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

    const formatDate = (dateString: string): string => {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    };

    const formatTime = (timeString: string | null): string => {
        if (!timeString) return '-';
        // Parse the datetime string
        const date = new Date(timeString);
        // Check if date is valid
        if (isNaN(date.getTime())) {
            return '-';
        }
        // Extract time components from UTC to avoid timezone conversion issues
        // The datetime string from backend includes timezone info (Z for UTC)
        // We want to display the time as stored (UTC), not converted to local timezone
        const hours = date.getUTCHours();
        const minutes = date.getUTCMinutes();
        const period = hours >= 12 ? 'PM' : 'AM';
        const displayHours = hours % 12 || 12; // Convert to 12-hour format
        return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    };

    const formatTimeForInput = (timeString: string | null, dateString: string): string => {
        if (!timeString) return '';
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return '';
        // Format as datetime-local input format: YYYY-MM-DDTHH:mm
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${year}-${month}-${day}T${hours}:${minutes}`;
    };

    const formatTimeForTimeInput = (timeString: string | null): string => {
        if (!timeString) return '';
        const date = new Date(timeString);
        if (isNaN(date.getTime())) return '';
        // Format as time input format: HH:mm
        const hours = String(date.getUTCHours()).padStart(2, '0');
        const minutes = String(date.getUTCMinutes()).padStart(2, '0');
        return `${hours}:${minutes}`;
    };

    const handleEdit = (attendance: Attendance): void => {
        setEditingAttendance(attendance);
        setEditForm({
            time_in: formatTimeForTimeInput(attendance.time_in),
            time_out: formatTimeForTimeInput(attendance.time_out),
        });
    };

    const handleCancelEdit = (): void => {
        setEditingAttendance(null);
        setEditForm({ time_in: '', time_out: '' });
    };

    const handleSaveEdit = async (): Promise<void> => {
        if (!editingAttendance) return;

        setSaving(true);

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            
            // Combine the attendance date with the time inputs
            const dateStr = editingAttendance.date;
            const timeInValue = editForm.time_in ? `${dateStr}T${editForm.time_in}` : null;
            const timeOutValue = editForm.time_out ? `${dateStr}T${editForm.time_out}` : null;
            
            const response = await fetch(`/api/admin/attendances/${editingAttendance.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    time_in: timeInValue,
                    time_out: timeOutValue,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Attendance updated successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                setEditingAttendance(null);
                setEditForm({ time_in: '', time_out: '' });
                router.reload({ only: ['attendances'] });
            } else {
                throw new Error(data.message || 'Failed to update attendance');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to update attendance',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleAddAttendance = (): void => {
        setShowAddModal(true);
        setAddForm({
            user_id: '',
            date: new Date().toISOString().split('T')[0],
            time_in: '',
            time_out: '',
        });
    };

    const handleCancelAdd = (): void => {
        setShowAddModal(false);
        setAddForm({
            user_id: '',
            date: new Date().toISOString().split('T')[0],
            time_in: '',
            time_out: '',
        });
    };

    const handleSaveAdd = async (): Promise<void> => {
        if (!addForm.user_id || !addForm.date) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please select a user and date',
            });
            return;
        }

        setSaving(true);

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            
            // Combine date with time for datetime-local format
            const timeInValue = addForm.time_in ? `${addForm.date}T${addForm.time_in}` : null;
            const timeOutValue = addForm.time_out ? `${addForm.date}T${addForm.time_out}` : null;

            const response = await fetch('/api/admin/attendances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    user_id: parseInt(addForm.user_id),
                    date: addForm.date,
                    time_in: timeInValue,
                    time_out: timeOutValue,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Attendance recorded successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                setShowAddModal(false);
                setAddForm({
                    user_id: '',
                    date: new Date().toISOString().split('T')[0],
                    time_in: '',
                    time_out: '',
                });
                router.reload({ only: ['attendances'] });
            } else {
                throw new Error(data.message || 'Failed to record attendance');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to record attendance',
            });
        } finally {
            setSaving(false);
        }
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

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-gray-900 text-3xl">Attendance Logs</h1>
                        <p className="mt-1 text-gray-600">View and filter all attendance records</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        <button
                            onClick={handleAddAttendance}
                            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span>Record Attendance</span>
                        </button>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="bg-white hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                        >
                            {showFilters ? 'Hide' : 'Show'} Filters
                        </button>
                    </div>
                </div>

                {/* Filters */}
                {showFilters && (
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">End Date</label>
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">User</label>
                                <select
                                    value={filters.user_id}
                                    onChange={(e) => handleFilterChange('user_id', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                >
                                    <option value="">All Users</option>
                                    {users.map((user) => (
                                        <option key={user.id} value={user.id.toString()}>
                                            {user.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Status</label>
                                <select
                                    value={filters.status}
                                    onChange={(e) => handleFilterChange('status', e.target.value)}
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                >
                                    <option value="">All Status</option>
                                    <option value="Present">Present</option>
                                    <option value="Late">Late</option>
                                    <option value="Unscheduled">Unscheduled</option>
                                </select>
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Search</label>
                                <input
                                    type="text"
                                    value={filters.search}
                                    onChange={(e) => handleFilterChange('search', e.target.value)}
                                    placeholder="Name or email..."
                                    className="px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                        </div>
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
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

                {/* Stats Summary */}
                <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Total Records</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">{attendances.total}</p>
                            </div>
                            <div className="flex justify-center items-center bg-indigo-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">📊</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Current Page</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">
                                    {attendances.current_page} / {attendances.last_page}
                                </p>
                            </div>
                            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">📄</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Records Per Page</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">{attendances.per_page}</p>
                            </div>
                            <div className="flex justify-center items-center bg-green-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">📋</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Attendance Table */}
                <div className="bg-white shadow-md border border-gray-200 rounded-xl overflow-hidden">
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
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Total Time
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {attendances.data.length > 0 ? (
                                    attendances.data.map((attendance) => (
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
                                            <td className="px-6 py-4 text-gray-900 text-sm whitespace-nowrap">
                                                {formatTotalTime(attendance.total_time, attendance.is_overtime)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <button
                                                    onClick={() => handleEdit(attendance)}
                                                    className="text-indigo-600 hover:text-indigo-900 transition-colors"
                                                    title="Edit attendance"
                                                >
                                                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={2}
                                                            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                                        />
                                                    </svg>
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="px-6 py-4 text-gray-500 text-center">
                                            No attendance records found
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Pagination */}
                    {attendances.last_page > 1 && (
                        <div className="bg-gray-50 px-6 py-4 border-gray-200 border-t">
                            <div className="flex justify-between items-center">
                                <div className="text-gray-700 text-sm">
                                    Showing {((attendances.current_page - 1) * attendances.per_page) + 1} to{' '}
                                    {Math.min(attendances.current_page * attendances.per_page, attendances.total)} of{' '}
                                    {attendances.total} results
                                </div>
                                <div className="flex items-center space-x-2">
                                    {attendances.links.map((link, index) => {
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
                                            <Link
                                                key={index}
                                                href={link.url || '#'}
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

                {/* Add Attendance Modal */}
                {showAddModal && (
                    <div
                        className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 w-full h-full overflow-y-auto animate-fadeIn"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleCancelAdd();
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md transition-all animate-slideUp transform">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">Record Attendance</h3>
                                    <button
                                        onClick={handleCancelAdd}
                                        className="hover:bg-gray-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">User *</label>
                                        <select
                                            value={addForm.user_id}
                                            onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                            required
                                        >
                                            <option value="">Select User...</option>
                                            {users
                                                .filter((user) => !user.role || user.role !== 'admin')
                                                .map((user) => (
                                                    <option key={user.id} value={user.id}>
                                                        {user.name} #{user.user_id || user.id}
                                                    </option>
                                                ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Date *</label>
                                        <input
                                            type="date"
                                            value={addForm.date}
                                            onChange={(e) => setAddForm({ ...addForm, date: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Time In</label>
                                        <input
                                            type="time"
                                            value={addForm.time_in}
                                            onChange={(e) => setAddForm({ ...addForm, time_in: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Time Out</label>
                                        <input
                                            type="time"
                                            value={addForm.time_out}
                                            onChange={(e) => setAddForm({ ...addForm, time_out: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-gray-200 border-t">
                                    <button
                                        onClick={handleCancelAdd}
                                        disabled={saving}
                                        className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveAdd}
                                        disabled={saving || !addForm.user_id || !addForm.date}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-colors"
                                    >
                                        {saving ? 'Saving...' : 'Record Attendance'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingAttendance && (
                    <div
                        className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 w-full h-full overflow-y-auto animate-fadeIn"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleCancelEdit();
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md transition-all animate-slideUp transform">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">Edit Attendance</h3>
                                    <button
                                        onClick={handleCancelEdit}
                                        className="hover:bg-gray-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">User</label>
                                        <div className="bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm">
                                            {editingAttendance.user.name} #{editingAttendance.user.user_id || editingAttendance.user.id}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Date</label>
                                        <div className="bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm">
                                            {formatDate(editingAttendance.date)}
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Time In</label>
                                        <input
                                            type="time"
                                            value={editForm.time_in}
                                            onChange={(e) => setEditForm({ ...editForm, time_in: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Time Out</label>
                                        <input
                                            type="time"
                                            value={editForm.time_out}
                                            onChange={(e) => setEditForm({ ...editForm, time_out: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-gray-200 border-t">
                                    <button
                                        onClick={handleCancelEdit}
                                        disabled={saving}
                                        className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSaveEdit}
                                        disabled={saving}
                                        className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-colors"
                                    >
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
