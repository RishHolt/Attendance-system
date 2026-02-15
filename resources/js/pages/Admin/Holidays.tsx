import { router } from '@inertiajs/react';
import { useState } from 'react';
import Swal from 'sweetalert2';
import AdminLayout from '../../components/AdminLayout';

interface Holiday {
    id: number;
    name: string;
    date: string;
    type: 'public' | 'company';
    is_recurring: boolean;
    created_at: string;
    updated_at: string;
}

interface HolidaysPageProps {
    holidays: {
        data: Holiday[];
        current_page: number;
        last_page: number;
        per_page: number;
        total: number;
        links: Array<{ url: string | null; label: string; active: boolean }>;
    };
}

export default function Holidays({ holidays: initialHolidays }: HolidaysPageProps) {
    const [holidays, setHolidays] = useState<Holiday[]>(initialHolidays.data || []);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [editingHoliday, setEditingHoliday] = useState<Holiday | null>(null);
    const [form, setForm] = useState({
        name: '',
        date: '',
        type: 'public' as 'public' | 'company',
        is_recurring: false,
    });
    const [saving, setSaving] = useState(false);

    const handleCreate = (): void => {
        setShowCreateModal(true);
        setEditingHoliday(null);
        setForm({
            name: '',
            date: '',
            type: 'public',
            is_recurring: false,
        });
    };

    const handleEdit = (holiday: Holiday): void => {
        setEditingHoliday(holiday);
        setShowCreateModal(true);
        setForm({
            name: holiday.name,
            date: holiday.date,
            type: holiday.type,
            is_recurring: holiday.is_recurring,
        });
    };

    const handleCancel = (): void => {
        setShowCreateModal(false);
        setEditingHoliday(null);
        setForm({
            name: '',
            date: '',
            type: 'public',
            is_recurring: false,
        });
    };

    const handleSave = async (): Promise<void> => {
        if (!form.name || !form.date) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Please fill in all required fields',
            });
            return;
        }

        setSaving(true);

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
            const url = editingHoliday
                ? `/api/admin/holidays/${editingHoliday.id}`
                : '/api/admin/holidays';
            const method = editingHoliday ? 'PUT' : 'POST';

            const response = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify(form),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: editingHoliday ? 'Holiday or event updated successfully' : 'Holiday or event created successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['holidays'] });
                handleCancel();
            } else {
                throw new Error(data.message || 'Failed to save holiday or event');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to save holiday or event',
            });
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (holiday: Holiday): Promise<void> => {
        const result = await Swal.fire({
            title: 'Are you sure?',
            text: `Do you want to delete "${holiday.name}"?`,
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

            const response = await fetch(`/api/admin/holidays/${holiday.id}`, {
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
                    text: 'Holiday or event deleted successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });

                router.reload({ only: ['holidays'] });
            } else {
                throw new Error(data.message || 'Failed to delete holiday or event');
            }
        } catch (error) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: error instanceof Error ? error.message : 'Failed to delete holiday or event',
            });
        }
    };

    return (
        <AdminLayout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-gray-900 text-3xl">Holiday and Events Calendar</h1>
                        <p className="mt-1 text-gray-600">Manage public and company holidays and events</p>
                    </div>
                    <button
                        onClick={handleCreate}
                        className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span>Add Holiday or Event</span>
                    </button>
                </div>

                {/* Holidays and Events Table */}
                <div className="bg-white shadow-md border border-gray-200 rounded-xl overflow-hidden">
                    <table className="w-full">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Name</th>
                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-left uppercase tracking-wider">Recurring</th>
                                <th className="px-6 py-3 font-medium text-gray-500 text-xs text-right uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {holidays.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-gray-500 text-center">
                                        No holidays or events found. Click "Add Holiday or Event" to create one.
                                    </td>
                                </tr>
                            ) : (
                                holidays.map((holiday) => (
                                    <tr key={holiday.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="font-medium text-gray-900">{holiday.name}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-gray-900">{new Date(holiday.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                                holiday.type === 'public' 
                                                    ? 'bg-blue-100 text-blue-800' 
                                                    : 'bg-purple-100 text-purple-800'
                                            }`}>
                                                {holiday.type === 'public' ? 'Public' : 'Company'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {holiday.is_recurring ? (
                                                <span className="bg-green-100 px-2 py-1 rounded-full font-semibold text-green-800 text-xs">
                                                    Yes
                                                </span>
                                            ) : (
                                                <span className="bg-gray-100 px-2 py-1 rounded-full font-semibold text-gray-800 text-xs">
                                                    No
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 font-medium text-sm text-right whitespace-nowrap">
                                            <button
                                                onClick={() => handleEdit(holiday)}
                                                className="mr-4 text-indigo-600 hover:text-indigo-900"
                                            >
                                                Edit
                                            </button>
                                            <button
                                                onClick={() => handleDelete(holiday)}
                                                className="text-red-600 hover:text-red-900"
                                            >
                                                Delete
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>

                    {/* Pagination */}
                    {initialHolidays.last_page > 1 && (
                        <div className="flex justify-between items-center px-6 py-4 border-gray-200 border-t">
                            <div className="text-gray-700 text-sm">
                                Showing {((initialHolidays.current_page - 1) * initialHolidays.per_page) + 1} to{' '}
                                {Math.min(initialHolidays.current_page * initialHolidays.per_page, initialHolidays.total)} of{' '}
                                {initialHolidays.total} holidays and events
                            </div>
                            <div className="flex space-x-2">
                                {initialHolidays.links.map((link, index) => (
                                    <button
                                        key={index}
                                        onClick={() => {
                                            if (link.url) {
                                                router.get(link.url, {}, { preserveState: true });
                                            }
                                        }}
                                        disabled={!link.url || link.active}
                                        className={`px-3 py-1 text-sm rounded ${
                                            link.active
                                                ? 'bg-indigo-600 text-white'
                                                : link.url
                                                ? 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                        }`}
                                        dangerouslySetInnerHTML={{ __html: link.label }}
                                    />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Create/Edit Modal */}
                {showCreateModal && (
                    <div
                        className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 w-full h-full overflow-y-auto animate-fadeIn"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                handleCancel();
                            }
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md transition-all animate-slideUp transform">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">
                                        {editingHoliday ? 'Edit Holiday or Event' : 'Add Holiday or Event'}
                                    </h3>
                                    <button
                                        onClick={handleCancel}
                                        className="hover:bg-gray-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block mb-1 font-medium text-gray-700 text-sm">Holiday or Event Name *</label>
                                        <input
                                            type="text"
                                            value={form.name}
                                            onChange={(e) => setForm({ ...form, name: e.target.value })}
                                            className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                            placeholder="e.g., New Year's Day, Company Anniversary"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 font-medium text-gray-700 text-sm">Date *</label>
                                        <input
                                            type="date"
                                            value={form.date}
                                            onChange={(e) => setForm({ ...form, date: e.target.value })}
                                            className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                        />
                                    </div>
                                    <div>
                                        <label className="block mb-1 font-medium text-gray-700 text-sm">Type *</label>
                                        <select
                                            value={form.type}
                                            onChange={(e) => setForm({ ...form, type: e.target.value as 'public' | 'company' })}
                                            className="bg-white px-3 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 w-full"
                                        >
                                            <option value="public">Public Holiday</option>
                                            <option value="company">Company Holiday</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            id="is_recurring"
                                            checked={form.is_recurring}
                                            onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                                            className="border-gray-300 rounded focus:ring-indigo-500 w-4 h-4 text-indigo-600"
                                        />
                                        <label htmlFor="is_recurring" className="ml-2 text-gray-700 text-sm">
                                            Recurring (same date every year)
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end space-x-3 bg-gray-50 px-6 py-4 border-gray-200 border-t rounded-b-2xl">
                                <button
                                    onClick={handleCancel}
                                    className="bg-white hover:bg-gray-50 px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors disabled:cursor-not-allowed"
                                >
                                    {saving ? 'Saving...' : editingHoliday ? 'Update' : 'Create'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </AdminLayout>
    );
}
