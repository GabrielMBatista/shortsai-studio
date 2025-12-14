import React, { useState, useEffect, useMemo } from 'react';
import { ChevronRight, ChevronDown, FileText, Code, Braces } from 'lucide-react';
import json5 from 'json5';

interface JsonNodeProps {
    name?: string;
    value: any;
    isLast: boolean;
    depth?: number;
}

const JsonNode: React.FC<JsonNodeProps> = ({ name, value, isLast, depth = 0 }) => {
    const [isOpen, setIsOpen] = useState(true);

    if (value === null) {
        return (
            <div className="font-mono text-sm leading-relaxed hover:bg-white/5 rounded px-1">
                <span className="text-purple-300">{name ? `"${name}": ` : ''}</span>
                <span className="text-slate-500">null</span>
                <span className="text-slate-500">{!isLast && ','}</span>
            </div>
        );
    }

    if (typeof value === 'object') {
        const isArray = Array.isArray(value);
        const keys = Object.keys(value);
        const isEmpty = keys.length === 0;

        if (isEmpty) {
            return (
                <div className="font-mono text-sm leading-relaxed hover:bg-white/5 rounded px-1">
                    <span className="text-purple-300">{name ? `"${name}": ` : ''}</span>
                    <span className="text-slate-300">{isArray ? '[]' : '{}'}</span>
                    <span className="text-slate-500">{!isLast && ','}</span>
                </div>
            );
        }

        return (
            <div className="font-mono text-sm leading-relaxed">
                <div
                    className="flex items-center cursor-pointer hover:bg-white/5 rounded px-1 group select-none"
                    onClick={(e) => { e.stopPropagation(); setIsOpen(!isOpen); }}
                >
                    <span className={`mr-1 transition-transform ${isOpen ? 'rotate-0' : '-rotate-90'} text-slate-500`}>
                        <ChevronDown className="w-3 h-3" />
                    </span>
                    <span className="text-purple-300">{name ? `"${name}": ` : ''}</span>
                    <span className="text-slate-300">{isArray ? '[' : '{'}</span>
                    {!isOpen && (
                        <>
                            <span className="text-slate-600 text-xs mx-2">
                                {keys.length} {keys.length === 1 ? 'item' : 'items'}
                            </span>
                            <span className="text-slate-300">{isArray ? ']' : '}'}</span>
                            <span className="text-slate-500">{!isLast && ','}</span>
                        </>
                    )}
                </div>

                {isOpen && (
                    <>
                        <div className="border-l border-slate-700/50 ml-2.5 pl-2 my-0.5">
                            {keys.map((key, i) => (
                                <JsonNode
                                    key={key}
                                    name={isArray ? undefined : key}
                                    value={value[key]}
                                    isLast={i === keys.length - 1}
                                    depth={depth + 1}
                                />
                            ))}
                        </div>
                        <div className="ml-5 hover:bg-white/5 rounded px-1 text-slate-300">
                            {isArray ? ']' : '}'}
                            <span className="text-slate-500">{!isLast && ','}</span>
                        </div>
                    </>
                )}
            </div>
        );
    }

    // Primitives
    let valueColor = 'text-emerald-400'; // string
    if (typeof value === 'number') valueColor = 'text-orange-400';
    if (typeof value === 'boolean') valueColor = 'text-blue-400';

    return (
        <div className="font-mono text-sm leading-relaxed hover:bg-white/5 rounded px-1 break-all">
            <span className="text-purple-300">{name ? `"${name}": ` : ''}</span>
            <span className={valueColor}>
                {typeof value === 'string' ? `"${value}"` : String(value)}
            </span>
            <span className="text-slate-500">{!isLast && ','}</span>
        </div>
    );
};


interface SmartJsonInputProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
    height?: string;
    label?: React.ReactNode;
    required?: boolean;
}

export default function SmartJsonInput({
    value,
    onChange,
    placeholder,
    className = "",
    height = "h-48",
    label,
    required
}: SmartJsonInputProps) {
    const [mode, setMode] = useState<'text' | 'tree'>('text');
    const [jsonError, setJsonError] = useState<string | null>(null);

    // Check if valid JSON
    const parsedJson = useMemo(() => {
        try {
            if (!value.trim()) return null;
            // Use json5 if available or standard JSON parse. 
            // Since we imported json5, let's try that for more lenient parsing (trailing commas etc)
            return json5.parse(value);
        } catch (e) {
            return null;
        }
    }, [value]);

    useEffect(() => {
        if (!parsedJson && value.trim()) {
            // Cannot switch to tree if invalid
            if (mode === 'tree') setMode('text');
        }
    }, [parsedJson, value, mode]);

    const handleFormat = () => {
        if (parsedJson) {
            onChange(JSON.stringify(parsedJson, null, 2));
        }
    };

    return (
        <div className="flex flex-col gap-2">
            {(label || parsedJson) && (
                <div className="flex items-center justify-between">
                    {label && (
                        <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
                            {label}
                            {parsedJson && (
                                <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-1.5 py-0.5 rounded border border-emerald-500/20 font-bold uppercase tracking-wider">
                                    Valid JSON
                                </span>
                            )}
                        </label>
                    )}

                    {parsedJson && (
                        <div className="flex bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                            <button
                                type="button"
                                onClick={() => setMode('text')}
                                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${mode === 'text' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <Code className="w-3 h-3" /> Text
                            </button>
                            <button
                                type="button"
                                onClick={() => setMode('tree')}
                                className={`px-2 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-all ${mode === 'tree' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <Braces className="w-3 h-3" /> Tree
                            </button>
                        </div>
                    )}
                </div>
            )}

            <div className={`relative w-full bg-slate-900 border ${jsonError ? 'border-red-500/50' : 'border-slate-700'} rounded-lg overflow-hidden transition-all group focus-within:ring-2 focus-within:ring-indigo-500/50 focus-within:border-indigo-500`}>

                {mode === 'text' ? (
                    <>
                        <textarea
                            required={required}
                            value={value}
                            onChange={e => {
                                onChange(e.target.value);
                                // Simple validation check
                                try {
                                    if (e.target.value.trim()) {
                                        json5.parse(e.target.value);
                                        setJsonError(null);
                                    }
                                } catch (err: any) {
                                    // Don't show error immediately while typing? 
                                    // Or maybe just show small indicator
                                    setJsonError(err.message);
                                }
                            }}
                            className={`w-full bg-transparent text-white px-4 py-2.5 outline-none transition-all placeholder:text-slate-600 font-mono text-sm resize-none ${height} ${className}`}
                            placeholder={placeholder}
                        />
                        {/* Format Button overlay */}
                        {parsedJson && (
                            <button
                                type="button"
                                onClick={handleFormat}
                                className="absolute bottom-2 right-2 p-1.5 bg-slate-800 hover:bg-indigo-600 text-slate-400 hover:text-white rounded-md transition-colors opacity-0 group-hover:opacity-100"
                                title="Format JSON"
                            >
                                <FileText className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </>
                ) : (
                    <div className={`w-full bg-slate-900/50 px-4 py-2.5 overflow-auto ${height} ${className}`}>
                        <JsonNode value={parsedJson} isLast={true} />
                    </div>
                )}
            </div>

            {jsonError && mode === 'text' && value.trim() && (
                <div className="text-xs text-red-400 mt-1 flex items-start gap-1">
                    <span className="font-bold">Invalid JSON:</span> {jsonError}
                </div>
            )}
        </div>
    );
}
