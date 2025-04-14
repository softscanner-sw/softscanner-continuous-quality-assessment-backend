import { User } from "../models/user.model";
import { UserRepository } from "../repositories/user.repository";

export class UserService {
    constructor(private userRepository: UserRepository) { }

    // Create a new user with basic validation
    createUser(userData: Omit<User, "id" | "createdAt">): User {
        if (!userData.email || !userData.password) {
            throw new Error("Email and password are required");
        }

        const existingUser = this.userRepository.findAll().find(
            (user) => user.email === userData.email
        );

        if (existingUser) {
            throw new Error("User with this email already exists");
        }

        return this.userRepository.create(userData);
    }

    // Get all users
    getAllUsers(): User[] {
        return this.userRepository.findAll();
    }

    // Get user by ID
    getUserById(id: string): User | undefined {
        return this.userRepository.findById(id);
    }

    // Update user details
    updateUser(id: string, updatedData: Partial<Omit<User, "id" | "createdAt">>): User | null {
        return this.userRepository.update(id, updatedData);
    }

    // Delete user
    deleteUser(id: string): boolean {
        return this.userRepository.delete(id);
    }
}