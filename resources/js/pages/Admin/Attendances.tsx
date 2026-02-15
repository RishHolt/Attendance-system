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
    notes?: string | null;
    admin_notes?: string | null;
    user: User;
}

interface SavedFilter {
    id: number;
    name: string;
    filters: Record<string, string>;
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
    savedFilters?: SavedFilter[];
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

export default function AdminAttendances({ attendances, users, savedFilters = [], filters: initialFilters }: AttendancesProps) {
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
    const [editForm, setEditForm] = useState<{ time_in: string; time_out: string; notes: string; admin_notes: string }>({ 
        time_in: '', 
        time_out: '', 
        notes: '', 
        admin_notes: '' 
    });
    const [saving, setSaving] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [addForm, setAddForm] = useState<{ user_id: string; date: string; time_in: string; time_out: string }>({
        user_id: '',
        date: new Date().toISOString().split('T')[0],
        time_in: '',
        time_out: '',
    });
    const [showSaveFilterModal, setShowSaveFilterModal] = useState(false);
    const [saveFilterName, setSaveFilterName] = useState('');

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


    const handleExportCsv = (): void => {
        const params = new URLSearchParams();
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        if (filters.user_id) params.append('user_id', filters.user_id);
        if (filters.status) params.append('status', filters.status);
        if (filters.week) params.append('week', filters.week);
        if (filters.month) params.append('month', filters.month);
        if (filters.year) params.append('year', filters.year);

        window.open(`/api/admin/attendances/export/csv?${params.toString()}`, '_blank');
    };

    const handleImportCsv = async (): Promise<void> => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,.txt';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) {
                return;
            }

            try {
                const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/admin/attendances/import', {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    credentials: 'same-origin',
                    body: formData,
                });

                const data = await response.json();

                if (response.ok && data.success) {
                    await Swal.fire({
                        icon: 'success',
                        title: 'Import Successful',
                        html: `
                            <p>Imported: ${data.imported} records</p>
                            <p>Skipped: ${data.skipped} records</p>
                            ${data.errors && data.errors.length > 0 ? `<p class="mt-2 text-red-600">Errors: ${data.errors.length}</p>` : ''}
                        `,
                        showConfirmButton: true,
                    });

                    if (data.errors && data.errors.length > 0) {
                        console.error('Import errors:', data.errors);
                    }

                    router.reload({ only: ['attendances'] });
                } else {
                    throw new Error(data.message || 'Failed to import attendance records');
                }
            } catch (error) {
                await Swal.fire({
                    icon: 'error',
                    title: 'Import Failed',
                    text: error instanceof Error ? error.message : 'Failed to import attendance records',
                });
            }
        };
        input.click();
    };

    const handleSaveFilter = async (): Promise<void> => {
        if (!saveFilterName.trim()) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please enter a filter name',
            });
            return;
        }

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';

            const response = await fetch('/api/admin/saved-filters', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({
                    name: saveFilterName,
                    filters: filters,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Filter saved successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                setShowSaveFilterModal(false);
                setSaveFilterName('');
                router.reload({ only: ['savedFilters'] });
            } else {
                throw new Error(data.message || 'Failed to save filter');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to save filter',
            });
        }
    };

    const handleLoadFilter = (savedFilter: SavedFilter): void => {
        setFilters({ ...filters, ...savedFilter.filters });
        applyFilters();
    };

    const handleDeleteFilter = async (savedFilter: SavedFilter): Promise<void> => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete "${savedFilter.name}"?`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444',
            cancelButtonColor: '#6B7280',
            confirmButtonText: 'Yes, delete it',
        });

        if (!result.isConfirmed) {
            return;
        }

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';

            const response = await fetch(`/api/admin/saved-filters/${savedFilter.id}`, {
                method: 'DELETE',
                headers: {
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Deleted',
                    text: 'Filter deleted successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['savedFilters'] });
            } else {
                throw new Error(data.message || 'Failed to delete filter');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to delete filter',
            });
        }
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
            notes: attendance.notes || '',
            admin_notes: attendance.admin_notes || '',
        });
    };

    const handleCancelEdit = (): void => {
        setEditingAttendance(null);
        setEditForm({ time_in: '', time_out: '', notes: '', admin_notes: '' });
    };

    const handleSaveEdit = async (): Promise<void> => {
        if (!editingAttendance) return;

        setSaving(true);

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            
            // Extract just the date part (YYYY-MM-DD) from the attendance date
            // Handle various date formats (ISO string, date object, or YYYY-MM-DD string)
            let dateStr = editingAttendance.date;
            if (typeof dateStr === 'string') {
                // Extract YYYY-MM-DD from any date string format
                const dateMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
                if (dateMatch) {
                    dateStr = dateMatch[1];
                } else {
                    // Fallback: try to parse as date
                    const date = new Date(dateStr);
                    if (!isNaN(date.getTime())) {
                        dateStr = date.toISOString().split('T')[0];
                    }
                }
            }
            
            // Combine the date with the time inputs in datetime-local format (YYYY-MM-DDTHH:mm)
            // Send null for empty values to clear the time fields
            const timeInValue = editForm.time_in && editForm.time_in.trim() !== '' 
                ? `${dateStr}T${editForm.time_in}` 
                : null;
            const timeOutValue = editForm.time_out && editForm.time_out.trim() !== '' 
                ? `${dateStr}T${editForm.time_out}` 
                : null;
            
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
                    notes: editForm.notes,
                    admin_notes: editForm.admin_notes,
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
                setEditForm({ time_in: '', time_out: '', notes: '', admin_notes: '' });
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
                            onClick={handleExportCsv}
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            <span>Export CSV</span>
                        </button>
                        <button
                            onClick={handleImportCsv}
                            className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span>Import CSV</span>
                        </button>
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
                        {/* Saved Filters */}
                        {savedFilters.length > 0 && (
                            <div className="mb-4 pb-4 border-gray-200 border-b">
                                <label className="block mb-2 font-medium text-gray-700 text-sm">Saved Filters</label>
                                <div className="flex flex-wrap gap-2">
                                    {savedFilters.map((savedFilter) => (
                                        <div key={savedFilter.id} className="flex items-center gap-2 bg-gray-50 px-3 py-1 border border-gray-200 rounded-lg">
                                            <button
                                                onClick={() => handleLoadFilter(savedFilter)}
                                                className="font-medium text-indigo-600 hover:text-indigo-800 text-sm"
                                            >
                                                {savedFilter.name}
                                            </button>
                                            <button
                                                onClick={() => handleDeleteFilter(savedFilter)}
                                                className="text-red-600 hover:text-red-800 text-sm"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="gap-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 mb-4">
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Start Date</label>
                                <input
                                    type="date"
                                    value={filters.start_date}
                                    onChange={(e) => handleFilterChange('start_date', e.target.value)}
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">End Date</label>
                                <input
                                    type="date"
                                    value={filters.end_date}
                                    onChange={(e) => handleFilterChange('end_date', e.target.value)}
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">User</label>
                                <select
                                    value={filters.user_id}
                                    onChange={(e) => handleFilterChange('user_id', e.target.value)}
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
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
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
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
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
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
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                />
                            </div>
                            <div>
                                <label className="block mb-1 font-medium text-gray-700 text-sm">Month</label>
                                <input
                                    type="month"
                                    value={filters.month}
                                    onChange={(e) => handleFilterChange('month', e.target.value)}
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
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
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
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
                            <button
                                onClick={() => setShowSaveFilterModal(true)}
                                className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                            >
                                Save Filter
                            </button>
                        </div>
                    </div>
                )}

                {/* Save Filter Modal */}
                {showSaveFilterModal && (
                    <div className="z-50 fixed inset-0 flex justify-center items-center bg-black bg-opacity-50">
                        <div className="bg-white shadow-xl mx-4 rounded-xl w-full max-w-md">
                            <div className="px-6 py-4 border-gray-200 border-b">
                                <h2 className="font-bold text-gray-900 text-xl">Save Filter</h2>
                            </div>
                            <div className="px-6 py-4">
                                <label className="block mb-2 font-medium text-gray-700 text-sm">Filter Name *</label>
                                <input
                                    type="text"
                                    value={saveFilterName}
                                    onChange={(e) => setSaveFilterName(e.target.value)}
                                    className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                    placeholder="e.g., This Month - All Users"
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            handleSaveFilter();
                                        }
                                    }}
                                />
                            </div>
                            <div className="flex justify-end space-x-3 px-6 py-4 border-gray-200 border-t">
                                <button
                                    onClick={() => {
                                        setShowSaveFilterModal(false);
                                        setSaveFilterName('');
                                    }}
                                    className="bg-white hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSaveFilter}
                                    className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                                >
                                    Save
                                </button>
                            </div>
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
                                        Notes
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
                                            <td className="px-6 py-4 max-w-xs text-gray-500 text-sm">
                                                {attendance.notes && (
                                                    <div className="truncate" title={attendance.notes}>
                                                        📝 {attendance.notes}
                                                    </div>
                                                )}
                                                {attendance.admin_notes && (
                                                    <div className="text-purple-600 truncate" title={attendance.admin_notes}>
                                                        🔒 {attendance.admin_notes}
                                                    </div>
                                                )}
                                                {!attendance.notes && !attendance.admin_notes && (
                                                    <span className="text-gray-400">-</span>
                                                )}
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
