import { Request, Response } from "express";
import { userService } from "./user.service.js";

export const userController = {
  async list(_req: Request, res: Response) {
    const users = await userService.list();
    return res.json(users);
  },
};
