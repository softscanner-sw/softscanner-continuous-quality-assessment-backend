import bodyParser from "body-parser";
import cors from "cors";
import dotenv from "dotenv";
import express, { Request, Response } from "express";
import { InMemoryPostDataSource } from "./datasources/in-memory/in-memory-post.datasource";
import { InMemoryUserDataSource } from "./datasources/in-memory/in-memory-user.datasource";
import { PostRepository } from "./repositories/post.repository";
import { UserRepository } from "./repositories/user.repository";
import { PostService } from "./services/post.service";
import { UserService } from "./services/user.service";
import { createUserController } from "./controllers/user.controller";
import { createPostController } from "./controllers/post.controller";

// Load environment variables
dotenv.config();

const app = express();

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));    // ✅ Increase JSON payload limit
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true })); // ✅ For form data

// Initialize Data Sources, Repositories, and Services
const userRepository = new UserRepository(new InMemoryUserDataSource());
const postRepository = new PostRepository(new InMemoryPostDataSource());

const userService = new UserService(userRepository);
const postService = new PostService(postRepository, userRepository);

// Use Controllers
app.use("/api/users", createUserController(userService));
app.use("/api/posts", createPostController(postService, userService));

// Test Route
app.get("/", (req: Request, res: Response) => {
  res.send("NG Posts & Users Backend is running");
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});