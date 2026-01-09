import React from 'react';
import { BatchRenderQueue as QueueType, BatchRenderJob } from '../../types/batch-render';
import { X, Play, Pause, Trash2, CheckCircle, XCircle, Clock, Loader2, Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface BatchRenderQueueProps {
    queue: QueueType;
    currentJob: BatchRenderJob | null;
    onStart: () => void;
    onPause: () => void;
    onResume: () => void;
    onStop: () => void;
    onRemoveJob: (jobId: string) => void;
    onClearCompleted: () => void;
    onClose: () => void;
}

const BatchRenderQueue: React.FC<BatchRenderQueueProps> = ({
    queue,
    currentJob,
    onStart,
    onPause,
    onResume,
    onStop,
    onRemoveJob,
    onClearCompleted,
    onClose
}) => {
    const { t } = useTranslation();

    const getStatusIcon = (job: BatchRenderJob) => {
        switch (job.status) {
            case 'pending':
                return <Clock className="w-5 h-5 text-slate-400" />;
            case 'rendering':
                return <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />;
            case 'completed':
                return <CheckCircle className="w-5 h-5 text-green-400" />;
            case 'failed':
                return <XCircle className="w-5 h-5 text-red-400" />;
        }
    };

    const getStatusText = (job: BatchRenderJob) => {
        switch (job.status) {
            case 'pending':
                return t('batch_render.status_pending');
            case 'rendering':
                return t('batch_render.status_rendering');
            case 'completed':
                return t('batch_render.status_completed');
            case 'failed':
                return t('batch_render.status_failed');
        }
    };

    const completedJobs = queue.jobs.filter(j => j.status === 'completed');
    const failedJobs = queue.jobs.filter(j => j.status === 'failed');
    const overallProgress = queue.jobs.length > 0
        ? Math.round(((completedJobs.length + failedJobs.length) / queue.jobs.length) * 100)
        : 0;

    return (
        <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-slate-900 border-l border-slate-700 shadow-2xl flex flex-col z-40">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 bg-slate-800">
                <div>
                    <h3 className="text-lg font-bold text-white">{t('batch_render.render_queue')}</h3>
                    <p className="text-sm text-slate-400">
                        {completedJobs.length + failedJobs.length}/{queue.jobs.length} {t('batch_render.completed')}
                    </p>
                </div>

                <button
                    onClick={onClose}
                    className="p-2 rounded-lg hover:bg-slate-700 transition-colors group"
                >
                    <X className="w-5 h-5 text-slate-400 group-hover:text-white" />
                </button>
            </div>

            {/* Global Progress */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-slate-300">{t('batch_render.overall_progress')}</span>
                    <span className="text-sm font-bold text-indigo-400">{overallProgress}%</span>
                </div>
                <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
                        style={{ width: `${overallProgress}%` }}
                    />
                </div>
            </div>

            {/* Controls */}
            <div className="p-4 border-b border-slate-700 flex gap-2">
                {!queue.isActive ? (
                    <button
                        onClick={onStart}
                        disabled={queue.jobs.length === 0}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
                    >
                        <Play className="w-4 h-4" />
                        {t('batch_render.start_queue')}
                    </button>
                ) : queue.isPaused ? (
                    <button
                        onClick={onResume}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Play className="w-4 h-4" />
                        {t('batch_render.resume')}
                    </button>
                ) : (
                    <button
                        onClick={onPause}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg font-medium transition-colors"
                    >
                        <Pause className="w-4 h-4" />
                        {t('batch_render.pause')}
                    </button>
                )}

                <button
                    onClick={onStop}
                    disabled={!queue.isActive}
                    className="px-4 py-2 bg-red-500 hover:bg-red-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
                >
                    {t('batch_render.stop')}
                </button>

                <button
                    onClick={onClearCompleted}
                    disabled={completedJobs.length === 0 && failedJobs.length === 0}
                    className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:text-slate-500 text-white rounded-lg font-medium transition-colors"
                >
                    <Trash2 className="w-4 h-4" />
                </button>
            </div>

            {/* Job List */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {queue.jobs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                            <Clock className="w-8 h-8 text-slate-600" />
                        </div>
                        <p className="text-slate-400 font-medium">{t('batch_render.queue_empty')}</p>
                        <p className="text-sm text-slate-500 mt-1">{t('batch_render.queue_empty_description')}</p>
                    </div>
                ) : (
                    queue.jobs.map((job, index) => {
                        const isActive = currentJob?.id === job.id;

                        return (
                            <div
                                key={job.id}
                                className={`rounded-xl p-4 border transition-all ${isActive
                                    ? 'bg-indigo-500/10 border-indigo-500/50 shadow-lg shadow-indigo-500/10'
                                    : 'bg-slate-800 border-slate-700'
                                    }`}
                            >
                                <div className="flex items-start gap-3">
                                    {/* Status Icon */}
                                    <div className="mt-1">
                                        {getStatusIcon(job)}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-white text-sm line-clamp-1">
                                            {job.projectTitle}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            <span className="text-xs text-slate-400">
                                                {getStatusText(job)}
                                            </span>
                                            {job.status === 'rendering' && (
                                                <span className="text-xs font-bold text-indigo-400">
                                                    {job.progress}%
                                                </span>
                                            )}
                                        </div>

                                        {/* Progress Bar */}
                                        {job.status === 'rendering' && (
                                            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-2">
                                                <div
                                                    className="h-full bg-indigo-500 transition-all duration-300"
                                                    style={{ width: `${job.progress}%` }}
                                                />
                                            </div>
                                        )}

                                        {/* Error Message */}
                                        {job.status === 'failed' && job.error && (
                                            <p className="text-xs text-red-400 mt-1 line-clamp-2">
                                                {job.error}
                                            </p>
                                        )}

                                        {/* Download Button */}
                                        {job.status === 'completed' && job.downloadUrl && (
                                            <a
                                                href={job.downloadUrl}
                                                download
                                                className="inline-flex items-center gap-1 mt-2 text-xs font-medium text-green-400 hover:text-green-300"
                                            >
                                                <Download className="w-3 h-3" />
                                                {t('batch_render.download')}
                                            </a>
                                        )}
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => onRemoveJob(job.id)}
                                        className="p-1.5 rounded-lg hover:bg-slate-700 transition-colors group"
                                        title={t('common.remove')}
                                    >
                                        <Trash2 className={`w-4 h-4 ${job.status === 'rendering' ? 'text-indigo-400 group-hover:text-red-400' : 'text-slate-500 group-hover:text-red-400'}`} />
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export default BatchRenderQueue;
