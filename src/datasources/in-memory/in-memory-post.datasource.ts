import { v4 as uuidv4 } from "uuid";
import { Post } from "../../models/post.model";
import { DataSource } from "../base.datasource";

export class InMemoryPostDataSource implements DataSource<Post> {
    private posts: Post[] = [];

    create(postData: Omit<Post, "id" | "createdAt" | "loveIts">): Post {
        const newPost: Post = { id: uuidv4(), createdAt: new Date(), loveIts: 0, ...postData };
        this.posts.push(newPost);
        return newPost;
    }

    findAll(): Post[] {
        return this.posts;
    }

    findById(id: string): Post | undefined {
        return this.posts.find((post) => post.id === id);
    }

    update(id: string, updatedData: Partial<Omit<Post, "id" | "createdAt">>): Post | null {
        const index = this.posts.findIndex((post) => post.id === id);
        if (index === -1) return null;

        this.posts[index] = { ...this.posts[index], ...updatedData };
        return this.posts[index];
    }

    delete(id: string): boolean {
        const initialLength = this.posts.length;
        this.posts = this.posts.filter((post) => post.id !== id);
        return this.posts.length < initialLength;
    }
}
