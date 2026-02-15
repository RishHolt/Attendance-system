<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Attendance Report</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'DejaVu Sans', Arial, sans-serif;
            font-size: 12px;
            color: #333;
            line-height: 1.4;
        }
        .header {
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 15px;
            margin-bottom: 20px;
        }
        .header h1 {
            color: #4F46E5;
            font-size: 24px;
            margin-bottom: 5px;
        }
        .header-info {
            display: flex;
            justify-content: space-between;
            margin-top: 10px;
        }
        .header-info div {
            flex: 1;
        }
        .summary {
            background-color: #F3F4F6;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 20px;
        }
        .summary h2 {
            font-size: 16px;
            margin-bottom: 10px;
            color: #1F2937;
        }
        .summary-grid {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
        }
        .summary-item {
            text-align: center;
        }
        .summary-item-label {
            font-size: 10px;
            color: #6B7280;
            margin-bottom: 5px;
        }
        .summary-item-value {
            font-size: 18px;
            font-weight: bold;
            color: #1F2937;
        }
        table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 10px;
        }
        thead {
            background-color: #4F46E5;
            color: white;
        }
        th {
            padding: 10px;
            text-align: left;
            font-weight: bold;
            font-size: 11px;
        }
        td {
            padding: 8px 10px;
            border-bottom: 1px solid #E5E7EB;
            font-size: 11px;
        }
        tbody tr:hover {
            background-color: #F9FAFB;
        }
        .status-present {
            color: #10B981;
            font-weight: bold;
        }
        .status-late {
            color: #F59E0B;
            font-weight: bold;
        }
        .status-absent {
            color: #EF4444;
            font-weight: bold;
        }
        .status-no-time-out {
            color: #8B5CF6;
            font-weight: bold;
        }
        .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #E5E7EB;
            text-align: center;
            font-size: 10px;
            color: #6B7280;
        }
        .overtime {
            color: #EF4444;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>Attendance Report</h1>
        <div class="header-info">
            <div>
                <strong>Employee:</strong> {{ $user->name }}<br>
                <strong>Employee ID:</strong> #{{ $user->user_id ?? $user->id }}<br>
                <strong>Email:</strong> {{ $user->email }}
            </div>
            <div style="text-align: right;">
                <strong>Period:</strong> {{ $periodLabel }}<br>
                <strong>Generated:</strong> {{ now()->format('Y-m-d H:i:s') }}
            </div>
        </div>
    </div>

    <div class="summary">
        <h2>Summary</h2>
        <div class="summary-grid">
            <div class="summary-item">
                <div class="summary-item-label">Total Days</div>
                <div class="summary-item-value">{{ $summary['total_days'] }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-item-label">Present</div>
                <div class="summary-item-value" style="color: #10B981;">{{ $summary['present'] }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-item-label">Late</div>
                <div class="summary-item-value" style="color: #F59E0B;">{{ $summary['late'] }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-item-label">Absent</div>
                <div class="summary-item-value" style="color: #EF4444;">{{ $summary['absent'] }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-item-label">No Time Out</div>
                <div class="summary-item-value" style="color: #8B5CF6;">{{ $summary['no_time_out'] }}</div>
            </div>
            <div class="summary-item">
                <div class="summary-item-label">Total Hours</div>
                <div class="summary-item-value">{{ $summary['total_hours'] }}</div>
            </div>
            @if($summary['overtime_hours'] > 0)
            <div class="summary-item">
                <div class="summary-item-label">Overtime Hours</div>
                <div class="summary-item-value overtime">{{ $summary['overtime_hours'] }}</div>
            </div>
            @endif
        </div>
    </div>

    <h2 style="margin-bottom: 10px; font-size: 16px;">Attendance Details</h2>
    <table>
        <thead>
            <tr>
                <th>Date</th>
                <th>Time In</th>
                <th>Time Out</th>
                <th>Status</th>
                <th>Total Time</th>
            </tr>
        </thead>
        <tbody>
            @forelse($attendances as $attendance)
            <tr>
                <td>{{ \Carbon\Carbon::parse($attendance->date)->format('Y-m-d (l)') }}</td>
                <td>{{ $attendance->time_in ? \Carbon\Carbon::parse($attendance->time_in)->format('H:i') : '-' }}</td>
                <td>{{ $attendance->time_out ? \Carbon\Carbon::parse($attendance->time_out)->format('H:i') : '-' }}</td>
                <td class="status-{{ strtolower(str_replace(' ', '-', $attendance->status)) }}">
                    {{ $attendance->status }}
                </td>
                <td>
                    {{ $attendance->total_time ?? '-' }}
                    @if(isset($attendance->is_overtime) && $attendance->is_overtime)
                        <span class="overtime">(OT)</span>
                    @endif
                </td>
            </tr>
            @empty
            <tr>
                <td colspan="5" style="text-align: center; padding: 20px; color: #6B7280;">
                    No attendance records found for this period.
                </td>
            </tr>
            @endforelse
        </tbody>
    </table>

    <div class="footer">
        <p>This report was generated on {{ now()->format('F d, Y \a\t H:i:s') }}</p>
        <p>Attendance Management System</p>
    </div>
</body>
</html>
