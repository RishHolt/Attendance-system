import { Html5Qrcode } from 'html5-qrcode';
import { useEffect, useRef, useState } from 'react';
import Swal from 'sweetalert2';
import AdminLayout from '../components/AdminLayout';
import { initOfflineSync, savePendingScan, syncPendingScans } from '../lib/dexieSync';

// Helper function to get current local time in 12-hour format with AM/PM
const getCurrentLocalTime = (): string => {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes();
    
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
    const minutesStr = minutes.toString().padStart(2, '0');
    
    return `${hours12}:${minutesStr} ${period}`;
};

export default function Scanner() {
    const [isScanning, setIsScanning] = useState(false);
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const isProcessingRef = useRef(false); // Prevent multiple simultaneous scans
    const scanAreaId = 'qr-reader';

    useEffect(() => {
        initOfflineSync();
    }, []);

    const startScanning = async (): Promise<void> => {
        try {
            // Ensure the element exists before initializing
            const element = document.getElementById(scanAreaId);
            if (!element) {
                throw new Error(`Element with id="${scanAreaId}" not found. Please refresh the page.`);
            }

            // Clear any existing scanner instance and clean up DOM
            if (scannerRef.current) {
                try {
                    await scannerRef.current.stop();
                } catch (e) {
                    // Ignore errors when stopping - scanner might already be stopped
                }
                scannerRef.current = null;
            }

            // Clear the element's innerHTML to remove any leftover html5-qrcode elements
            // Do this after stopping to avoid removeChild errors
            if (element) {
                element.innerHTML = '';
            }

            // Small delay to ensure DOM is ready
            await new Promise((resolve) => setTimeout(resolve, 100));

            const scanner = new Html5Qrcode(scanAreaId);
            scannerRef.current = scanner;

            // Try to get available cameras
            let cameras: MediaDeviceInfo[] = [];
            try {
                const devices = await navigator.mediaDevices.enumerateDevices();
                cameras = devices.filter(device => device.kind === 'videoinput');
            } catch (e) {
                console.warn('Could not enumerate cameras:', e);
            }

            const scanConfig = {
                fps: 10,
                qrbox: { width: 200, height: 200 },
            };

            const onScanSuccess = async (decodedText: string) => {
                if (!isProcessingRef.current) {
                    await handleScan(decodedText);
                }
            };

            const onScanError = (errorMessage: string) => {
                // Ignore scanning errors
            };

            // Try different camera configurations in order of preference
            const cameraConfigs = [
                { facingMode: 'environment' }, // Back camera (preferred for QR scanning)
                { facingMode: 'user' }, // Front camera
            ];

            let lastError: any = null;
            for (const config of cameraConfigs) {
                try {
                    await scanner.start(
                        config as any,
                        scanConfig,
                        onScanSuccess,
                        onScanError
                    );
                    setIsScanning(true);
                    setHasPermission(true);
                    return; // Success!
                } catch (error: any) {
                    lastError = error;
                    console.warn(`Failed to start with config ${JSON.stringify(config)}:`, error);
                    
                    // If it's a permission error, don't try other cameras
                    if (error?.message?.includes('NotAllowedError') || 
                        error?.message?.includes('permission') || 
                        error?.message?.includes('denied')) {
                        break;
                    }
                    
                    // Continue to next camera config
                    continue;
                }
            }

            // If all configs failed, try without any constraints (use default camera)
            if (!lastError?.message?.includes('NotAllowedError') && 
                !lastError?.message?.includes('permission') && 
                !lastError?.message?.includes('denied')) {
                try {
                    await scanner.start(
                        true, // Use default camera
                        scanConfig,
                        onScanSuccess,
                        onScanError
                    );
                    setIsScanning(true);
                    setHasPermission(true);
                    return; // Success with default camera!
                } catch (defaultError: any) {
                    lastError = defaultError;
                    console.error('Default camera also failed:', defaultError);
                }
            }

            // All attempts failed
            setHasPermission(false);

            let errorMessage = 'Please allow camera access to use the scanner.';

            if (lastError?.message?.includes('NotAllowedError') || 
                lastError?.message?.includes('permission') || 
                lastError?.message?.includes('denied')) {
                errorMessage = 'Camera permission was denied. Please allow camera access in your browser settings and try again.';
            } else if (lastError?.message?.includes('NotFoundError') || 
                       lastError?.message?.includes('not found') ||
                       cameras.length === 0) {
                errorMessage = 'No camera found. Please make sure your device has a camera and it is not being used by another application.';
            } else if (lastError?.message?.includes('NotReadableError')) {
                errorMessage = 'Camera is already in use by another application. Please close other apps using the camera.';
            }

            await Swal.fire({
                icon: 'error',
                title: 'Camera Access Error',
                text: errorMessage,
                confirmButtonText: 'OK',
            });
        } catch (error: any) {
            console.error('Unexpected error starting scanner:', error);
            setHasPermission(false);
            
            await Swal.fire({
                icon: 'error',
                title: 'Camera Access Error',
                text: 'An unexpected error occurred while trying to access the camera. Please refresh the page and try again.',
                confirmButtonText: 'OK',
            });
        }
    };

    const stopScanning = async (): Promise<void> => {
        if (scannerRef.current) {
            try {
                await scannerRef.current.stop();
            } catch (error) {
                // Ignore stop errors - scanner might already be stopped
            }
            
            // Clear DOM after stopping
            try {
                const element = document.getElementById(scanAreaId);
                if (element) {
                    element.innerHTML = '';
                }
            } catch (e) {
                // Ignore
            }
            
            scannerRef.current = null;
        }
        setIsScanning(false);
    };

    const handleScan = async (qrToken: string): Promise<void> => {
        // Prevent multiple simultaneous scans
        if (isProcessingRef.current) {
            return;
        }

        // Set processing flag immediately
        isProcessingRef.current = true;

        // Validate QR token before processing
        if (!qrToken || qrToken.trim().length === 0) {
            console.error('Invalid QR token received:', qrToken);
            isProcessingRef.current = false;
            await Swal.fire({
                icon: 'error',
                title: 'Invalid QR Code',
                text: 'The scanned QR code is empty or invalid. Please try again.',
                timer: 3000,
                showConfirmButton: false,
            });
            return;
        }

        // Stop scanner immediately to prevent more scans
        const wasScanning = isScanning;
        if (wasScanning) {
            await stopScanning();
        }
        
        // Show loading dialog using Swal with progress bar
        Swal.fire({
            title: 'Processing scan...',
            html: `
                <div class="flex flex-col items-center space-y-4">
                    <div class="border-indigo-600 border-b-2 rounded-full w-12 h-12 animate-spin"></div>
                    <p class="font-medium text-gray-700">Please wait</p>
                    <div class="w-full max-w-xs">
                        <div class="bg-gray-200 rounded-full h-2 overflow-hidden">
                            <div id="swal-progress-bar" class="bg-indigo-600 rounded-full h-full transition-all duration-500 ease-out" style="width: 0%;"></div>
                        </div>
                    </div>
                </div>
            `,
            allowOutsideClick: false,
            allowEscapeKey: false,
            showConfirmButton: false,
            didOpen: () => {
                // Animate progress bar smoothly
                const progressBar = document.getElementById('swal-progress-bar');
                if (progressBar) {
                    let progress = 0;
                    const interval = setInterval(() => {
                        // Increment progress smoothly, slowing down as it approaches 90%
                        const increment = Math.max(0.5, (90 - progress) * 0.1);
                        progress += increment;
                        if (progress > 90) {
                            progress = 90; // Don't go to 100% until done
                        }
                        progressBar.style.width = `${progress}%`;
                    }, 100);
                    
                    // Store interval ID to clear later
                    (Swal.getContainer() as any).__progressInterval = interval;
                }
            },
            willClose: () => {
                // Complete the progress bar and clear interval
                const progressBar = document.getElementById('swal-progress-bar');
                if (progressBar) {
                    progressBar.style.width = '100%';
                }
                const container = Swal.getContainer() as any;
                if (container?.__progressInterval) {
                    clearInterval(container.__progressInterval);
                }
            },
        });

        if (!navigator.onLine) {
            await savePendingScan(qrToken);
            
            // Close loading modal and show result
            Swal.close();
            await Swal.fire({
                icon: 'info',
                title: 'Offline Mode',
                text: 'Scan saved. It will be synced when you are back online.',
                timer: 3000,
                timerProgressBar: true,
                showConfirmButton: false,
            });

            // Reset processing flag and restart scanning after modal closes
            isProcessingRef.current = false;
            if (wasScanning) {
                await startScanning();
            }
            return;
        }

        try {
            const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content;
            if (!csrfToken) {
                throw new Error('CSRF token not found. Please refresh the page.');
            }

            const response = await fetch('/api/attendance/scan', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                    'X-CSRF-TOKEN': csrfToken,
                },
                credentials: 'same-origin',
                body: JSON.stringify({ qr_token: qrToken.trim() }),
            });

            let data;
            try {
                const responseText = await response.text();
                if (!responseText) {
                    throw new Error('Empty response from server');
                }
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('Failed to parse response:', parseError);
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            if (response.ok && data.success) {
                const isLate = data.message === 'You are Late';
                const isCheckOut = data.message === 'Checked Out';
                const userName = data.data?.user_name || 'User';
                // Use current local time instead of server time for accurate display
                const time = getCurrentLocalTime();

                // Close loading modal and show result
                Swal.close();
                await Swal.fire({
                    icon: isLate ? 'warning' : isCheckOut ? 'info' : 'success',
                    title: data.message,
                    html: `<div class="text-center">
                        <p class="mb-2 font-semibold text-gray-800 text-lg">${userName}</p>
                        <p class="text-gray-600">
                            ${isCheckOut
                                ? `Checked out at <strong>${time}</strong>`
                                : isLate
                                    ? `Checked in at <strong>${time}</strong> (Late)`
                                    : `Checked in at <strong>${time}</strong>`}
                        </p>
                    </div>`,
                    timer: 3000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                });

                // Reset processing flag and restart scanning after modal closes
                isProcessingRef.current = false;
                if (wasScanning) {
                    await startScanning();
                }
            } else {
                // Handle different error types
                let errorMessage = data.message || 'Invalid QR Code';
                
                // Handle validation errors
                if (data.errors && typeof data.errors === 'object') {
                    const errorMessages = Object.values(data.errors).flat();
                    errorMessage = errorMessages.join(', ') || errorMessage;
                }

                // Map specific error messages to user-friendly text
                if (errorMessage === 'No Schedule for Today') {
                    errorMessage = 'This user does not have a schedule for today. Please set up a schedule first.';
                } else if (errorMessage === 'Already Checked Out') {
                    errorMessage = 'This user has already checked out for today.';
                } else if (errorMessage === 'Invalid QR Code') {
                    errorMessage = 'The scanned QR code is invalid or does not belong to any user.';
                }

                // Close loading modal and show error result
                Swal.close();
                await Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: errorMessage,
                    timer: 4000,
                    timerProgressBar: true,
                    showConfirmButton: false,
                });

                // Reset processing flag and restart scanning after modal closes
                isProcessingRef.current = false;
                if (wasScanning) {
                    await startScanning();
                }
            }
        } catch (error) {
            console.error('Scan error:', error);
            let errorMessage = 'Failed to process scan. Please try again.';
            
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            // Close loading modal and show error result
            Swal.close();
            await Swal.fire({
                icon: 'error',
                title: 'Error',
                text: errorMessage,
                timer: 4000,
                timerProgressBar: true,
                showConfirmButton: false,
            });

            // Reset processing flag and restart scanning after modal closes
            isProcessingRef.current = false;
            if (wasScanning) {
                await startScanning();
            }
        }
    };

    useEffect(() => {
        return () => {
            stopScanning();
        };
    }, []);

    return (
        <AdminLayout>
            <div className="space-y-6">
                <div>
                    <h1 className="font-bold text-gray-900 text-3xl">QR Code Scanner</h1>
                    <p className="mt-1 text-gray-600">Scan QR codes to record attendance</p>
                </div>

                <div className="bg-white shadow-lg mx-auto p-6 border border-gray-200 rounded-xl max-w-2xl">
                    <div className="mb-6">
                        <div className="flex justify-center bg-gray-100 mb-4 p-4 rounded-lg">
                            <div id={scanAreaId} className="w-full max-w-md"></div>
                        </div>

                        {!isScanning && hasPermission !== false && (
                            <button
                                onClick={startScanning}
                                className="flex justify-center items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 shadow-md hover:shadow-lg px-6 py-4 rounded-lg w-full font-semibold text-white transition-all duration-200"
                            >
                                <span className="text-xl">📷</span>
                                <span>Start Scanning</span>
                            </button>
                        )}

                        {isScanning && (
                            <button
                                onClick={stopScanning}
                                className="flex justify-center items-center space-x-2 bg-red-600 hover:bg-red-700 shadow-md hover:shadow-lg px-6 py-4 rounded-lg w-full font-semibold text-white transition-all duration-200"
                            >
                                <span className="text-xl">⏹</span>
                                <span>Stop Scanning</span>
                            </button>
                        )}

                        {hasPermission === false && (
                            <div className="bg-red-50 p-6 border border-red-200 rounded-lg text-center">
                                <div className="mb-3 text-4xl">⚠️</div>
                                <p className="font-medium text-red-800">Camera access is required</p>
                                <p className="mt-2 text-red-600 text-sm">
                                    Please check your browser settings and refresh the page.
                                </p>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-50 p-4 border border-blue-200 rounded-lg">
                        <h3 className="mb-2 font-semibold text-blue-900">💡 Instructions</h3>
                        <ul className="space-y-1 text-blue-800 text-sm list-disc list-inside">
                            <li>Click "Start Scanning" to activate the camera</li>
                            <li>Point the camera at the user's QR code</li>
                            <li>The system will automatically detect and process the scan</li>
                            <li>Users will be checked in or out based on their schedule</li>
                        </ul>
                    </div>
                </div>
            </div>
        </AdminLayout>
    );
}
