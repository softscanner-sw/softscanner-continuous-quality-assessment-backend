import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Class responsible for managing project dependencies (e.g., npm packages).
 * It provides utilities for installing, checking, and verifying the presence of npm dependencies.
 */
export class NPMDependencyManager {
    /**
     * Installs multiple npm packages for the current project.
     * This method iterates over the provided package names and installs each one.
     * @param packageNames An array of npm package names to be installed.
     */
    static installNPMDependencies(packageNames: string[]): void {
        console.log('NPM Dependency Manager: Installing dependencies...');
        packageNames.forEach(packageName => this.installNPMDependency(packageName));
        console.log('NPM Dependency Manager: Finished installing dependencies.');
    }

    /**
     * Installs a single npm package using the `npm install` command.
     * If the installation fails, an error message is logged.
     * @param packageName The name of the npm package to install.
     */
    static installNPMDependency(packageName: string): void {
        console.log('NPM Dependency Manager: Installing dependency...');
        const command = `npm install ${packageName} --save`;
        try {
            execSync(command, { stdio: 'inherit' });
            console.log('NPM Dependency Manager: Dependency installed successfully.');
        } catch (error) {
            console.error('NPM Dependency Manager: Failed to install dependency:', error);
        }
    }

    /**
     * Checks if a specific npm package is installed in the project.
     * It first checks for the package in the `node_modules` directory and then in `package.json`.
     * @param packageName The name of the package to check.
     * @returns true if the package is installed, false otherwise.
     */
    static isDependencyInstalled(packageName: string): boolean {
        const nodeModulesPath = path.join(process.cwd(), 'node_modules', packageName);
        const packageJsonPath = path.join(process.cwd(), 'package.json');

        try {
            // Check if the package directory exists in node_modules
            if (fs.existsSync(nodeModulesPath)) {
                return true;
            }

            // Alternatively, check if the package is listed in package.json
            const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
            const allDependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };
            return Object.hasOwnProperty.call(allDependencies, packageName);
        } catch (error) {
            console.error(`NPM Dependency Manager: Error checking if dependency "${packageName}" is installed:`, error);
            return false;
        }
    }

    /**
     * Checks if all specified npm packages are installed in the project.
     * This method iterates over each package and verifies its installation.
     * @param packageNames An array of npm package names to check.
     * @returns true if all packages are installed, false otherwise.
     */
    static areDependenciesInstalled(packageNames: string[]): boolean {
        let allInstalled = false;
        console.log('NPM Dependency Manager: Checking dependencies...');
        allInstalled = packageNames.every(packageName => this.isDependencyInstalled(packageName));
        console.log('NPM Dependency Manager: Finished checking dependencies...');

        return allInstalled;
    }
}