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
        @page {
            margin: 15mm;
        }
        body {
            font-family: 'Arial', 'Calibri', sans-serif;
            font-size: 10px;
            color: #000;
            line-height: 1.2;
            margin: 0; /* Let @page handle margins */
            padding: 0;
        }
        .header {
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #000;
        }
        .header h1 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
        }
        .header-info {
            display: table;
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }
        .header-info-row {
            display: table-row;
        }
        .header-info-cell {
            display: table-cell;
            padding: 2px 5px 2px 0;
            vertical-align: top;
        }
        .header-info-label {
            font-weight: bold;
            width: 90px;
        }
        /* --- TABLE FIXES START --- */
        table {
            width: 100%; /* Changed from calc */
            border: 1px solid #000;
            border-collapse: collapse;
            margin-top: 10px;
            table-layout: fixed;
        }
        th, td {
            border: 1px solid #000;
            padding: 4px 3px;
            text-align: center;
            font-size: 9px;
            overflow: hidden;
            white-space: nowrap;
        }
        /* --- TABLE FIXES END --- */
        thead {
            background-color: #D9E1F2;
        }
        th {
            font-weight: bold;
            background-color: #D9E1F2;
        }
        td {
            background-color: #FFF;
        }
        tbody tr:nth-child(even) {
            background-color: #F2F2F2;
        }
        .text-left { text-align: left; }
        .text-right { text-align: right; }
        
        .summary th {
            background-color: #D9E1F2;
            font-weight: bold;
        }
        .summary td {
            font-weight: bold;
        }
        .status-present { color: #00B050; font-weight: bold; }
        .status-late { color: #FFC000; font-weight: bold; }
        .status-absent { color: #FF0000; font-weight: bold; }
        .status-no-time-out { color: #7030A0; font-weight: bold; }
        .status-no-schedule { color: #808080; font-weight: bold; }
        .status-upcoming { color: #0070C0; font-weight: bold; }
        
        .footer {
            margin-top: 20px;
            padding-top: 10px;
            border-top: 1px solid #000;
            text-align: center;
            font-size: 9px;
        }
    </style>
</head>
<body>
    <div class="header">
        <h1>DAILY TIME RECORD REPORT</h1>
        <div class="header-info">
            <div class="header-info-row">
                <div class="header-info-cell header-info-label">Employee:</div>
                <div class="header-info-cell">{{ $user->name }}</div>
            </div>
            <div class="header-info-row">
                <div class="header-info-cell header-info-label">Employee ID:</div>
                <div class="header-info-cell">#{{ $user->user_id ?? $user->id }}</div>
            </div>
            <div class="header-info-row">
                <div class="header-info-cell header-info-label">Email:</div>
                <div class="header-info-cell">{{ $user->email }}</div>
            </div>
            <div class="header-info-row">
                <div class="header-info-cell header-info-label">Period:</div>
                <div class="header-info-cell">{{ $periodLabel }}</div>
            </div>
            <div class="header-info-row">
                <div class="header-info-cell header-info-label">Generated:</div>
                <div class="header-info-cell">{{ now()->format('Y-m-d H:i:s') }}</div>
            </div>
        </div>
    </div>

    <div>
        <table>
            <thead>
                <tr>
                    <th style="width: 15%;">Date</th>
                    <th style="width: 10%;">Day</th>
                    <th style="width: 13%;">Time In</th>
                    <th style="width: 13%;">Time Out</th>
                    <th style="width: 24%;">Status</th>
                    <th style="width: 25%;">Total Hours</th>
                </tr>
            </thead>
            <tbody>
                @forelse($attendances as $attendance)
                @php
                    $dateStr = is_string($attendance->date) ? $attendance->date : \Carbon\Carbon::parse($attendance->date)->format('Y-m-d');
                    $dateObj = \Carbon\Carbon::parse($dateStr);
                    $status = $attendance->status ?? 'No Schedule';
                @endphp
                <tr>
                    <td class="text-left">{{ $dateStr }}</td>
                    <td>{{ $dateObj->format('D') }}</td>
                    <td>{{ $attendance->time_in ? \Carbon\Carbon::parse($attendance->time_in)->format('H:i') : '-' }}</td>
                    <td>{{ $attendance->time_out ? \Carbon\Carbon::parse($attendance->time_out)->format('H:i') : '-' }}</td>
                    <td class="status-{{ strtolower(str_replace(' ', '-', $status)) }}">
                        {{ $status }}
                    </td>
                    <td>
                        @if($attendance->total_time)
                            @php
                                $timeMatch = preg_match('/([\d.]+)\s*Hours/', $attendance->total_time, $matches);
                                $totalHours = $timeMatch ? $matches[1] : null;
                                
                                if ($totalHours && isset($attendance->is_overtime) && $attendance->is_overtime) {
                                    $overtimeMatch = preg_match('/Overtime:\s*\+([\d.]+)\s*Hours/', $attendance->total_time, $otMatches);
                                    $overtimeHours = $overtimeMatch ? $otMatches[1] : null;
                                    if ($overtimeHours) {
                                        echo $totalHours . ' (' . $overtimeHours . ')';
                                    } else {
                                        echo $totalHours;
                                    }
                                } elseif ($totalHours) {
                                    echo $totalHours;
                                } else {
                                    echo '-';
                                }
                            @endphp
                        @else
                            -
                        @endif
                    </td>
                </tr>
                @empty
                <tr>
                    <td colspan="6" style="text-align: center; padding: 15px;">
                        No attendance records found for this period.
                    </td>
                </tr>
                @endforelse
            </tbody>
            <tfoot class="summary">
                <tr>
                    <th colspan="3" class="text-right">TOTAL SUMMARY:</th>
                    <th>Present: {{ $summary['present'] }}</th>
                    <th>Late: {{ $summary['late'] }}</th>
                    <th>Absent: {{ $summary['absent'] }}</th>
                </tr>
                <tr>
                    <th colspan="5" class="text-right">TOTAL HOURS:</th>
                    <td style="font-weight: bold;">
                        {{ $summary['total_hours'] }}@if($summary['overtime_hours'] > 0) ({{ $summary['overtime_hours'] }})@endif Hours
                    </td>
                </tr>
            </tfoot>
        </table>
    </div>

    <div class="footer">
        <p>This report was generated on {{ now()->format('F d, Y \a\t H:i:s') }}</p>
        <p>Attendance Management System</p>
    </div>
</body>
</html>