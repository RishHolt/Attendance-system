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
}

interface UsersPageProps {
    users: User[];
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
    const [users, setUsers] = useState<User[]>(initialUsers);
    const [editingUser, setEditingUser] = useState<User | null>(null);
    const [editingScheduleUser, setEditingScheduleUser] = useState<User | null>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showScheduleModal, setShowScheduleModal] = useState(false);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
    const [scheduleData, setScheduleData] = useState<Record<number, { start_time: string; end_time: string }>>({});
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
        setUsers(initialUsers);
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
            const response = await fetch(`/api/admin/users/${user.id}/schedules`, {
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error('Failed to fetch schedules');
            }

            const data = await response.json();
            setSchedules(data);

            const days = new Set(data.map((s: Schedule) => s.day_of_week));
            setSelectedDays(days);

            const scheduleMap: Record<number, { start_time: string; end_time: string }> = {};
            data.forEach((s: Schedule) => {
                scheduleMap[s.day_of_week] = {
                    start_time: s.start_time.substring(0, 5),
                    end_time: s.end_time.substring(0, 5),
                };
            });
            setScheduleData(scheduleMap);
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
        } else {
            newSelectedDays.add(day);
            setScheduleData({
                ...scheduleData,
                [day]: {
                    start_time: '09:00',
                    end_time: '17:00',
                },
            });
        }
        setSelectedDays(newSelectedDays);
    };

    const updateScheduleTime = (day: number, field: 'start_time' | 'end_time', value: string): void => {
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

        const schedulesToSave = Array.from(selectedDays).map((day) => ({
            day_of_week: day,
            start_time: scheduleData[day].start_time,
            end_time: scheduleData[day].end_time,
        }));

        try {
            const response = await fetch(`/api/admin/users/${editingScheduleUser.id}/schedules`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
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
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
                        <p className="text-gray-600 mt-1">Manage users, roles, and schedules</p>
                    </div>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-semibold text-white transition-all duration-200 shadow-md hover:shadow-lg"
                    >
                        + Add User
                    </button>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total Users</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">{users.length}</p>
                            </div>
                            <div className="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👥</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Admins</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {users.filter((u) => u.role === 'admin').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👑</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl shadow-md p-6 border border-gray-200">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Regular Users</p>
                                <p className="text-2xl font-bold text-gray-900 mt-1">
                                    {users.filter((u) => u.role === 'user').length}
                                </p>
                            </div>
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                <span className="text-2xl">👤</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Users Table */}
                <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Schedules
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Attendances
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {users.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mr-3">
                                                    <span className="text-indigo-600 font-semibold">
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
                                                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg text-xs font-medium transition-colors"
                                                    title="Edit User"
                                                >
                                                    Edit
                                                </button>
                                                <button
                                                    onClick={() => handleEditSchedule(user)}
                                                    className="px-3 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-lg text-xs font-medium transition-colors"
                                                    title="Edit Schedule"
                                                >
                                                    Schedule
                                                </button>
                                                <button
                                                    onClick={() => handleRegenerateQR(user)}
                                                    className="px-3 py-1 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg text-xs font-medium transition-colors"
                                                    title="Regenerate QR"
                                                >
                                                    QR
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(user)}
                                                    className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg text-xs font-medium transition-colors"
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
                </div>

                {/* Schedule Modal */}
                {showScheduleModal && editingScheduleUser && (
                    <div 
                        className="z-50 fixed inset-0 bg-black/60 backdrop-blur-sm w-full h-full overflow-y-auto flex items-center justify-center p-4 animate-fadeIn"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowScheduleModal(false);
                                setEditingScheduleUser(null);
                                setSelectedDays(new Set());
                                setScheduleData({});
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-2xl transform transition-all animate-slideUp">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">
                                        Edit Schedule - {editingScheduleUser.name}
                                    </h3>
                                    <button
                                        onClick={() => {
                                            setShowScheduleModal(false);
                                            setEditingScheduleUser(null);
                                            setSelectedDays(new Set());
                                            setScheduleData({});
                                        }}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                {loadingSchedules ? (
                                    <div className="py-12 text-center">
                                        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                                        <p className="text-gray-600 mt-4">Loading schedules...</p>
                                    </div>
                                ) : (
                                    <>
                                        <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                            {DAYS_OF_WEEK.map((day) => (
                                                <div key={day.value} className="p-4 border border-gray-200 rounded-xl hover:border-indigo-300 transition-colors bg-gray-50/50">
                                                    <div className="flex justify-between items-center mb-3">
                                                        <label className="flex items-center space-x-2 cursor-pointer">
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedDays.has(day.value)}
                                                                onChange={() => toggleDay(day.value)}
                                                                className="rounded w-5 h-5 text-blue-600"
                                                            />
                                                            <span className="font-semibold text-gray-900">{day.label}</span>
                                                        </label>
                                                    </div>

                                                    {selectedDays.has(day.value) && (
                                                        <div className="gap-4 grid grid-cols-2 mt-3">
                                                            <div>
                                                                <label className="block mb-2 font-medium text-gray-700 text-sm">
                                                                    Start Time
                                                                </label>
                                                                <input
                                                                    type="time"
                                                                    value={scheduleData[day.value]?.start_time || '09:00'}
                                                                    onChange={(e) => updateScheduleTime(day.value, 'start_time', e.target.value)}
                                                                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                                                    required
                                                                />
                                                            </div>
                                                            <div>
                                                                <label className="block mb-2 font-medium text-gray-700 text-sm">End Time</label>
                                                                <input
                                                                    type="time"
                                                                    value={scheduleData[day.value]?.end_time || '17:00'}
                                                                    onChange={(e) => updateScheduleTime(day.value, 'end_time', e.target.value)}
                                                                    className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                                                    required
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                            <button
                                                onClick={() => {
                                                    setShowScheduleModal(false);
                                                    setEditingScheduleUser(null);
                                                    setSelectedDays(new Set());
                                                    setScheduleData({});
                                                }}
                                                className="px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={handleSaveSchedule}
                                                disabled={savingSchedule}
                                                className="px-5 py-2.5 rounded-lg font-medium text-white text-sm bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-md hover:shadow-lg"
                                            >
                                                {savingSchedule ? (
                                                    <span className="flex items-center gap-2">
                                                        <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
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
                        className="z-50 fixed inset-0 bg-black/60 backdrop-blur-sm w-full h-full overflow-y-auto flex items-center justify-center p-4 animate-fadeIn"
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
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md transform transition-all animate-slideUp">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
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
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
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
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Email</label>
                                        <input
                                            type="email"
                                            value={createForm.email}
                                            onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Role</label>
                                        <select
                                            value={createForm.role}
                                            onChange={(e) => setCreateForm({ ...createForm, role: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors bg-white"
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
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Confirm Password</label>
                                        <input
                                            type="password"
                                            value={createForm.password_confirmation}
                                            onChange={(e) => setCreateForm({ ...createForm, password_confirmation: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                            required
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
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
                                        className="px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleCreate}
                                        className="px-5 py-2.5 rounded-lg font-medium text-white text-sm bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
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
                        className="z-50 fixed inset-0 bg-black/60 backdrop-blur-sm w-full h-full overflow-y-auto flex items-center justify-center p-4 animate-fadeIn"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setEditingUser(null);
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md transform transition-all animate-slideUp">
                            <div className="p-6">
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">Edit User</h3>
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="text-gray-400 hover:text-gray-600 transition-colors p-1 rounded-lg hover:bg-gray-100"
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
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Email</label>
                                        <input
                                            type="email"
                                            value={editForm.email}
                                            onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-2 font-medium text-gray-700 text-sm">Role</label>
                                        <select
                                            value={editForm.role}
                                            onChange={(e) => setEditForm({ ...editForm, role: e.target.value })}
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors bg-white"
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
                                            className="px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 w-full transition-colors"
                                            placeholder="New password"
                                        />
                                    </div>
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm bg-gray-100 hover:bg-gray-200 transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleUpdate}
                                        className="px-5 py-2.5 rounded-lg font-medium text-white text-sm bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-md hover:shadow-lg"
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
