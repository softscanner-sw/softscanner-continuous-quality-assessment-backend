import { EventEmitter } from "stream";

export class ProgressTracker {
    private eventEmitter = new EventEmitter();

    onProgress(listener: (message: string) => void) {
        this.eventEmitter.on('progress', listener);
    }

    notifyProgress(message: string) {
        this.eventEmitter.emit('progress', message);
    }
}

export interface IProgressTrackable {
    setProgressTracker(progressTracker: ProgressTracker): void;
}