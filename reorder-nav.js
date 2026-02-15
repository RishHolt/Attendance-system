const fs = require('fs');

const filePath = 'resources/js/components/AdminLayout.tsx';
const content = fs.readFileSync(filePath, 'utf8');

// QR Scanner menu item
const qrScannerItem = `        {
            name: 'QR Scanner',
            href: '/scanner',
            icon: (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                    />
                </svg>
            ),
        },`;

// Insert QR Scanner after Dashboard
let newContent = content.replace(
    /(\s+},\s+{\s+name: 'Dashboard'[\s\S]*?},\s+)({\s+name: 'Attendance Logs')/,
    `$1${qrScannerItem}\n        $2`
);

// Remove QR Scanner from its original position (after Schedule Calendar)
newContent = newContent.replace(
    /(\s+},\s+{\s+name: 'Schedule Calendar'[\s\S]*?},\s+)({\s+name: 'QR Scanner'[\s\S]*?},\s+)(\];)/,
    '$1$3'
);

fs.writeFileSync(filePath, newContent, 'utf8');
console.log('Navigation reordered successfully!');
