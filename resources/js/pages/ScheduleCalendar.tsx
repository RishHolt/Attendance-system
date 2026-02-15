import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import AdminLayout from '../components/AdminLayout';
import UserLayout from '../components/UserLayout';

interface Schedule {
    id?: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_time: string | null;
    break_time_hour: number;
}

interface Attendance {
    id?: number;
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    total_time: string | null;
    is_overtime?: boolean;
    user?: User;
}

interface CalendarDay {
    date: Date;
    dayOfWeek: number;
    schedule: Schedule | null;
    attendance: Attendance | null;
    isToday: boolean;
    isPast: boolean;
    isFuture: boolean;
}

const DAYS_OF_WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

interface User {
    id: number;
    name: string;
    email: string;
    user_id?: number;
}

interface PageProps {
    auth?: {
        user?: {
            id: number;
            role: string;
        };
    };
    users?: User[];
}

export default function ScheduleCalendar() {
    const page = usePage<PageProps & { users?: User[]; [key: string]: unknown }>();
    const isAdmin = page.props.auth?.user?.role === 'admin';
    const Layout = isAdmin ? AdminLayout : UserLayout;
    const currentUserId = page.props.auth?.user?.id;
    const availableUsers = page.props.users || [];
    
    const [selectedUserId, setSelectedUserId] = useState<number | null>(currentUserId || null);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [calendarDays, setCalendarDays] = useState<CalendarDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [, setAttendances] = useState<Record<string, Attendance>>({});
    const [currentWeekAttendances, setCurrentWeekAttendances] = useState<Attendance[]>([]);
    const [hoveredDayIndex, setHoveredDayIndex] = useState<number | null>(null);
    const [showAttendanceModal, setShowAttendanceModal] = useState(false);
    const [attendanceModalMode, setAttendanceModalMode] = useState<'add' | 'edit'>('add');
    const [attendanceFormDay, setAttendanceFormDay] = useState<CalendarDay | null>(null);
    const [addForm, setAddForm] = useState<{ user_id: string; date: string; time_in: string; time_out: string }>({
        user_id: '',
        date: '',
        time_in: '',
        time_out: '',
    });
    const [editForm, setEditForm] = useState<{ time_in: string; time_out: string }>({ time_in: '', time_out: '' });
    const [savingAttendance, setSavingAttendance] = useState(false);

    useEffect(() => {
        if (selectedUserId) {
            fetchCalendarData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate, selectedUserId]);

    const fetchCalendarData = async (silent = false): Promise<void> => {
        if (!selectedUserId) {
            setLoading(false);
            return;
        }

        if (!silent) setLoading(true);
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;

        try {
            // Fetch schedules
            const schedulesUrl = isAdmin && selectedUserId !== currentUserId
                ? `/api/schedules?user_id=${selectedUserId}`
                : '/api/schedules';
            const schedulesRes = await fetch(schedulesUrl, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin',
            });
            const schedulesData = await schedulesRes.json();
            setSchedules(schedulesData);

            // Fetch attendances for the month
            const attendancesUrl = isAdmin && selectedUserId !== currentUserId
                ? `/api/attendances?month=${year}-${String(month).padStart(2, '0')}&user_id=${selectedUserId}`
                : `/api/attendances?month=${year}-${String(month).padStart(2, '0')}`;
            const attendancesRes = await fetch(attendancesUrl, {
                headers: { 'Accept': 'application/json' },
                credentials: 'same-origin',
            });
            const attendancesData = await attendancesRes.json();
            const attendanceMap: Record<string, Attendance> = {};
            (attendancesData.data || attendancesData || []).forEach((att: Attendance) => {
                // Ensure date is in YYYY-MM-DD format
                const dateStr = att.date.includes('T') ? att.date.split('T')[0] : att.date;
                attendanceMap[dateStr] = att;
            });
            setAttendances(attendanceMap);

            // Fetch current week attendances for "Total Hours This Week" (always accurate)
            const today = new Date();
            const startOfWeek = new Date(today);
            startOfWeek.setDate(today.getDate() - today.getDay());
            const weekStr = `${startOfWeek.getFullYear()}-${String(startOfWeek.getMonth() + 1).padStart(2, '0')}-${String(startOfWeek.getDate()).padStart(2, '0')}`;
            const weekUrl = isAdmin && selectedUserId !== currentUserId
                ? `/api/attendances?week=${weekStr}&user_id=${selectedUserId}`
                : `/api/attendances?week=${weekStr}`;
            const weekRes = await fetch(weekUrl, {
                headers: { Accept: 'application/json' },
                credentials: 'same-origin',
            });
            const weekData = await weekRes.json();
            const weekList = weekData.data ?? weekData;
            setCurrentWeekAttendances(Array.isArray(weekList) ? weekList : []);

            // Generate calendar days
            generateCalendar(year, month, schedulesData, attendanceMap);
        } catch (error) {
            console.error('Error fetching calendar data:', error);
        } finally {
            setLoading(false);
        }
    };

    const generateCalendar = (year: number, month: number, schedules: Schedule[], attendancesMap: Record<string, Attendance>): void => {
        const firstDay = new Date(year, month - 1, 1);
        const lastDay = new Date(year, month, 0);
        const daysInMonth = lastDay.getDate();
        const startingDayOfWeek = firstDay.getDay();

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const days: CalendarDay[] = [];

        // Add empty cells for days before the first day of the month
        for (let i = 0; i < startingDayOfWeek; i++) {
            const date = new Date(year, month - 1, -startingDayOfWeek + i + 1);
            days.push({
                date,
                dayOfWeek: date.getDay(),
                schedule: null,
                attendance: null,
                isToday: false,
                isPast: date < today,
                isFuture: date > today,
            });
        }

        // Add days of the month
        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(year, month - 1, day);
            const dayOfWeek = date.getDay();
            // Format date as YYYY-MM-DD
            const yearStr = date.getFullYear();
            const monthStr = String(date.getMonth() + 1).padStart(2, '0');
            const dayStr = String(date.getDate()).padStart(2, '0');
            const dateStr = `${yearStr}-${monthStr}-${dayStr}`;
            const schedule = schedules.find((s) => s.day_of_week === dayOfWeek) || null;
            const attendance = attendancesMap[dateStr] || null;

            const dateOnly = new Date(date);
            dateOnly.setHours(0, 0, 0, 0);
            const todayOnly = new Date(today);

            days.push({
                date: dateOnly,
                dayOfWeek,
                schedule,
                attendance,
                isToday: dateOnly.getTime() === todayOnly.getTime(),
                isPast: dateOnly < todayOnly,
                isFuture: dateOnly > todayOnly,
            });
        }

        // Fill remaining cells to complete the grid (42 cells for 6 weeks)
        const remainingCells = 42 - days.length;
        for (let i = 1; i <= remainingCells; i++) {
            const date = new Date(year, month, i);
            const dateOnly = new Date(date);
            dateOnly.setHours(0, 0, 0, 0);
            days.push({
                date: dateOnly,
                dayOfWeek: date.getDay(),
                schedule: null,
                attendance: null,
                isToday: false,
                isPast: false,
                isFuture: true,
            });
        }

        setCalendarDays(days);
    };

    const navigateMonth = (direction: number): void => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    };

    const goToToday = (): void => {
        setCurrentDate(new Date());
    };

    const getStatusColor = (status: string | null): string => {
        if (!status) return 'bg-gray-100 text-gray-600';
        switch (status) {
            case 'Present':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'Late':
                return 'bg-yellow-100 text-yellow-800 border-yellow-300';
            case 'Absent':
                return 'bg-red-100 text-red-800 border-red-300';
            case 'No Time Out':
                return 'bg-orange-100 text-orange-800 border-orange-300';
            case 'Unscheduled':
                return 'bg-gray-100 text-gray-600 border-gray-300';
            default:
                return 'bg-gray-100 text-gray-600 border-gray-300';
        }
    };

    const getStatusIcon = (status: string | null): string => {
        if (!status) return '';
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

    const formatTime = (time: string | null): string => {
        if (!time) return '-';
        // Check if it's a datetime string (contains 'T' or is ISO format)
        if (time.includes('T') || time.match(/^\d{4}-\d{2}-\d{2}/)) {
            // It's a datetime string, parse it and extract UTC time
            const date = new Date(time);
            if (isNaN(date.getTime())) {
                return '-';
            }
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
        }
        // It's a simple time string (HH:MM:SS or HH:MM), convert to 12-hour format
        const timeMatch = time.match(/(\d{1,2}):(\d{2})/);
        if (timeMatch) {
            let hours = parseInt(timeMatch[1], 10);
            const minutes = parseInt(timeMatch[2], 10);
            const period = hours >= 12 ? 'PM' : 'AM';
            const displayHours = hours % 12 || 12;
            return `${displayHours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
        }
        return time.substring(0, 5);
    };

    const parseTimeToInput = (time: string | null): string => {
        if (!time) return '';
        if (time.includes('T') || time.match(/^\d{4}-\d{2}-\d{2}/)) {
            const date = new Date(time);
            if (isNaN(date.getTime())) return '';
            const hours = date.getUTCHours();
            const minutes = date.getUTCMinutes();
            return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
        }
        const m = time.match(/(\d{1,2}):(\d{2})/);
        return m ? `${String(parseInt(m[1], 10)).padStart(2, '0')}:${m[2]}` : '';
    };

    const formatDateStr = (d: Date): string => {
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const handleOpenAddAttendance = (day: CalendarDay): void => {
        setAttendanceFormDay(day);
        setAttendanceModalMode('add');
        setAddForm({
            user_id: selectedUserId ? String(selectedUserId) : '',
            date: formatDateStr(day.date),
            time_in: '',
            time_out: '',
        });
        setShowAttendanceModal(true);
    };

    const handleOpenEditAttendance = (day: CalendarDay): void => {
        if (!day.attendance) return;
        setAttendanceFormDay(day);
        setAttendanceModalMode('edit');
        setEditForm({
            time_in: parseTimeToInput(day.attendance.time_in),
            time_out: parseTimeToInput(day.attendance.time_out),
        });
        setShowAttendanceModal(true);
    };

    const handleCloseAttendanceModal = (): void => {
        setShowAttendanceModal(false);
        setAttendanceFormDay(null);
        setAddForm({ user_id: '', date: '', time_in: '', time_out: '' });
        setEditForm({ time_in: '', time_out: '' });
    };

    const handleSaveAddAttendance = async (): Promise<void> => {
        if (!addForm.user_id || !addForm.date) {
            await Swal.fire({ icon: 'error', title: 'Error', text: 'Please select a user and date' });
            return;
        }
        setSavingAttendance(true);
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
        try {
            const timeInValue = addForm.time_in ? `${addForm.date}T${addForm.time_in}` : null;
            const timeOutValue = addForm.time_out ? `${addForm.date}T${addForm.time_out}` : null;
            const res = await fetch('/api/admin/attendances', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
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
            const data = await res.json();
            if (res.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Attendance recorded successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });
                handleCloseAttendanceModal();
                await fetchCalendarData(true);
            } else {
                throw new Error(data.message || 'Failed to record attendance');
            }
        } catch (err) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err instanceof Error ? err.message : 'Failed to record attendance',
            });
        } finally {
            setSavingAttendance(false);
        }
    };

    const handleSaveEditAttendance = async (): Promise<void> => {
        if (!attendanceFormDay?.attendance?.id) return;
        setSavingAttendance(true);
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '';
        try {
            let dateStr = attendanceFormDay.attendance.date;
            if (typeof dateStr === 'string') {
                const m = dateStr.match(/^(\d{4}-\d{2}-\d{2})/);
                dateStr = m ? m[1] : dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
            }
            const timeInValue = editForm.time_in?.trim() ? `${dateStr}T${editForm.time_in}` : null;
            const timeOutValue = editForm.time_out?.trim() ? `${dateStr}T${editForm.time_out}` : null;
            const res = await fetch(`/api/admin/attendances/${attendanceFormDay.attendance.id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({ time_in: timeInValue, time_out: timeOutValue }),
            });
            const data = await res.json();
            if (res.ok && data.success) {
                await Swal.fire({
                    icon: 'success',
                    title: 'Success',
                    text: 'Attendance updated successfully',
                    timer: 2000,
                    showConfirmButton: false,
                });
                handleCloseAttendanceModal();
                await fetchCalendarData(true);
            } else {
                throw new Error(data.message || 'Failed to update attendance');
            }
        } catch (err) {
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: err instanceof Error ? err.message : 'Failed to update attendance',
            });
        } finally {
            setSavingAttendance(false);
        }
    };

    const calculateWeeklyTotalHours = (): { total: number; overtime: number } => {
        let totalHours = 0;
        let overtimeHours = 0;

        currentWeekAttendances.forEach((att) => {
            if (!att.total_time) return;

            const timeMatch = att.total_time.match(/([\d.]+)\s*Hours/);
            if (timeMatch) {
                totalHours += parseFloat(timeMatch[1]);
                const overtimeMatch = att.total_time.match(/Overtime:\s*\+([\d.]+)\s*Hours/);
                if (overtimeMatch) {
                    overtimeHours += parseFloat(overtimeMatch[1]);
                }
            }
        });

        return { total: totalHours, overtime: overtimeHours };
    };

    if (!selectedUserId && isAdmin) {
        return (
            <Layout>
                <div className="space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="font-bold text-gray-900 text-3xl">Schedule Calendar</h1>
                            <p className="mt-1 text-gray-600">View schedule and attendance in calendar format</p>
                        </div>
                        {isAdmin && availableUsers.length > 0 && (
                            <select
                                value={selectedUserId || ''}
                                onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                                className="px-4 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                                <option value="">Select User...</option>
                                {availableUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} #{user.user_id || user.id}
                                    </option>
                                ))}
                            </select>
                        )}
                    </div>
                    <div className="bg-white shadow-md p-12 border border-gray-200 rounded-xl text-center">
                        <div className="mb-4 text-6xl">📅</div>
                        <h2 className="mb-2 font-semibold text-gray-900 text-xl">Select a User</h2>
                        <p className="text-gray-600">Please select a user from the dropdown above to view their schedule calendar</p>
                    </div>
                </div>
            </Layout>
        );
    }

    if (loading) {
        return (
            <Layout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                        <div className="mx-auto border-indigo-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
                        <p className="mt-4 text-gray-600">Loading calendar...</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="space-y-6">
                {/* Header */}
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-gray-900 text-3xl">Schedule Calendar</h1>
                        <p className="mt-1 text-gray-600">View schedule and attendance in calendar format</p>
                    </div>
                    <div className="flex items-center space-x-3">
                        {isAdmin && availableUsers.length > 0 && (
                            <select
                                value={selectedUserId || ''}
                                onChange={(e) => setSelectedUserId(e.target.value ? parseInt(e.target.value) : null)}
                                className="px-4 py-2 border border-gray-300 focus:border-indigo-500 rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm"
                            >
                                <option value="">Select User...</option>
                                {availableUsers.map((user) => (
                                    <option key={user.id} value={user.id}>
                                        {user.name} #{user.user_id || user.id}
                                    </option>
                                ))}
                            </select>
                        )}
                        <button
                            onClick={goToToday}
                            className="bg-indigo-600 hover:bg-indigo-700 px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>

                {/* Weekly Summary */}
                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 shadow-md p-6 border border-indigo-200 rounded-xl">
                    <div className="flex justify-between items-center">
                        <div>
                            <h3 className="mb-1 font-semibold text-indigo-900 text-lg">Total Hours This Week</h3>
                            <p className="text-indigo-700 text-sm">Sunday - Saturday</p>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-indigo-900 text-3xl">
                                {(() => {
                                    const { total, overtime } = calculateWeeklyTotalHours();
                                    if (overtime > 0) {
                                        return (
                                            <span>
                                                {total.toFixed(1)}h
                                                <span className="ml-2 text-green-600 text-xl">(+{overtime.toFixed(1)}h OT)</span>
                                            </span>
                                        );
                                    }
                                    return `${total.toFixed(1)}h`;
                                })()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Calendar Navigation */}
                <div className="bg-white shadow-md p-4 border border-gray-200 rounded-xl">
                    <div className="flex justify-between items-center mb-4">
                        <button
                            onClick={() => navigateMonth(-1)}
                            className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>
                        <h2 className="font-bold text-gray-900 text-xl">
                            {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </h2>
                        <button
                            onClick={() => navigateMonth(1)}
                            className="hover:bg-gray-100 p-2 rounded-lg transition-colors"
                        >
                            <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="gap-2 grid grid-cols-7">
                        {/* Day Headers */}
                        {DAYS_OF_WEEK.map((day) => (
                            <div key={day} className="py-2 font-semibold text-gray-700 text-sm text-center">
                                {day}
                            </div>
                        ))}

                        {/* Calendar Days */}
                        {calendarDays.map((day, index) => {
                            const isCurrentMonth = day.date.getMonth() === currentDate.getMonth();
                            const canEditAttendance = isAdmin;
                            const isHovered = hoveredDayIndex === index;

                            return (
                                <div
                                    key={index}
                                    className={`relative min-h-[120px] p-2 rounded-lg border-2 transition-all ${
                                        day.isToday
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : isCurrentMonth
                                            ? 'border-gray-200 bg-white hover:border-gray-300'
                                            : 'border-gray-100 bg-gray-50 opacity-50'
                                    }`}
                                    onMouseEnter={() => setHoveredDayIndex(index)}
                                    onMouseLeave={() => setHoveredDayIndex(null)}
                                >
                                    <div className="flex justify-between items-center mb-1">
                                        <span
                                            className={`text-sm font-semibold ${
                                                day.isToday
                                                    ? 'text-indigo-600'
                                                    : isCurrentMonth
                                                    ? 'text-gray-900'
                                                    : 'text-gray-400'
                                            }`}
                                        >
                                            {day.date.getDate()}
                                        </span>
                                        <div className="flex items-center gap-1">
                                            {day.attendance && (
                                                <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusColor(day.attendance.status)}`}>
                                                    {getStatusIcon(day.attendance.status)}
                                                </span>
                                            )}
                                            {canEditAttendance && isCurrentMonth && isHovered && (
                                                <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                                    {!day.attendance && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenAddAttendance(day)}
                                                            className="p-1 rounded bg-indigo-100 text-indigo-600 hover:bg-indigo-200 transition-colors"
                                                            title="Add attendance"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                    {day.attendance && (
                                                        <button
                                                            type="button"
                                                            onClick={() => handleOpenEditAttendance(day)}
                                                            className="p-1 rounded bg-gray-100 text-gray-600 hover:bg-gray-200 transition-colors"
                                                            title="Edit attendance"
                                                        >
                                                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                            </svg>
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {day.schedule && isCurrentMonth && (
                                        <div className="space-y-1 text-xs">
                                            <div className="text-gray-600">
                                                <span className="font-medium">Work:</span> {formatTime(day.schedule.start_time)} - {formatTime(day.schedule.end_time)}
                                            </div>
                                            {day.schedule.break_time && (
                                                <div className="text-gray-500">
                                                    <span className="font-medium">Break:</span> {formatTime(day.schedule.break_time)} ({day.schedule.break_time_hour}h)
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {day.attendance && isCurrentMonth && (
                                        <div className="space-y-0.5 mt-2 text-xs">
                                            {day.attendance.time_in && (
                                                <div className="text-green-600">
                                                    <span className="font-medium">In:</span> {formatTime(day.attendance.time_in)}
                                                </div>
                                            )}
                                            {day.attendance.time_out && (
                                                <div className="text-blue-600">
                                                    <span className="font-medium">Out:</span> {formatTime(day.attendance.time_out)}
                                                </div>
                                            )}
                                            {day.attendance.total_time && (
                                                <div className="font-medium text-gray-700">
                                                    Total:{' '}
                                                    {day.attendance.is_overtime && day.attendance.total_time.includes('Overtime:') ? (
                                                        <>
                                                            <span>{day.attendance.total_time.split('(')[0]}</span>
                                                            <span className="font-semibold text-green-600">({day.attendance.total_time.split('(')[1]}</span>
                                                        </>
                                                    ) : (
                                                        day.attendance.total_time
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {!day.schedule && isCurrentMonth && !day.attendance && (
                                        <div className="mt-2 text-gray-400 text-xs">No schedule</div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Add/Edit Attendance Modal */}
                {showAttendanceModal && attendanceFormDay && (
                    <div
                        className="z-50 fixed inset-0 flex justify-center items-center bg-black/60 backdrop-blur-sm p-4 w-full h-full overflow-y-auto"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) handleCloseAttendanceModal();
                        }}
                    >
                        <div className="bg-white shadow-2xl rounded-2xl w-full max-w-md">
                            <div className="p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <h3 className="font-semibold text-gray-900 text-xl">
                                        {attendanceModalMode === 'add' ? 'Record Attendance' : 'Edit Attendance'}
                                    </h3>
                                    <button
                                        type="button"
                                        onClick={handleCloseAttendanceModal}
                                        className="hover:bg-gray-100 p-1 rounded-lg text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="space-y-4">
                                    {attendanceModalMode === 'add' ? (
                                        <>
                                            <div>
                                                <label className="block mb-2 font-medium text-gray-700 text-sm">User *</label>
                                                <select
                                                    value={addForm.user_id}
                                                    onChange={(e) => setAddForm({ ...addForm, user_id: e.target.value })}
                                                    className="bg-white px-4 py-2.5 border border-gray-300 focus:border-indigo-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 w-full transition-colors"
                                                    required
                                                >
                                                    <option value="">Select User...</option>
                                                    {availableUsers.map((user) => (
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
                                        </>
                                    ) : (
                                        <>
                                            <div>
                                                <label className="block mb-2 font-medium text-gray-700 text-sm">Date</label>
                                                <div className="bg-gray-50 px-4 py-2.5 border border-gray-300 rounded-lg text-gray-900 text-sm">
                                                    {attendanceFormDay.attendance?.date
                                                        ? (typeof attendanceFormDay.attendance.date === 'string'
                                                            ? attendanceFormDay.attendance.date.split('T')[0]
                                                            : formatDateStr(attendanceFormDay.date))
                                                        : formatDateStr(attendanceFormDay.date)}
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
                                        </>
                                    )}
                                </div>
                                <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
                                    <button
                                        type="button"
                                        onClick={handleCloseAttendanceModal}
                                        disabled={savingAttendance}
                                        className="bg-gray-100 hover:bg-gray-200 disabled:opacity-50 px-5 py-2.5 rounded-lg font-medium text-gray-700 text-sm transition-colors"
                                    >
                                        Cancel
                                    </button>
                                    {attendanceModalMode === 'add' ? (
                                        <button
                                            type="button"
                                            onClick={handleSaveAddAttendance}
                                            disabled={savingAttendance || !addForm.user_id || !addForm.date}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-colors"
                                        >
                                            {savingAttendance ? 'Saving...' : 'Record Attendance'}
                                        </button>
                                    ) : (
                                        <button
                                            type="button"
                                            onClick={handleSaveEditAttendance}
                                            disabled={savingAttendance}
                                            className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 shadow-md hover:shadow-lg px-5 py-2.5 rounded-lg font-medium text-white text-sm transition-colors"
                                        >
                                            {savingAttendance ? 'Saving...' : 'Save Changes'}
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Legend */}
                <div className="bg-white shadow-md p-4 border border-gray-200 rounded-xl">
                    <h3 className="mb-3 font-semibold text-gray-900">Legend</h3>
                    <div className="gap-4 grid grid-cols-2 md:grid-cols-5">
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">✅</span>
                            <span className="text-gray-700 text-sm">Present</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">⏰</span>
                            <span className="text-gray-700 text-sm">Late</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">❌</span>
                            <span className="text-gray-700 text-sm">Absent</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">⚠️</span>
                            <span className="text-gray-700 text-sm">No Time Out</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <span className="text-lg">📋</span>
                            <span className="text-gray-700 text-sm">Unscheduled</span>
                        </div>
                        <div className="flex items-center space-x-2">
                            <div className="bg-indigo-50 border-2 border-indigo-500 rounded w-4 h-4"></div>
                            <span className="text-gray-700 text-sm">Today</span>
                        </div>
                    </div>
                </div>
            </div>
        </Layout>
    );
}
