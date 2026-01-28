import { usePage } from '@inertiajs/react';
import { useEffect, useState } from 'react';
import AdminLayout from '../components/AdminLayout';
import UserLayout from '../components/UserLayout';

interface Schedule {
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_time: string | null;
    break_time_hour: number;
}

interface Attendance {
    date: string;
    time_in: string | null;
    time_out: string | null;
    status: string;
    total_time: string | null;
    is_overtime?: boolean;
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
    const [, setSchedules] = useState<Schedule[]>([]);
    const [, setAttendances] = useState<Record<string, Attendance>>({});

    useEffect(() => {
        if (selectedUserId) {
            fetchCalendarData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentDate, selectedUserId]);

    const fetchCalendarData = async (): Promise<void> => {
        if (!selectedUserId) {
            setLoading(false);
            return;
        }

        setLoading(true);
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

    const calculateWeeklyTotalHours = (): { total: number; overtime: number } => {
        const now = new Date();
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay()); // Sunday
        startOfWeek.setHours(0, 0, 0, 0);
        
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);

        const weekDays = calendarDays.filter((day) => {
            const dayDate = new Date(day.date);
            dayDate.setHours(0, 0, 0, 0);
            return dayDate >= startOfWeek && dayDate <= endOfWeek && day.attendance?.total_time;
        });

        let totalHours = 0;
        let overtimeHours = 0;

        weekDays.forEach((day) => {
            if (!day.attendance?.total_time) return;

            // Parse total_time string: "8 Hours" or "8 Hours (Overtime: +2 Hours)"
            const timeMatch = day.attendance.total_time.match(/([\d.]+)\s*Hours/);
            if (timeMatch) {
                const hours = parseFloat(timeMatch[1]);
                totalHours += hours;

                // Check for overtime
                const overtimeMatch = day.attendance.total_time.match(/Overtime:\s*\+([\d.]+)\s*Hours/);
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

                            return (
                                <div
                                    key={index}
                                    className={`min-h-[120px] p-2 rounded-lg border-2 transition-all ${
                                        day.isToday
                                            ? 'border-indigo-500 bg-indigo-50'
                                            : isCurrentMonth
                                            ? 'border-gray-200 bg-white hover:border-gray-300'
                                            : 'border-gray-100 bg-gray-50 opacity-50'
                                    }`}
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
                                        {day.attendance && (
                                            <span className={`text-xs px-1.5 py-0.5 rounded border ${getStatusColor(day.attendance.status)}`}>
                                                {getStatusIcon(day.attendance.status)}
                                            </span>
                                        )}
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
