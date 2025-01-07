import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";

/**
 * Manages instrumentation dependencies (e.g., npm), including checking if they are installed and
 * installing them if necessary.
 */
export class DependencyManager {
    /**
     * Installs the required npm packages for the project.
     * @param packageNames An array of package names to be installed.
     */
    static installNPMDependencies(packageNames: string[]): void {
        console.log('Installing dependencies...');
        packageNames.forEach(packageName => this.installNPMDependency(packageName));
        console.log('Finished installing dependencies.');
    }

    /**
     * Installs a single npm package.
     * @param packageName The name of the package to install.
     */
    static installNPMDependency(packageName: string): void {
        console.log('Installing dependency...');
        const command = `npm install ${packageName} --save`;
        try {
            execSync(command, { stdio: 'inherit' });
            console.log('Dependency installed successfully.');
        } catch (error) {
            console.error('Failed to install dependency:', error);
        }
    }

    /**
     * Checks if a specific npm package is installed by checking it in node_modules
     * and alternatively in package.json
     * @param packageName The name of the package to check.
     * @returns true if the package is installed, false otherwise.
     */
    static isDependencyInstalled(packageName: string): boolean{
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
            console.error(`Error checking if dependency "${packageName}" is installed:`, error);
            return false;
        }
    }

    /**
     * Checks if all required npm packages are already installed.
     * @param packageNames The npm package names to be checked.
     * @returns true if all packages are installed, false otherwise.
     */
    static areDependenciesInstalled(packageNames: string[]): boolean {
        let allInstalled = false;
        console.log('Checking dependencies...');
        allInstalled = packageNames.every(packageName => this.isDependencyInstalled(packageName));
        console.log('Finished checking dependencies...');

        return allInstalled;
    }
}