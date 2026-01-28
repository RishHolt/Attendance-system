import { useEffect, useState } from 'react';
import UserLayout from '../components/UserLayout';

interface Schedule {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
    break_time: string | null;
    break_time_hour: number;
}

const DAYS_OF_WEEK = [
    { value: 0, label: 'Sunday', short: 'Sun' },
    { value: 1, label: 'Monday', short: 'Mon' },
    { value: 2, label: 'Tuesday', short: 'Tue' },
    { value: 3, label: 'Wednesday', short: 'Wed' },
    { value: 4, label: 'Thursday', short: 'Thu' },
    { value: 5, label: 'Friday', short: 'Fri' },
    { value: 6, label: 'Saturday', short: 'Sat' },
];

const formatTime = (timeString: string): string => {
    if (!timeString) {
        return '-';
    }

    // Handle both "HH:MM:SS" and "HH:MM" formats
    const timeMatch = timeString.match(/^(\d{1,2}):(\d{2})/);
    if (!timeMatch) {
        return timeString;
    }

    let hours = parseInt(timeMatch[1], 10);
    const minutes = timeMatch[2];
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;

    return `${displayHours.toString().padStart(2, '0')}:${minutes} ${period}`;
};

export default function MySchedule() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/schedules', {
            headers: {
                'Accept': 'application/json',
            },
        })
            .then((res) => res.json())
            .then((data: Schedule[]) => {
                setSchedules(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching schedules:', error);
                setLoading(false);
            });
    }, []);

    // Create a map of schedules by day of week
    const scheduleMap = new Map<number, Schedule>();
    schedules.forEach((schedule) => {
        scheduleMap.set(schedule.day_of_week, schedule);
    });

    if (loading) {
        return (
            <UserLayout>
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                        <div className="mx-auto border-indigo-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
                        <p className="mt-4 text-gray-600">Loading schedule...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    const hasSchedules = schedules.length > 0;

    return (
        <UserLayout>
            <div className="space-y-6 mx-auto max-w-4xl">
                {/* Header */}
                <div>
                    <h1 className="font-bold text-gray-900 text-3xl">My Schedule</h1>
                    <p className="mt-1 text-gray-600">View your work schedule</p>
                </div>

                {hasSchedules ? (
                    <>
                        {/* Schedule Display */}
                        <div className="bg-white shadow-md border border-gray-200 rounded-xl overflow-hidden">
                            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 px-6 py-4">
                                <h2 className="font-semibold text-white text-lg">Weekly Schedule</h2>
                            </div>

                            <div className="divide-y divide-gray-200">
                                {DAYS_OF_WEEK.map((day) => {
                                    const schedule = scheduleMap.get(day.value);
                                    const hasSchedule = schedule !== undefined;

                                    return (
                                        <div
                                            key={day.value}
                                            className={`px-6 py-4 transition-colors ${
                                                hasSchedule
                                                    ? 'bg-indigo-50/50 hover:bg-indigo-50'
                                                    : 'bg-gray-50/50 hover:bg-gray-50'
                                            }`}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center space-x-4">
                                                    <div
                                                        className={`flex-shrink-0 w-12 h-12 rounded-lg flex items-center justify-center font-semibold text-sm ${
                                                            hasSchedule
                                                                ? 'bg-indigo-100 text-indigo-700'
                                                                : 'bg-gray-200 text-gray-500'
                                                        }`}
                                                    >
                                                        {day.short}
                                                    </div>
                                                    <div>
                                                        <h3
                                                            className={`font-semibold text-base ${
                                                                hasSchedule ? 'text-gray-900' : 'text-gray-400'
                                                            }`}
                                                        >
                                                            {day.label}
                                                        </h3>
                                                        {hasSchedule ? (
                                                            <div className="flex items-center space-x-4 mt-1">
                                                                <div className="flex items-center space-x-2 text-gray-600 text-sm">
                                                                    <span className="text-gray-400">⏰</span>
                                                                    <span>
                                                                        {formatTime(schedule.start_time)} -{' '}
                                                                        {formatTime(schedule.end_time)}
                                                                    </span>
                                                                </div>
                                                                {schedule.break_time && schedule.break_time_hour > 0 && (
                                                                    <div className="flex items-center space-x-2 text-gray-600 text-sm">
                                                                        <span className="text-gray-400">☕</span>
                                                                        <span>
                                                                            Break: {formatTime(schedule.break_time)} (
                                                                            {schedule.break_time_hour}
                                                                            {schedule.break_time_hour === 1 ? ' hour' : ' hours'})
                                                                        </span>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ) : (
                                                            <p className="mt-1 text-gray-400 text-sm">No schedule</p>
                                                        )}
                                                    </div>
                                                </div>
                                                {hasSchedule && (
                                                    <div className="flex-shrink-0">
                                                        <span className="inline-flex items-center bg-green-100 px-3 py-1 rounded-full font-medium text-green-800 text-xs">
                                                            Scheduled
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Summary Card */}
                        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 p-6 border border-blue-200 rounded-xl">
                            <div className="flex items-start space-x-4">
                                <div className="flex-shrink-0">
                                    <div className="flex justify-center items-center bg-blue-100 rounded-lg w-12 h-12">
                                        <span className="text-2xl">📅</span>
                                    </div>
                                </div>
                                <div className="flex-1">
                                    <h3 className="mb-2 font-semibold text-blue-900 text-lg">Schedule Summary</h3>
                                    <div className="space-y-2 text-blue-800 text-sm">
                                        <p>
                                            <span className="font-medium">Working Days:</span> {schedules.length} day
                                            {schedules.length !== 1 ? 's' : ''} per week
                                        </p>
                                        {schedules.length > 0 && (
                                            <p>
                                                <span className="font-medium">Average Hours:</span>{' '}
                                                {(() => {
                                                    let totalMinutes = 0;
                                                    schedules.forEach((s) => {
                                                        const startParts = s.start_time.split(':');
                                                        const endParts = s.end_time.split(':');
                                                        const startMinutes =
                                                            parseInt(startParts[0], 10) * 60 + parseInt(startParts[1], 10);
                                                        const endMinutes =
                                                            parseInt(endParts[0], 10) * 60 + parseInt(endParts[1], 10);
                                                        let dayMinutes = endMinutes - startMinutes;
                                                        if (dayMinutes < 0) {
                                                            dayMinutes += 24 * 60;
                                                        }
                                                        dayMinutes -= (s.break_time_hour || 0) * 60;
                                                        totalMinutes += dayMinutes;
                                                    });
                                                    const avgHours = (totalMinutes / schedules.length / 60).toFixed(1);
                                                    return `${avgHours} hours per day`;
                                                })()}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </>
                ) : (
                    /* No Schedule Message */
                    <div className="bg-white shadow-md p-12 border border-gray-200 rounded-xl text-center">
                        <div className="flex justify-center items-center bg-gray-100 mx-auto mb-4 rounded-full w-16 h-16">
                            <span className="text-3xl">📋</span>
                        </div>
                        <h3 className="mb-2 font-semibold text-gray-900 text-xl">No Schedule Set</h3>
                        <p className="mb-6 text-gray-600">
                            Your schedule hasn't been set yet. Please contact your administrator to set up your work
                            schedule.
                        </p>
                        <div className="inline-flex items-center bg-gray-100 px-4 py-2 rounded-lg text-gray-700 text-sm">
                            <span className="mr-2">ℹ️</span>
                            <span>Only administrators can create or modify schedules</span>
                        </div>
                    </div>
                )}

                {/* Info Card */}
                <div className="bg-indigo-50 p-6 border border-indigo-200 rounded-xl">
                    <div className="flex items-start space-x-3">
                        <span className="text-2xl">💡</span>
                        <div>
                            <h3 className="mb-1 font-semibold text-indigo-900">Schedule Information</h3>
                            <p className="text-indigo-800 text-sm">
                                Your schedule determines your expected work hours. If you check in more than 15 minutes
                                after your scheduled start time, it will be marked as late. To modify your schedule,
                                please contact your administrator.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </UserLayout>
    );
}
