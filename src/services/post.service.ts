import { Post } from "../models/post.model";
import { PostRepository } from "../repositories/post.repository";
import { UserRepository } from "../repositories/user.repository";

export class PostService {
    constructor(
        private postRepository: PostRepository,
        private userRepository: UserRepository
    ) { }

    // Create a post, ensuring the author exists
    createPost(postData: Omit<Post, "id" | "createdAt">): Post {
        // const author = this.userRepository.findById(postData.authorId);
        // if (!author) {
        //     throw new Error("Author does not exist");
        // }

        if (!postData.title || !postData.content) {
            throw new Error("Title and content are required");
        }

        return this.postRepository.create(postData);
    }

    // Get all posts
    getAllPosts(): Post[] {
        return this.postRepository.findAll();
    }

    // Get post by ID
    getPostById(id: string): Post | undefined {
        return this.postRepository.findById(id);
    }

    // Update post
    updatePost(id: string, updatedData: Partial<Omit<Post, "id" | "createdAt">>): Post | null {
        return this.postRepository.update(id, updatedData);
    }

    // Delete post
    deletePost(id: string): boolean {
        return this.postRepository.delete(id);
    }
}
