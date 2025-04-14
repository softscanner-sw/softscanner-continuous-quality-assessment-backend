import { Request, Response, Router } from "express";
import { PostService } from "../services/post.service";
import { UserService } from "../services/user.service";

export const createPostController = (postService: PostService, userService: UserService) => {
    const router = Router();

    // Get all posts
    router.get("/", (req: Request, res: Response) => {
        const posts = postService.getAllPosts();
        res.json(posts);
    });

    // Get post by ID
    router.get("/:id", (req: Request, res: Response) => {
        const post = postService.getPostById(req.params.id);
        if (post) {
            res.json(post);
        } else {
            res.status(404).json({ message: "Post not found" });
        }
    });

    // Create a new post
    router.post("/", (req: Request, res: Response) => {
        try {
            const post = postService.createPost(req.body);
            res.status(201).json(post);
        } catch (error) {
            res.status(400).json({ error: (error as Error).message });
        }
    });

    // Update post
    router.put("/:id", (req: Request, res: Response) => {
        const updatedPost = postService.updatePost(req.params.id, req.body);
        if (updatedPost) {
            res.json(updatedPost);
        } else {
            res.status(404).json({ message: "Post not found" });
        }
    });

    // Delete post
    router.delete("/:id", (req: Request, res: Response) => {
        const deleted = postService.deletePost(req.params.id);
        if (deleted) {
            res.status(204).send();
        } else {
            res.status(404).json({ message: "Post not found" });
        }
    });

    // Like a post
    router.post("/:id/like", (req: Request, res: Response) => {
        const post = postService.getPostById(req.params.id);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
        }


        const updatedPost = postService.updatePost(req.params.id, { loveIts: post!!.loveIts + 1 });
        if (updatedPost) {
            res.json(updatedPost);
        } else {
            res.status(500).json({ message: "Failed to update post" });
        }
    });

    // Dislike a post
    router.post("/:id/dislike", (req: Request, res: Response) => {
        const post = postService.getPostById(req.params.id);
        if (!post) {
            res.status(404).json({ message: "Post not found" });
        }

        const updatedPost = postService.updatePost(req.params.id, { loveIts: post!!.loveIts - 1 });
        if (updatedPost) {
            res.json(updatedPost);
        } else {
            res.status(500).json({ message: "Failed to update post" });
        }
    });

    return router;
};
