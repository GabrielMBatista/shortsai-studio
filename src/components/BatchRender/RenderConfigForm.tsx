import React, { useState } from 'react';
import { BatchRenderConfig, DEFAULT_BATCH_RENDER_CONFIG } from '../../types/batch-render';
import { Settings, Music, FileVideo, Image, Sliders } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RenderConfigFormProps {
    initialConfig?: BatchRenderConfig;
    onConfigChange: (config: BatchRenderConfig) => void;
    projectCount: number;
}

const RenderConfigForm: React.FC<RenderConfigFormProps> = ({
    initialConfig = DEFAULT_BATCH_RENDER_CONFIG,
    onConfigChange,
    projectCount
}) => {
    const { t } = useTranslation();
    const [config, setConfig] = useState<BatchRenderConfig>(initialConfig);

    const handleChange = <K extends keyof BatchRenderConfig>(
        key: K,
        value: BatchRenderConfig[K]
    ) => {
        const newConfig = { ...config, [key]: value };
        setConfig(newConfig);
        onConfigChange(newConfig);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0] || null;
        handleChange('endingVideoFile', file);
    };

    // Estimativas
    const estimatedTimePerProject = config.resolution === '1080p' ? 3 : 2; // minutos
    const totalEstimatedTime = projectCount * estimatedTimePerProject;
    const hours = Math.floor(totalEstimatedTime / 60);
    const minutes = totalEstimatedTime % 60;

    const estimatedSizePerProject = config.resolution === '1080p' ? 30 : 20; // MB
    const totalEstimatedSize = projectCount * estimatedSizePerProject;

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
            {/* Coluna Esquerda - Configurações */}
            <div className="space-y-6">
                {/* Configurações de Vídeo */}
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <FileVideo className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-semibold text-white">{t('batch_render.video_settings')}</h3>
                    </div>

                    <div className="space-y-4">
                        {/* FPS */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t('batch_render.fps')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {[30, 60].map(fps => (
                                    <button
                                        key={fps}
                                        onClick={() => handleChange('fps', fps as 30 | 60)}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${config.fps === fps
                                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {fps} FPS
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Resolução */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t('batch_render.resolution')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {['720p', '1080p'].map(res => (
                                    <button
                                        key={res}
                                        onClick={() => handleChange('resolution', res as '720p' | '1080p')}
                                        className={`px-4 py-2 rounded-lg font-medium transition-all ${config.resolution === res
                                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {res}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Formato */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t('batch_render.format')}
                            </label>
                            <div className="grid grid-cols-2 gap-2">
                                {['mp4', 'webm'].map(format => (
                                    <button
                                        key={format}
                                        onClick={() => handleChange('format', format as 'mp4' | 'webm')}
                                        className={`px-4 py-2 rounded-lg font-medium uppercase transition-all ${config.format === format
                                            ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                                            : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                                            }`}
                                    >
                                        {format}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Configurações de Áudio */}
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Music className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-semibold text-white">{t('batch_render.audio_settings')}</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Upload de Música */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t('batch_render.bg_music_file')}
                                <span className="text-slate-500 ml-1">({t('batch_render.optional')})</span>
                            </label>
                            <input
                                type="file"
                                accept="audio/mp3,audio/wav,audio/mpeg,.mp3,.wav"
                                onChange={(e) => handleChange('bgMusicFile', e.target.files?.[0] || null)}
                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600 cursor-pointer"
                            />
                            {config.bgMusicFile && (
                                <p className="text-xs text-slate-500 mt-1">
                                    📁 {config.bgMusicFile.name} ({(config.bgMusicFile.size / 1024 / 1024).toFixed(2)} MB)
                                </p>
                            )}
                        </div>

                        {/* Volume da Música */}
                        {config.bgMusicFile && (
                            <div>
                                <label className="block text-sm font-medium text-slate-300 mb-2">
                                    {t('batch_render.bg_music_volume')} ({config.bgMusicVolume || 50}%)
                                </label>
                                <input
                                    type="range"
                                    min="0"
                                    max="100"
                                    value={config.bgMusicVolume || 50}
                                    onChange={(e) => handleChange('bgMusicVolume', parseInt(e.target.value))}
                                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                                <div className="flex justify-between text-xs text-slate-500 mt-1">
                                    <span>0%</span>
                                    <span>50%</span>
                                    <span>100%</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Outras Configurações */}
                <div className="bg-slate-800 rounded-xl p-5 border border-slate-700">
                    <div className="flex items-center gap-2 mb-4">
                        <Settings className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-semibold text-white">{t('batch_render.other_settings')}</h3>
                    </div>

                    <div className="space-y-4">
                        {/* Legendas */}
                        <label className="flex items-center gap-3 cursor-pointer group">
                            <div className={`w-12 h-6 rounded-full transition-all ${config.showSubtitles ? 'bg-indigo-500' : 'bg-slate-700'
                                }`}>
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform m-0.5 ${config.showSubtitles ? 'translate-x-6' : 'translate-x-0'
                                    }`} />
                            </div>
                            <span className="text-sm font-medium text-slate-300 group-hover:text-white">
                                {t('batch_render.show_subtitles')}
                            </span>
                            <input
                                type="checkbox"
                                checked={config.showSubtitles}
                                onChange={(e) => handleChange('showSubtitles', e.target.checked)}
                                className="sr-only"
                            />
                        </label>

                        {/* Vídeo de Encerramento */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                {t('batch_render.ending_video')}
                                <span className="text-slate-500 ml-1">({t('batch_render.optional')})</span>
                            </label>
                            <input
                                type="file"
                                accept="video/*"
                                onChange={handleFileChange}
                                className="block w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-indigo-500 file:text-white hover:file:bg-indigo-600 cursor-pointer"
                            />
                            {config.endingVideoFile && (
                                <p className="text-xs text-slate-500 mt-1">
                                    {config.endingVideoFile.name}
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Coluna Direita - Preview e Estimativas */}
            <div className="space-y-6">
                {/* Resumo */}
                <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-xl p-6 border border-indigo-500/20">
                    <div className="flex items-center gap-2 mb-4">
                        <Sliders className="w-5 h-5 text-indigo-400" />
                        <h3 className="font-semibold text-white">{t('batch_render.summary')}</h3>
                    </div>

                    <div className="space-y-3">
                        <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                            <span className="text-sm text-slate-300">{t('batch_render.projects_to_render')}</span>
                            <span className="text-lg font-bold text-white">{projectCount}</span>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                            <span className="text-sm text-slate-300">{t('batch_render.estimated_time')}</span>
                            <span className="text-lg font-bold text-indigo-400">
                                {hours > 0 && `${hours}h `}{minutes}min
                            </span>
                        </div>

                        <div className="flex items-center justify-between py-2 border-b border-slate-700/50">
                            <span className="text-sm text-slate-300">{t('batch_render.estimated_size')}</span>
                            <span className="text-lg font-bold text-purple-400">
                                ~{totalEstimatedSize} MB
                            </span>
                        </div>

                        <div className="flex items-center justify-between py-2">
                            <span className="text-sm text-slate-300">{t('batch_render.quality')}</span>
                            <span className="text-sm font-semibold text-green-400">
                                {config.resolution} @ {config.fps}fps
                            </span>
                        </div>
                    </div>
                </div>

                {/* Avisos */}
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                    <p className="text-sm text-amber-200/90 leading-relaxed">
                        <strong>{t('batch_render.note')}:</strong> {t('batch_render.note_text')}
                    </p>
                </div>

                {/* Dicas */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                    <h4 className="text-sm font-semibold text-white mb-2">{t('batch_render.tips')}</h4>
                    <ul className="space-y-1 text-xs text-slate-400">
                        <li>• {t('batch_render.tip_1')}</li>
                        <li>• {t('batch_render.tip_2')}</li>
                        <li>• {t('batch_render.tip_3')}</li>
                    </ul>
                </div>
            </div>
        </div>
    );
};

export default RenderConfigForm;
