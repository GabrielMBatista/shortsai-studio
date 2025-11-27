declare module 'mp4-muxer' {
    export class Muxer<T extends Target> {
        constructor(options: MuxerOptions<T>);
        target: T;
        addVideoChunk(chunk: EncodedVideoChunk, meta?: EncodedVideoChunkMetadata): void;
        addAudioChunk(chunk: EncodedAudioChunk, meta?: EncodedAudioChunkMetadata): void;
        finalize(): void;
    }

    export interface MuxerOptions<T extends Target> {
        target: T;
        video?: {
            codec: string;
            width: number;
            height: number;
        };
        audio?: {
            codec: string;
            numberOfChannels: number;
            sampleRate: number;
        };
        fastStart?: 'in-memory' | boolean;
    }

    export interface Target {
        buffer?: ArrayBuffer;
    }

    export class ArrayBufferTarget implements Target {
        buffer: ArrayBuffer;
    }

    export class FileSystemWritableFileStreamTarget implements Target {
        constructor(stream: FileSystemWritableFileStream);
    }
}
