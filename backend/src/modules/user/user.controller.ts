import { Request, Response } from "express";
import { z } from "zod";
import { userService } from "./user.service.js";

const createSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(["ADMIN", "COLLABORATOR"]),
});

export const userController = {
  async list(_req: Request, res: Response) {
    const users = await userService.list();
    return res.json(users);
  },

  async create(req: Request, res: Response) {
    const data = createSchema.parse(req.body);
    const user = await userService.create(data, req.user!.sub);
    return res.status(201).json(user);
  },
};
