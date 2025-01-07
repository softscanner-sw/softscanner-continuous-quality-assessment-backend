/**
 * Encapsulates the user's goal for the analysis.
 * Allows for dynamic updates and notification of goal changes.
 */
export class UserGoal {
    private listeners: ((newGoal: string) => void)[] = [];

    /**
     * Initializes a new instance of the UserGoal class.
     * @param _goal The initial goal set by the user.
     */
    constructor(private _goal: string) {
        
    }
    
    /**
     * Returns the current user goal
     * @returns the current user goal
     */
    public get goal() : string {
        return this._goal;
    }
    
    /**
     * Sets a new user goal and notifies any listeners to new goal changes
     * @param goal the new user goal
     */
    public set goal(goal : string) {
        this._goal = goal;
        this.listeners.forEach(listener => listener(goal));
        console.log(`User goal updated to: ${this.goal}`);
    }
    
    /**
     * Displays the current user goal.
     */
    displayGoal(): void {
        console.log(`Current User Goal: ${this.goal}`);
    }

    /**
     * Adds a listener that will be called whenever the user goal changes.
     * @param listener A callback function to execute on goal change.
     */
    addGoalChangeListener(listener: (newGoal: string) => void): void {
        this.listeners.push(listener);
    }
}
