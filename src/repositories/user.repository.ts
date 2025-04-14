import { DataSource } from "../datasources/base.datasource";
import { User } from "../models/user.model";

export class UserRepository {
    constructor(private dataSource: DataSource<User>) { }

    create(userData: Omit<User, "id" | "createdAt">): User {
        return this.dataSource.create(userData);
    }

    findAll(): User[] {
        return this.dataSource.findAll();
    }

    findById(id: string): User | undefined {
        return this.dataSource.findById(id);
    }

    update(id: string, updatedData: Partial<Omit<User, "id" | "createdAt">>): User | null {
        return this.dataSource.update(id, updatedData);
    }

    delete(id: string): boolean {
        return this.dataSource.delete(id);
    }
}