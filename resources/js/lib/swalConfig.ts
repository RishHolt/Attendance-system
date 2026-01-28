import Swal from 'sweetalert2';

// Configure SweetAlert2 with modern styling
const swalConfig = {
    backdrop: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
    customClass: {
        popup: 'rounded-2xl shadow-2xl',
        title: 'text-xl font-semibold',
        confirmButton: 'px-5 py-2.5 rounded-lg font-medium transition-colors shadow-md hover:shadow-lg',
        cancelButton: 'px-5 py-2.5 rounded-lg font-medium transition-colors',
        closeButton: 'text-gray-400 hover:text-gray-600 transition-colors',
    },
    buttonsStyling: false,
    showClass: {
        popup: 'animate-fadeIn',
    },
    hideClass: {
        popup: 'animate-fadeOut',
    },
};

// Helper function to show styled alerts
export const showSwal = (options: any) => {
    return Swal.fire({
        ...swalConfig,
        ...options,
    });
};

// Pre-configured alert types
export const showSuccess = (title: string, text?: string, timer?: number) => {
    return Swal.fire({
        ...swalConfig,
        icon: 'success',
        title,
        text,
        timer: timer || 3000,
        showConfirmButton: !timer,
        confirmButtonText: 'OK',
        confirmButtonColor: '#4f46e5',
    });
};

export const showError = (title: string, text?: string) => {
    return Swal.fire({
        ...swalConfig,
        icon: 'error',
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#dc2626',
    });
};

export const showWarning = (title: string, text?: string) => {
    return Swal.fire({
        ...swalConfig,
        icon: 'warning',
        title,
        text,
        confirmButtonText: 'OK',
        confirmButtonColor: '#f59e0b',
    });
};

export const showInfo = (title: string, text?: string, timer?: number) => {
    return Swal.fire({
        ...swalConfig,
        icon: 'info',
        title,
        text,
        timer: timer || 3000,
        showConfirmButton: !timer,
        confirmButtonText: 'OK',
        confirmButtonColor: '#3b82f6',
    });
};

export default Swal;
