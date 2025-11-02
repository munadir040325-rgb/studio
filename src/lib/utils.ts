import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import { FileIcon, FileImage, FileText, FileSpreadsheet, FileVideo, FolderArchive } from 'lucide-react';
import React from "react";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export const getFileIcon = (fileName: string, className?: string) => {
    const extension = fileName?.split('.').pop()?.toLowerCase() ?? '';
    
    const iconClass = className || "mr-3 h-5 w-5 flex-shrink-0";

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(extension)) {
        return React.createElement(FileImage, { className: `${iconClass} text-blue-500` });
    }
    if (['pdf'].includes(extension)) {
        return React.createElement(FileText, { className: `${iconClass} text-red-500` });
    }
    if (['doc', 'docx'].includes(extension)) {
        return React.createElement(FileText, { className: `${iconClass} text-blue-600` });
    }
    if (['xls', 'xlsx'].includes(extension)) {
        return React.createElement(FileSpreadsheet, { className: `${iconClass} text-green-500` });
    }
    if (['ppt', 'pptx'].includes(extension)) {
        return React.createElement(FileVideo, { className: `${iconClass} text-orange-500` });
    }
    if (['zip', 'rar', '7z'].includes(extension)) {
        return React.createElement(FolderArchive, { className: `${iconClass} text-yellow-500` });
    }

    return React.createElement(FileIcon, { className: `${iconClass} text-muted-foreground` });
};

    