import { EventEmitter } from "stream";

/**
 * Service for tracking and notifying progress updates.
 * This service uses an EventEmitter to broadcast progress messages,
 * allowing multiple listeners to subscribe to updates.
 */
export class ProgressTracker {
    // Internal event emitter instance to manage progress events
    private eventEmitter = new EventEmitter();

    /**
     * Registers a listener for progress events.
     * The listener function will be called with a message string each time progress is updated.
     *
     * @param listener - A callback function that will be called with the progress message.
     */
    onProgress(listener: (message: string) => void) {
        this.eventEmitter.on('progress', listener);
    }

    /**
     * Emits a progress update event with the given message.
     * All registered listeners will be notified with this message.
     *
     * @param message - The progress message to broadcast.
     */
    notifyProgress(message: string) {
        this.eventEmitter.emit('progress', message);
    }
}

/**
 * Interface for services or classes that can track progress.
 * Classes implementing this interface must provide a method to set a `ProgressTracker` instance.
 */
export interface IProgressTrackable {
    /**
     * Sets the progress tracker for the implementing class.
     * This method allows the class to report progress through the provided `ProgressTracker`.
     *
     * @param progressTracker - The `ProgressTracker` instance to be used for reporting progress.
     */
    setProgressTracker(progressTracker: ProgressTracker): void;
}