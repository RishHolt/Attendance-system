import { QRCodeSVG } from 'qrcode.react';
import { useEffect, useRef, useState } from 'react';
import UserLayout from '../components/UserLayout';

interface User {
    id: number;
    user_id: number;
    name: string;
    email: string;
    qr_token: string;
}

export default function MyQR() {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const qrRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        fetch('/api/user', {
            headers: {
                'Accept': 'application/json',
            },
        })
            .then((res) => res.json())
            .then((data) => {
                if (data.qr_token) {
                    setUser(data);
                }
                setLoading(false);
            })
            .catch((error) => {
                console.error('Error fetching user:', error);
                setLoading(false);
            });
    }, []);

    const copyToClipboard = (): void => {
        if (user?.qr_token) {
            navigator.clipboard.writeText(user.qr_token);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const downloadQR = (): void => {
        if (!qrRef.current || !user) {
            return;
        }

        const svgElement = qrRef.current.querySelector('svg');
        if (!svgElement) {
            return;
        }

        try {
            // Clone the SVG to avoid modifying the original
            const clonedSvg = svgElement.cloneNode(true) as SVGElement;
            
            // Set explicit dimensions
            const qrSize = 400;
            clonedSvg.setAttribute('width', qrSize.toString());
            clonedSvg.setAttribute('height', qrSize.toString());
            
            // Get SVG as string with proper namespace
            const svgData = new XMLSerializer().serializeToString(clonedSvg);
            const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
            const svgUrl = URL.createObjectURL(svgBlob);

            // Create canvas to convert SVG to PNG
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            const img = new Image();
            
            // Canvas dimensions: QR code + padding + text area
            const padding = 40;
            const textAreaHeight = 80;
            const canvasWidth = qrSize + (padding * 2);
            const canvasHeight = qrSize + (padding * 2) + textAreaHeight;

            canvas.width = canvasWidth;
            canvas.height = canvasHeight;

            img.onload = () => {
                if (ctx) {
                    // Fill white background
                    ctx.fillStyle = '#FFFFFF';
                    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                    
                    // Draw the QR code centered horizontally
                    const qrX = padding;
                    const qrY = padding;
                    ctx.drawImage(img, qrX, qrY, qrSize, qrSize);
                    
                    // Draw text below QR code
                    ctx.fillStyle = '#1F2937'; // Dark gray
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'top';
                    
                    // Draw name
                    ctx.font = 'bold 24px Arial, sans-serif';
                    ctx.fillText(user.name, canvasWidth / 2, qrY + qrSize + 20);
                    
                    // Draw ID
                    ctx.font = '20px Arial, sans-serif';
                    ctx.fillStyle = '#6B7280'; // Medium gray
                    const userId = user.user_id || user.id;
                    ctx.fillText(`ID: #${userId}`, canvasWidth / 2, qrY + qrSize + 50);
                    
                    // Convert to blob and download
                    canvas.toBlob((blob) => {
                        if (blob) {
                            const url = URL.createObjectURL(blob);
                            const link = document.createElement('a');
                            link.href = url;
                            const userId = user.user_id || user.id;
                            link.download = `QR_Code_${user.name.replace(/\s+/g, '_')}_${userId}.png`;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            URL.revokeObjectURL(url);
                        }
                        URL.revokeObjectURL(svgUrl);
                    }, 'image/png');
                }
            };

            img.onerror = () => {
                console.error('Error loading SVG image');
                URL.revokeObjectURL(svgUrl);
            };

            img.src = svgUrl;
        } catch (error) {
            console.error('Error downloading QR code:', error);
        }
    };

    if (loading || !user || !user.qr_token) {
        return (
            <UserLayout>
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto"></div>
                        <p className="text-gray-600 mt-4">Loading QR Code...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <div className="max-w-2xl mx-auto space-y-6">
                {/* Header */}
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">My QR Code</h1>
                    <p className="text-gray-600 mt-1">Show this QR code to the admin for attendance scanning</p>
                </div>

                {/* QR Code Card */}
                <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8">
                    <div className="flex flex-col items-center">
                        <div ref={qrRef} className="bg-white p-6 rounded-xl border-4 border-indigo-200 shadow-inner mb-6">
                            <QRCodeSVG value={user.qr_token} size={280} level="H" />
                        </div>

                        {/* Token Display - Disabled */}
                        {/* <div className="w-full max-w-md">
                            <label className="block text-sm font-medium text-gray-700 mb-2">QR Token</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={user.qr_token}
                                    readOnly
                                    className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors shadow-md hover:shadow-lg"
                                >
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            </div>
                        </div> */}

                        {/* User Info and Download Button */}
                        <div className="w-full max-w-md mt-6 pt-6 border-t border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-600">Name:</span>
                                    <span className="text-sm font-semibold text-gray-900">{user.name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="text-sm font-medium text-gray-600">ID:</span>
                                    <span className="text-sm font-semibold text-gray-900">#{user.user_id || user.id}</span>
                                </div>
                            </div>
                            <button
                                onClick={downloadQR}
                                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-lg font-medium transition-all duration-200 shadow-md hover:shadow-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Download QR Code</span>
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4 w-full max-w-md">
                            <h3 className="font-semibold text-blue-900 mb-2">💡 How to use:</h3>
                            <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                                <li>Show this QR code to your admin</li>
                                <li>The admin will scan it using the scanner app</li>
                                <li>Your attendance will be automatically recorded</li>
                                <li>Make sure your schedule is set up correctly</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 rounded-xl border border-indigo-200 p-6">
                    <div className="flex items-start space-x-4">
                        <div className="text-3xl">ℹ️</div>
                        <div>
                            <h3 className="font-semibold text-gray-900 mb-2">Important Information</h3>
                            <p className="text-sm text-gray-700">
                                Keep your QR code secure and do not share it with others. Each QR code is unique to your account.
                                If you suspect your QR code has been compromised, contact your administrator to regenerate it.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </UserLayout>
    );
}
