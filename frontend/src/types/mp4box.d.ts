declare module 'mp4box' {
  export interface MP4MediaTrack {
    id: number;
    created: Date;
    modified: Date;
    volume: number;
    track_width: number;
    track_height: number;
    timescale: number;
    duration: number;
    bitrate: number;
    codec: string;
    language: string;
    nb_samples: number;
  }

  export interface MP4VideoTrack extends MP4MediaTrack {
    video: {
      width: number;
      height: number;
    };
    mdia?: {
      minf?: {
        stbl?: {
          stsd?: {
            entries: any[];
          };
        };
      };
    };
  }

  export interface MP4Info {
    duration: number;
    timescale: number;
    isFragmented: boolean;
    isProgressive: boolean;
    hasIOD: boolean;
    brands: string[];
    created: Date;
    modified: Date;
    tracks: MP4MediaTrack[];
    videoTracks: MP4VideoTrack[];
    audioTracks: MP4MediaTrack[];
  }

  export interface MP4Sample {
    alreadyRead: number;
    chunk_index: number;
    chunk_run_index: number;
    cts: number;
    data: Uint8Array;
    degradation_priority: number;
    depends_on: number;
    description: any;
    dts: number;
    duration: number;
    has_redundancy: number;
    is_depended_on: number;
    is_leading: number;
    is_sync: boolean;
    number: number;
    offset: number;
    size: number;
    timescale: number;
    track_id: number;
  }

  export interface MP4File {
    onReady?: (info: MP4Info) => void;
    onError?: (e: string) => void;
    onSamples?: (id: number, user: any, samples: MP4Sample[]) => void;
    appendBuffer(data: ArrayBuffer & { fileStart?: number }): number;
    flush(): void;
    setExtractionOptions(id: number, user?: any, options?: { nbSamples?: number; rapAlignment?: boolean }): void;
    start(): void;
    stop(): void;
    seek(time: number, useRap?: boolean): { offset: number; time: number };
    getTrackById(id: number): any;
  }

  export class DataStream {
    static BIG_ENDIAN: boolean;
    static LITTLE_ENDIAN: boolean;
    buffer: ArrayBuffer;
    position: number;
    constructor(buffer?: ArrayBuffer, byteOffset?: number, endianness?: boolean);
    writeUint8(value: number): void;
    writeUint16(value: number): void;
    writeUint32(value: number): void;
    writeUint8Array(array: Uint8Array): void;
  }

  export function createFile(): MP4File;
}
