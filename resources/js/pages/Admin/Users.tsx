import { router } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import AdminLayout from '../../components/AdminLayout';

interface User {
    id: number;
    name: string;
    email: string;
    role: string;
    qr_token: string | null;
    attendances_count: number;
    schedules_count: number;
    created_at: string;
}

interface Schedule {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_time: string | null;
    break_time_hour: number;
}

interface UsersPageProps {
    users: {
        data: User[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday' },
    { value: 1, label: 'Monday' },
    { value: 2, label: 'Tuesday' },
    { value: 3, label: 'Wednesday' },
    { value: 4, label: 'Thursday' },
    { value: 5, label: 'Friday' },
    { value: 6, label: 'Saturday' },
];

export default function Users({ users: initialUsers }: UsersPageProps) {
    const [users, setUsers] = useState<User[]>(initialUsers.data || initialUsers);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingScheduleUser, setEditingScheduleUser] = useState<User | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
    const [scheduleData, setScheduleData] = useState<Record<number, { start_time: string; end_time: string; break_time: string; break_time_hour: number }>>({});
    const [customScheduleDays, setCustomScheduleDays] = useState<Set<number>>(new Set());
    const [defaultTime, setDefaultTime] = useState({ start_time: '08:00', end_time: '17:00', break_time: '12:00', break_time_hour: 1 });
    const [loadingSchedules, setLoadingSchedules] = useState(false);
    const [savingSchedule, setSavingSchedule] = useState(false);
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        role: 'user',
        password: '',
    });
    const [createForm, setCreateForm] = useState({
        name: '',
        email: '',
        role: 'user',
        password: '',
        password_confirmation: '',
    });

    useEffect(() => {
        setUsers(initialUsers.data || initialUsers);
    }, [initialUsers]);

    const handleEdit = (user: User): void => {
        setEditingUser(user);
        setEditForm({
            name: user.name,
            email: user.email,
            role: user.role,
            password: '',
        });
    };

    const handleEditSchedule = async (user: User): Promise<void> => {
        setEditingScheduleUser(user);
        setShowScheduleModal(true);
        setLoadingSchedules(true);

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            const response = await fetch(`/api/admin/users/${user.id}/schedules`, {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });

            if (!response.ok) {
                if (response.status === 419) {
                    throw new Error('Session expired. Please refresh the page and try again.');
                }
                throw new Error(`Failed to fetch schedules: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            setSchedules(data);

            const days = new Set<number>(data.map((s: Schedule) => s.day_of_week));
            setSelectedDays(days);

            const scheduleMap: Record<number, { start_time: string; end_time: string; break_time: string; break_time_hour: number }> = {};
            const customDays = new Set<number>();
            data.forEach((s: Schedule) => {
                const startTime = s.start_time.substring(0, 5);
                const endTime = s.end_time.substring(0, 5);
                const breakTime = s.break_time ? s.break_time.substring(0, 5) : '12:00';
                const breakTimeHour = s.break_time_hour || 1;
                
                scheduleMap[s.day_of_week] = {
                    start_time: startTime,
                    end_time: endTime,
                    break_time: breakTime,
                    break_time_hour: breakTimeHour,
                };
                
                // Only mark as custom if times differ from default
                const isCustom = startTime !== defaultTime.start_time ||
                    endTime !== defaultTime.end_time ||
                    breakTime !== defaultTime.break_time ||
                    breakTimeHour !== defaultTime.break_time_hour;
                
                if (isCustom) {
                    customDays.add(s.day_of_week);
                }
            });
            setScheduleData(scheduleMap);
            setCustomScheduleDays(customDays);
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to load schedules',
            });
        } finally {
            setLoadingSchedules(false);
        }
    };

    const toggleDay = (day: number): void => {
        const newSelectedDays = new Set(selectedDays);
        if (newSelectedDays.has(day)) {
            newSelectedDays.delete(day);
            const newScheduleData = { ...scheduleData };
            delete newScheduleData[day];
            setScheduleData(newScheduleData);
            const newCustomDays = new Set(customScheduleDays);
            newCustomDays.delete(day);
            setCustomScheduleDays(newCustomDays);
        } else {
            newSelectedDays.add(day);
            // Don't set schedule data here - only when they add custom schedule
        }
        setSelectedDays(newSelectedDays);
    };

    const toggleCustomSchedule = (day: number): void => {
        const newCustomDays = new Set(customScheduleDays);
        if (newCustomDays.has(day)) {
            newCustomDays.delete(day);
            const newScheduleData = { ...scheduleData };
            delete newScheduleData[day];
            setScheduleData(newScheduleData);
        } else {
            newCustomDays.add(day);
            setScheduleData({
                ...scheduleData,
                [day]: {
                    start_time: defaultTime.start_time,
                    end_time: defaultTime.end_time,
                    break_time: defaultTime.break_time,
                    break_time_hour: defaultTime.break_time_hour,
                },
            });
        }
        setCustomScheduleDays(newCustomDays);
    };

    const updateScheduleTime = (day: number, field: 'start_time' | 'end_time' | 'break_time' | 'break_time_hour', value: string | number): void => {
        setScheduleData({
            ...scheduleData,
            [day]: {
                ...scheduleData[day],
                [field]: value,
            },
        });
    };

    const handleSaveSchedule = async (): Promise<void> => {
        if (!editingScheduleUser) {
            return;
        }

        setSavingSchedule(true);

        const schedulesToSave = Array.from(selectedDays).map((day) => {
            // If custom schedule exists, use it; otherwise use default
            if (customScheduleDays.has(day) && scheduleData[day]) {
                return {
                    day_of_week: day,
                    start_time: scheduleData[day].start_time,
                    end_time: scheduleData[day].end_time,
                    break_time: scheduleData[day].break_time || null,
                    break_time_hour: scheduleData[day].break_time_hour || 1,
                };
            }
            // Use default time for days without custom schedule
            return {
                day_of_week: day,
                start_time: defaultTime.start_time,
                end_time: defaultTime.end_time,
                break_time: defaultTime.break_time || null,
                break_time_hour: defaultTime.break_time_hour || 1,
            };
        });

        try {
            const response = await fetch(`/api/admin/users/${editingScheduleUser.id}/schedules`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
                body: JSON.stringify({ schedules: schedulesToSave }),
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error('Server returned non-JSON response');
            }

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Schedule updated successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['users'] });
                setShowScheduleModal(false);
                setEditingScheduleUser(null);
            } else {
                const errorMessage = data.errors
                    ? Object.values(data.errors).flat().join(', ')
                    : data.message || 'Failed to update schedule';
                throw new Error(errorMessage);
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to update schedule',
            });
        } finally {
            setSavingSchedule(false);
        }
    };

    const handleCreate = async (): Promise<void> => {
        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
                body: JSON.stringify(createForm),
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                const text = await response.text();
                throw new Error('Server returned non-JSON response. Please check the console.');
            }

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'User created successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['users'] });
                setShowCreateModal(false);
                setCreateForm({
                    name: '',
                    email: '',
                    role: 'user',
                    password: '',
                    password_confirmation: '',
                });
            } else {
                const errorMessage = data.errors
                    ? Object.values(data.errors).flat().join(', ')
                    : data.message || 'Failed to create user';
                throw new Error(errorMessage);
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to create user',
            });
        }
    };

    const handleUpdate = async (): Promise<void> => {
        if (!editingUser) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${editingUser.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
                body: JSON.stringify(editForm),
            });

            const contentType = response.headers.get('content-type');
            if (!contentType || !contentType.includes('application/json')) {
                throw new Error('Server returned non-JSON response');
            }

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'User updated successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['users'] });
                setEditingUser(null);
            } else {
                const errorMessage = data.errors
                    ? Object.values(data.errors).flat().join(', ')
                    : data.message || 'Failed to update user';
                throw new Error(errorMessage);
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to update user',
            });
        }
    };

    const handleDelete = async (user: User): Promise<void> => {
        const result = await Swal.fire({
            icon: 'warning',
            title: 'Are you sure?',
            text: `Do you want to delete ${user.name}? This action cannot be undone.`,
            showCancelButton: true,
            confirmButtonColor: '#d33',
            cancelButtonColor: '#3085d6',
            confirmButtonText: 'Yes, delete it!',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${user.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'User has been deleted.',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['users'] });
            } else {
                throw new Error(data.message || 'Failed to delete user');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to delete user',
            });
        }
    };

    const handleRegenerateQR = async (user: User): Promise<void> => {
        const result = await Swal.fire({
            icon: 'question',
            title: 'Regenerate QR Token?',
            text: `This will generate a new QR token for ${user.name}. The old QR code will no longer work.`,
            showCancelButton: true,
            confirmButtonText: 'Yes, regenerate',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            const response = await fetch(`/api/admin/users/${user.id}/regenerate-qr`, {
                method: 'POST',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                credentials: 'same-origin',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'QR token regenerated successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['users'] });
            } else {
                throw new Error(data.message || 'Failed to regenerate QR token');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to regenerate QR token',
            });
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-gray-900 text-3xl">User Management</h1>
                        <p className="mt-1 text-gray-600">Manage users, roles, and schedules</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg px-6 py-3 rounded-lg font-semibold text-white transition-all duration-200"
                    >
                        + Add User
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="gap-6 grid grid-cols-1 md:grid-cols-3">
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Total Users</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">{initialUsers.total || users.length}</p>
                            </div>
                            <div className="flex justify-center items-center bg-indigo-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Admins</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">
                                    {users.filter((u) => u.role === 'admin').length}
                                </p>
                            </div>
                            <div className="flex justify-center items-center bg-purple-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">👑</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white shadow-md p-6 border border-gray-200 rounded-xl">
                        <div className="flex justify-between items-center">
                            <div>
                                <p className="font-medium text-gray-600 text-sm">Regular Users</p>
                                <p className="mt-1 font-bold text-gray-900 text-2xl">
                                    {users.filter((u) => u.role === 'user').length}
                                </p>
                            </div>
                            <div className="flex justify-center items-center bg-blue-100 rounded-lg w-12 h-12">
                                <span className="text-2xl">👤</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white shadow-md border border-gray-200 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="divide-y divide-gray-200 min-w-full">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Schedules
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Attendances
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex justify-center items-center bg-indigo-100 mr-3 rounded-full w-10 h-10">
                                                    <span className="font-semibold text-indigo-600">
                                                        {user.name.charAt(0).toUpperCase()}
                                                    </span>
                                                </div>
                                                <div>
                                                    <div className="font-medium text-gray-900 text-sm">{user.name}</div>
                                                    <div className="text-gray-500 text-sm">{user.email}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${
                                                    user.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-800 border-purple-200'
                                                        : 'bg-blue-100 text-blue-800 border-blue-200'
                                                }`}
                                            >
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                                            <span className="font-medium">{user.schedules_count}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                                            <span className="font-medium">{user.attendances_count}</span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-500 text-sm whitespace-nowrap">
                                            {new Date(user.created_at).toLocaleDateString()}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-sm text-right whitespace-nowrap">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleEdit(user)}
                                                    className="bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-lg font-medium text-blue-600 text-xs transition-colors"
                                                    title="Edit User"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleEditSchedule(user)}
                                                    className="bg-indigo-50 hover:bg-indigo-100 px-3 py-1 rounded-lg font-medium text-indigo-600 text-xs transition-colors"
                                                    title="Edit Schedule"
                                                >
                                                    Schedule
                                                </button>
                                                <button
                                                    onClick={() => handleRegenerateQR(user)}
                                                    className="bg-green-50 hover:bg-green-100 px-3 py-1 rounded-lg font-medium text-green-600 text-xs transition-colors"
                                                    title="Regenerate QR"
                                                >
                                                    QR
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="bg-red-50 hover:bg-red-100 px-3 py-1 rounded-lg font-medium text-red-600 text-xs transition-colors"
                                                    title="Delete User"
                                                >
                                                    Delete
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination */}
                    {initialUsers.last_page > 1 && (
                        <div className="bg-gray-50 px-6 py-4 border-gray-200 border-t">
                            <div className="flex justify-between items-center">
                                <div className="text-gray-700 text-sm">
                                    Showing {((initialUsers.current_page - 1) * initialUsers.per_page) + 1} to{' '}
                                    {Math.min(initialUsers.current_page * initialUsers.per_page, initialUsers.total)} of{' '}
                                    {initialUsers.total} results
                                </div>
                                <div className="flex items-center space-x-2">
                                    {initialUsers.links.map((link, index) => {
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
                                                        router.get(link.url, {}, {
                                                            preserveState: true,
                                                            preserveScroll: true,
                                                        });
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

                {/* Schedule Modal */}
                {showScheduleModal && editingScheduleUser && (
                    <div 
                        className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 w-full h-full overflow-y-auto animate-fadeIn"
                                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowScheduleModal(false);
                                setEditingScheduleUser(null);
                                setSelectedDays(new Set());
                                setScheduleData({});
                                setCustomScheduleDays(new Set());
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-2xl transition-all animate-slideUp transform">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">
                                        Edit Schedule - {editingScheduleUser.name}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowScheduleModal(false);
                                            setEditingScheduleUser(null);
                                            setSelectedDays(new Set());
                                            setScheduleData({});
                                            setCustomScheduleDays(new Set());
                                        }}
                                        className="hover:bg-gray-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                {loadingSchedules ? (
                                    <div className="py-12 text-center">
                                        <div className="inline-block border-indigo-600 border-b-2 rounded-full w-8 h-8 animate-spin"></div>
                                        <p className="mt-4 text-gray-600">Loading schedules...</p>
                                    </div>
                                ) : (
                                    <>
                                        {/* Default Time Settings */}
                                        <div className="bg-indigo-50 mb-4 p-4 border border-indigo-200 rounded-lg">
                                            <h4 className="mb-3 font-semibold text-gray-900 text-sm">Default Time Settings</h4>
                                            <div className="gap-4 grid grid-cols-2">
                                                <div>
                                                    <label className="block mb-1 font-medium text-gray-700 text-xs">Start Time</label>
                                                    <input
                                                        type="time"
                                                        value={defaultTime.start_time}
                                                        onChange={(e) => setDefaultTime({ ...defaultTime, start_time: e.target.value })}
                                                        className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 font-medium text-gray-700 text-xs">End Time</label>
                                                    <input
                                                        type="time"
                                                        value={defaultTime.end_time}
                                                        onChange={(e) => setDefaultTime({ ...defaultTime, end_time: e.target.value })}
                                                        className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 font-medium text-gray-700 text-xs">Break Time</label>
                                                    <input
                                                        type="time"
                                                        value={defaultTime.break_time}
                                                        onChange={(e) => setDefaultTime({ ...defaultTime, break_time: e.target.value })}
                                                        className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block mb-1 font-medium text-gray-700 text-xs">Break Hours</label>
                                                    <input
                                                        type="number"
                                                        step="0.5"
                                                        min="0"
                                                        max="24"
                                                        value={defaultTime.break_time_hour}
                                                        onChange={(e) => setDefaultTime({ ...defaultTime, break_time_hour: parseFloat(e.target.value) || 1 })}
                                                        className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full text-sm"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-3 pr-2 max-h-96 overflow-y-auto">
                                            {DAYS_OF_WEEK.map((day) => (
                                                <div key={day.value} className="bg-gray-50/50 p-4 border border-gray-200 hover:border-indigo-300 rounded-xl transition-colors">
                                                    <div className="flex justify-between items-center">
                                                        <label className="flex flex-1 items-center space-x-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDays.has(day.value)}
                                                                onChange={() => toggleDay(day.value)}
                                                                className="rounded w-5 h-5 text-blue-600"
                                                            />
                                                            <span className="font-semibold text-gray-900">{day.label}</span>
                                                        </label>
                                                        {selectedDays.has(day.value) && !customScheduleDays.has(day.value) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCustomSchedule(day.value)}
                                                                className="bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg font-medium text-indigo-600 text-sm transition-colors"
                                                            >
                                                                + Add Custom Schedule
                                                            </button>
                                                        )}
                                                        {selectedDays.has(day.value) && customScheduleDays.has(day.value) && (
                                                            <button
                                                                type="button"
                                                                onClick={() => toggleCustomSchedule(day.value)}
                                                                className="bg-gray-100 hover:bg-gray-200 px-3 py-1.5 rounded-lg font-medium text-gray-600 text-sm transition-colors"
                                                            >
                                                                Remove Custom
                                                            </button>
                                                        )}
                                                    </div>

                                                    {selectedDays.has(day.value) && customScheduleDays.has(day.value) && (
                                                        <div className="gap-4 grid grid-cols-2 mt-4 animate-fadeIn">
                                                            <div>
                                                                <label className="block mb-2 font-medium text-gray-700 text-sm">
                                                                    Start Time
                                                                </label>
                                                                <input
                                                                    type="time"
                                                                    value={scheduleData[day.value]?.start_time || defaultTime.start_time}
                                                                    onChange={(e) => updateScheduleTime(day.value, 'start_time', e.target.value)}
                                                                    className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                                                    required
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block mb-2 font-medium text-gray-700 text-sm">End Time</label>
                                                                <input
                                                                    type="time"
                                                                    value={scheduleData[day.value]?.end_time || defaultTime.end_time}
                                                                    onChange={(e) => updateScheduleTime(day.value, 'end_time', e.target.value)}
                                                                    className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                                                    required
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block mb-2 font-medium text-gray-700 text-sm">Break Time</label>
                                                                <input
                                                                    type="time"
                                                                    value={scheduleData[day.value]?.break_time || defaultTime.break_time}
                                                                    onChange={(e) => updateScheduleTime(day.value, 'break_time', e.target.value)}
                                                                    className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block mb-2 font-medium text-gray-700 text-sm">Break Hours</label>
                                                                <input
                                                                    type="number"
                                                                    step="0.5"
                                                                    min="0"
                                                                    max="24"
                                                                    value={scheduleData[day.value]?.break_time_hour || defaultTime.break_time_hour}
                                                                    onChange={(e) => updateScheduleTime(day.value, 'break_time_hour', parseFloat(e.target.value) || 1)}
                                                                    className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-3 mt-6 pt-4 border-gray-200 border-t">
                                            <button
                                                onClick={() => {
                                                    setShowScheduleModal(false);
                                                    setEditingScheduleUser(null);
                                                    setSelectedDays(new Set());
                                                    setScheduleData({});
                                                    setCustomScheduleDays(new Set());
                                                }}
                                                className="bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveSchedule}
                                                disabled={savingSchedule}
                                                className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-colors disabled:cursor-not-allowed"
                                            >
                                                {savingSchedule ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                        </svg>
                                                        Saving...
                                                    </span>
                                                ) : 'Save Schedule'}
                                            </button>
                                        </div>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Create Modal */}
                {showCreateModal && (
                    <div 
                        className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 w-full h-full overflow-y-auto animate-fadeIn"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowCreateModal(false);
                                setCreateForm({
                                    name: '',
                                    email: '',
                                    role: 'user',
                                    password: '',
                                    password_confirmation: '',
                                });
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md transition-all animate-slideUp transform">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">Create New User</h3>
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreateForm({
                                                name: '',
                                                email: '',
                                                role: 'user',
                                                password: '',
                                                password_confirmation: '',
                                            });
                                        }}
                                        className="hover:bg-gray-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Name</label>
                                        <input
                                            type="text"
                                            value={createForm.name}
                                            onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Email</label>
                                        <input
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Role</label>
                                        <select
                                            value={createForm.role}
                                            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Password</label>
                                        <input
                                            type="password"
                                            value={createForm.password}
                                            onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={createForm.password_confirmation}
                                            onChange={(e) => setCreateForm({ ...createForm, password_confirmation: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-gray-200 border-t">
                                    <button
                                        onClick={() => {
                                            setShowCreateModal(false);
                                            setCreateForm({
                                                name: '',
                                                email: '',
                                                role: 'user',
                                                password: '',
                                                password_confirmation: '',
                                            });
                                        }}
                                        className="bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        className="bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-colors"
                                    >
                                        Create
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Edit Modal */}
                {editingUser && (
                    <div 
                        className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 w-full h-full overflow-y-auto animate-fadeIn"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setEditingUser(null);
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md transition-all animate-slideUp transform">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">Edit User</h3>
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="hover:bg-gray-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Name</label>
                                        <input
                                            type="text"
                                            value={editForm.name}
                                            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Email</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Role</label>
                                        <select
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                        >
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">
                                            Password (leave blank to keep current)
                                        </label>
                                        <input
                                            type="password"
                                            value={editForm.password}
                                            onChange={(e) => setEditForm({ ...editForm, password: e.target.value })}
                                            className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                            placeholder="New password"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-gray-200 border-t">
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="bg-gray-100 hover:bg-gray-200 px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdate}
                                        className="bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-colors"
                                    >
                                        Update
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                    }
                    to {
                        opacity: 1;
                    }
                }
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(20px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.2s ease-out;
                }
                .animate-slideUp {
                    animation: slideUp 0.3s ease-out;
                }
            `}</style>
        </AdminLayout>
    );
}
