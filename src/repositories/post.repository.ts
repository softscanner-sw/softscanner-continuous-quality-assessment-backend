import { DataSource } from "../datasources/base.datasource";
import { Post } from "../models/post.model";

export class PostRepository {
    constructor(private dataSource: DataSource<Post>) { }

    create(postData: Omit<Post, "id" | "createdAt">): Post {
        return this.dataSource.create(postData);
    }

    findAll(): Post[] {
        return this.dataSource.findAll();
    }

    findById(id: string): Post | undefined {
        return this.dataSource.findById(id);
    }

    update(id: string, updatedData: Partial<Omit<Post, "id" | "createdAt">>): Post | null {
        return this.dataSource.update(id, updatedData);
    }

    delete(id: string): boolean {
        return this.dataSource.delete(id);
    }
}
