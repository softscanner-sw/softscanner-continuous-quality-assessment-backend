import { User } from "../../models/user.model";
import { DataSource } from "../base.datasource";
import { v4 as uuidv4 } from "uuid";

export class InMemoryUserDataSource implements DataSource<User> {
    private users: User[] = [];

    create(userData: Omit<User, "id" | "createdAt">): User {
        const newUser: User = {
            id: uuidv4(),
            createdAt: new Date(),
            ...userData,
            agreementLevel: userData.agreementLevel || 50, // Default if missing
            getsNewsletter: userData.getsNewsletter || false,
        };

        this.users.push(newUser);
        return newUser;
    }

    findAll(): User[] {
        return this.users;
    }

    findById(id: string): User | undefined {
        return this.users.find((user) => user.id === id);
    }

    update(id: string, updatedData: Partial<Omit<User, "id" | "createdAt">>): User | null {
        const index = this.users.findIndex((user) => user.id === id);
        if (index === -1) return null;
    
        this.users[index] = { ...this.users[index], ...updatedData };
        return this.users[index];
    }

    delete(id: string): boolean {
        const initialLength = this.users.length;
        this.users = this.users.filter((user) => user.id !== id);
        return this.users.length < initialLength;
    }

}