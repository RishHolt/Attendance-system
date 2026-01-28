import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import UserLayout from '../components/UserLayout';

interface Schedule {
    id: number;
    day_of_week: number;
    start_time: string;
    end_time: string;
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

export default function MySchedule() {
    const [schedules, setSchedules] = useState<Schedule[]>([]);
    const [selectedDays, setSelectedDays] = useState<Set<number>>(new Set());
    const [scheduleData, setScheduleData] = useState<Record<number, { start_time: string; end_time: string }>>({});
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetch('/api/schedules', {
            headers: {
                'Accept': 'application/json',
            },
        })
            .then((res) => res.json())
            .then((data: Schedule[]) => {
                setSchedules(data);
                const days = new Set<number>(data.map((s: Schedule) => s.day_of_week));
                setSelectedDays(days);
                const scheduleMap: Record<number, { start_time: string; end_time: string }> = {};
                data.forEach((s: Schedule) => {
                    scheduleMap[s.day_of_week] = {
                        start_time: s.start_time.substring(0, 5),
                        end_time: s.end_time.substring(0, 5),
                    };
                });
                setScheduleData(scheduleMap);
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching schedules:', error);
                setLoading(false);
            });
    }, []);

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

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setSaving(true);

        const schedulesToSave = Array.from(selectedDays).map((day) => ({
            day_of_week: day,
            start_time: scheduleData[day].start_time,
            end_time: scheduleData[day].end_time,
        }));

        try {
            const response = await fetch('/api/schedules', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content || '',
                },
                body: JSON.stringify({ schedules: schedulesToSave }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                // Update local state with new schedules
                const newSchedules = data.data || [];
                setSchedules(newSchedules);
                
                const days = new Set<number>(newSchedules.map((s: Schedule) => s.day_of_week));
                setSelectedDays(days);
                
                const scheduleMap: Record<number, { start_time: string; end_time: string }> = {};
                newSchedules.forEach((s: Schedule) => {
                    scheduleMap[s.day_of_week] = {
                        start_time: s.start_time.substring(0, 5),
                        end_time: s.end_time.substring(0, 5),
                    };
                });
                setScheduleData(scheduleMap);

                await Swal.fire({
                    icon: 'success',
                    title: 'Schedule Saved',
                    text: 'Your work schedule has been updated successfully.',
                    timer: 2000,
                    showConfirmButton: false,
                });
            } else {
                const errorMessage = data.message || data.errors 
                    ? Object.values(data.errors || {}).flat().join('\n')
                    : 'Failed to save schedule';
                
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                });
            }
        } catch (error) {
            console.error('Error saving schedule:', error);
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Failed to save schedule. Please try again.',
            });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <UserLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading schedule...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <div className="max-w-3xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My Schedule</h1>
                    <p className="text-gray-600 mt-1">Manage your work schedule and days</p>
                </div>

                {/* Schedule Form */}
                <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-md border border-gray-200 p-6">
                    <div className="space-y-4">
                        {DAYS_OF_WEEK.map((day) => {
                            const isSelected = selectedDays.has(day.value);
                            return (
                                <div
                                    key={day.value}
                                    className={`border-2 rounded-xl p-4 transition-all duration-200 ${
                                        isSelected
                                            ? 'border-indigo-300 bg-indigo-50'
                                            : 'border-gray-200 bg-white hover:border-gray-300'
                                    }`}
                                >
                                    <div className="flex items-center justify-between mb-3">
                                        <label className="flex items-center space-x-3 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                checked={isSelected}
                                                onChange={() => toggleDay(day.value)}
                                                className="w-5 h-5 text-indigo-600 rounded focus:ring-indigo-500"
                                            />
                                            <span className="font-semibold text-gray-900 text-lg">{day.label}</span>
                                            <span className="text-sm text-gray-500">({day.short})</span>
                                        </label>
                                    </div>

                                    {isSelected && (
                                        <div className="grid grid-cols-2 gap-4 mt-4 animate-fadeIn">
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                                    Start Time
                                                </label>
                                                <input
                                                    type="time"
                                                    value={scheduleData[day.value]?.start_time || '09:00'}
                                                    onChange={(e) => updateScheduleTime(day.value, 'start_time', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    required
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
                                                <input
                                                    type="time"
                                                    value={scheduleData[day.value]?.end_time || '17:00'}
                                                    onChange={(e) => updateScheduleTime(day.value, 'end_time', e.target.value)}
                                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        type="submit"
                        disabled={saving || selectedDays.size === 0}
                        className="w-full mt-6 bg-indigo-600 text-white py-4 px-6 rounded-lg font-semibold hover:bg-indigo-700 transition-all duration-200 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:shadow-md"
                    >
                        {saving ? (
                            <span className="flex items-center justify-center">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Saving...
                            </span>
                        ) : (
                            '💾 Save Schedule'
                        )}
                    </button>
                </form>

                {/* Info Card */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-6">
                    <div className="flex items-start space-x-3">
                        <span className="text-2xl">💡</span>
                        <div>
                            <h3 className="font-semibold text-blue-900 mb-1">Schedule Information</h3>
                            <p className="text-sm text-blue-800">
                                Select the days you work and set your start and end times. Your attendance will be tracked based on this schedule.
                                If you check in more than 15 minutes after your start time, it will be marked as late.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes fadeIn {
                    from {
                        opacity: 0;
                        transform: translateY(-10px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                .animate-fadeIn {
                    animation: fadeIn 0.3s ease-in-out;
                }
            `}</style>
        </UserLayout>
    );
}
