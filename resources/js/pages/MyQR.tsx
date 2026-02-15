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
                <div className="flex justify-center items-center min-h-[400px]">
                    <div className="text-center">
                        <div className="mx-auto border-indigo-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
                        <p className="mt-4 text-gray-600">Loading QR Code...</p>
                    </div>
                </div>
            </UserLayout>
        );
    }

    return (
        <UserLayout>
            <div className="space-y-6 mx-auto max-w-2xl">
                {/* Header */}
                <div>
                    <h1 className="font-bold text-gray-900 text-3xl">My QR Code</h1>
                    <p className="mt-1 text-gray-600">Show this QR code to the admin for attendance scanning</p>
                </div>

                {/* QR Code Card */}
                <div className="bg-white shadow-lg p-8 border border-gray-200 rounded-xl">
                    <div className="flex flex-col items-center">
                        <div ref={qrRef} className="bg-white shadow-inner mb-6 p-6 border-4 border-indigo-200 rounded-xl">
                            <QRCodeSVG value={user.qr_token} size={280} level="H" />
                        </div>

                        {/* Token Display - Disabled */}
                        {/* <div className="w-full max-w-md">
                            <label className="block mb-2 font-medium text-gray-700 text-sm">QR Token</label>
                            <div className="flex items-center space-x-2">
                                <input
                                    type="text"
                                    value={user.qr_token}
                                    readOnly
                                    className="flex-1 bg-gray-50 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono text-gray-700 text-sm"
                                />
                                <button
                                    onClick={copyToClipboard}
                                    className="bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg px-4 py-2 rounded-lg font-medium text-white text-sm transition-colors"
                                >
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            </div>
                        </div> */}

                        {/* User Info and Download Button */}
                        <div className="mt-6 pt-6 border-gray-200 border-t w-full max-w-md">
                            <div className="flex justify-between items-center mb-4">
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-600 text-sm">Name:</span>
                                    <span className="font-semibold text-gray-900 text-sm">{user.name}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <span className="font-medium text-gray-600 text-sm">ID:</span>
                                    <span className="font-semibold text-gray-900 text-sm">#{user.user_id || user.id}</span>
                                </div>
                            </div>
                            <button
                                onClick={downloadQR}
                                className="flex justify-center items-center space-x-2 bg-gradient-to-r from-indigo-600 hover:from-indigo-700 to-purple-600 hover:to-purple-700 shadow-md hover:shadow-lg px-4 py-3 rounded-lg w-full font-medium text-white transition-all duration-200"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                <span>Download QR Code</span>
                            </button>
                        </div>

                        {/* Instructions */}
                        <div className="bg-blue-50 mt-6 p-4 border border-blue-200 rounded-lg w-full max-w-md">
                            <h3 className="mb-2 font-semibold text-blue-900">💡 How to use:</h3>
                            <ul className="space-y-1 text-blue-800 text-sm list-disc list-inside">
                                <li>Show this QR code to your admin</li>
                                <li>The admin will scan it using the scanner app</li>
                                <li>Your attendance will be automatically recorded</li>
                                <li>Make sure your schedule is set up correctly</li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* Info Card */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 p-6 border border-indigo-200 rounded-xl">
                    <div className="flex items-start space-x-4">
                        <div className="text-3xl">ℹ️</div>
                        <div>
                            <h3 className="mb-2 font-semibold text-gray-900">Important Information</h3>
                            <p className="text-gray-700 text-sm">
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
