import React, { useState } from 'react';
import { X, Upload, Calendar, Check, AlertCircle, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface ScheduleUploadModalProps {
    isOpen: boolean;
    onClose: () => void;
    preselectedFile?: File | Blob;
    preselectedMetadata?: { title: string; description?: string };
    projectId?: string;
    onSuccess?: () => void;
}

export const ScheduleUploadModal: React.FC<ScheduleUploadModalProps> = ({
    isOpen,
    onClose,
    preselectedFile,
    preselectedMetadata,
    projectId,
    onSuccess
}) => {
    const { t } = useTranslation();
    const [step, setStep] = useState<'upload' | 'details' | 'uploading' | 'success'>('upload');
    const [file, setFile] = useState<File | Blob | null>(preselectedFile || null);
    const [fileName, setFileName] = useState<string>(preselectedMetadata?.title || '');

    // Metadata State
    const [title, setTitle] = useState(preselectedMetadata?.title || '');
    const [description, setDescription] = useState(preselectedMetadata?.description || '');
    const [scheduledAt, setScheduledAt] = useState('');
    const [platform, setPlatform] = useState<'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM'>('YOUTUBE');
    const [privacy, setPrivacy] = useState<'PRIVATE' | 'PUBLIC' | 'UNLISTED'>('PRIVATE');

    // Upload State
    const [uploadProgress, setUploadProgress] = useState(0);
    const [error, setError] = useState<string | null>(null);

    const apiUrl = import.meta.env.VITE_API_URL || '/api';

    // Reset state when opening/closing
    React.useEffect(() => {
        if (isOpen) {
            setStep(preselectedFile ? 'details' : 'upload');
            setFile(preselectedFile || null);
            if (preselectedFile && !title && 'name' in preselectedFile) {
                // Try to guess title from filename if not provided
                setTitle((preselectedFile as File).name.replace(/\.[^/.]+$/, ""));
            }
        }
    }, [isOpen, preselectedFile]);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selected = e.target.files[0];
            setFile(selected);
            setFileName(selected.name);
            setTitle(selected.name.replace(/\.[^/.]+$/, ""));
            setStep('details');
        }
    };

    const handleUploadAndSchedule = async () => {
        if (!file || !title || !scheduledAt) {
            setError('Please fill in all required fields');
            return;
        }

        setStep('uploading');
        setUploadProgress(0);
        setError(null);

        try {
            // 1. Initiate Upload
            const initRes = await fetch(`${apiUrl}/drive/upload/init`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    fileName: fileName || `${title}.mp4`,
                    mimeType: file.type || 'video/mp4'
                })
            });

            if (!initRes.ok) throw new Error('Failed to initiate upload');
            const { uploadUrl } = await initRes.json();

            // 2. Upload to Google Drive (Resumable)
            const xhr = new XMLHttpRequest();
            xhr.open('PUT', uploadUrl, true);
            xhr.upload.onprogress = (e) => {
                if (e.lengthComputable) {
                    const percentComplete = (e.loaded / e.total) * 100;
                    setUploadProgress(Math.round(percentComplete));
                }
            };

            const driveResponse = await new Promise<any>((resolve, reject) => {
                xhr.onload = () => {
                    if (xhr.status === 200 || xhr.status === 201) {
                        try {
                            const data = JSON.parse(xhr.response);
                            resolve(data);
                        } catch (e) {
                            reject(new Error('Failed to parse Drive response'));
                        }
                    } else {
                        reject(new Error('Upload failed'));
                    }
                };
                xhr.onerror = () => reject(new Error('Network error during upload'));
                xhr.send(file);
            });

            // 3. Create Schedule Entry
            const jobRes = await fetch(`${apiUrl}/channels/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    driveFileId: driveResponse.id,
                    driveFileName: fileName || title,
                    driveMimeType: file.type || 'video/mp4',
                    driveFileSize: file.size,
                    scheduledAt: scheduledAt || undefined,
                    title: title,
                    description: description,
                    platform: platform,
                    privacy: privacy
                })
            });

            if (!jobRes.ok) {
                const errData = await jobRes.json();
                throw new Error(errData.error || 'Failed to schedule job');
            }

            setStep('success');
            if (onSuccess) onSuccess();

        } catch (err: any) {
            console.error(err);
            setError(err.message || 'An error occurred');
            setStep('details');
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
                    <h3 className="text-lg font-semibold text-white">
                        {step === 'upload' ? 'Upload Video' :
                            step === 'details' ? 'Schedule Publication' :
                                step === 'uploading' ? 'Uploading...' : 'Success'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {step === 'upload' && (
                        <div className="border-2 border-dashed border-slate-700 rounded-xl p-10 text-center hover:border-indigo-500 hover:bg-slate-800/50 transition-all cursor-pointer relative group">
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileChange}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            />
                            <div className="flex flex-col items-center gap-3">
                                <div className="p-4 bg-indigo-500/10 rounded-full group-hover:bg-indigo-500/20 transition-colors">
                                    <Upload className="w-8 h-8 text-indigo-400" />
                                </div>
                                <div>
                                    <p className="text-white font-medium">Click to upload or drag and drop</p>
                                    <p className="text-slate-400 text-sm mt-1">MP4, WebM (max 2GB)</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 'details' && (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder="My Awesome Video"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                                <textarea
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                    className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 h-24 resize-none"
                                    placeholder="Describe your video..."
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Platform</label>
                                    <select
                                        value={platform}
                                        onChange={(e) => setPlatform(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="YOUTUBE">YouTube</option>
                                        <option value="TIKTOK" disabled>TikTok (Coming Soon)</option>
                                        <option value="INSTAGRAM" disabled>Instagram (Coming Soon)</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-slate-300 mb-1">Privacy</label>
                                    <select
                                        value={privacy}
                                        onChange={(e) => setPrivacy(e.target.value as any)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    >
                                        <option value="PRIVATE">Private</option>
                                        <option value="UNLISTED">Unlisted</option>
                                        <option value="PUBLIC">Public</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-1">Schedule For (Optional)</label>
                                <div className="relative">
                                    <input
                                        type="datetime-local"
                                        value={scheduledAt}
                                        onChange={(e) => setScheduledAt(e.target.value)}
                                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 pl-10"
                                    />
                                    <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                                </div>
                                <p className="text-xs text-slate-500 mt-1">Leave blank to publish as draft only.</p>
                            </div>

                            {error && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-400 flex items-center gap-2">
                                    <AlertCircle className="w-4 h-4" />
                                    {error}
                                </div>
                            )}

                            <div className="flex justify-end gap-3 mt-6">
                                <button
                                    onClick={onClose}
                                    className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleUploadAndSchedule}
                                    className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors shadow-lg shadow-indigo-600/20"
                                >
                                    Schedule Upload
                                </button>
                            </div>
                        </div>
                    )}

                    {step === 'uploading' && (
                        <div className="text-center py-8">
                            <div className="mb-6 relative w-20 h-20 mx-auto">
                                <svg className="w-full h-full" viewBox="0 0 100 100">
                                    <circle className="text-slate-700 stroke-current" strokeWidth="8" cx="50" cy="50" r="40" fill="transparent"></circle>
                                    <circle
                                        className="text-indigo-500 progress-ring__circle stroke-current transition-all duration-300"
                                        strokeWidth="8"
                                        strokeLinecap="round"
                                        cx="50"
                                        cy="50"
                                        r="40"
                                        fill="transparent"
                                        strokeDasharray="251.2"
                                        strokeDashoffset={251.2 - (251.2 * uploadProgress) / 100}
                                        transform="rotate(-90 50 50)"
                                    ></circle>
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-lg font-bold text-white">
                                    {uploadProgress}%
                                </div>
                            </div>
                            <h4 className="text-white font-medium mb-2">Uploading video to Drive...</h4>
                            <p className="text-slate-400 text-sm">Please do not close this window.</p>
                        </div>
                    )}

                    {step === 'success' && (
                        <div className="text-center py-8">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Check className="w-8 h-8 text-green-500" />
                            </div>
                            <h4 className="text-xl font-bold text-white mb-2">Scheduled Successfully!</h4>
                            <p className="text-slate-400 mb-6 max-w-xs mx-auto">
                                Your video has been uploaded to Drive. It will be processed and published to YouTube at {new Date(scheduledAt).toLocaleString()}.
                            </p>
                            <button
                                onClick={onClose}
                                className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium transition-colors"
                            >
                                Close
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
