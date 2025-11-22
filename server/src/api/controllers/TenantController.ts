import { Request, Response } from 'express';

export class TenantController {
  async getAll(req: Request, res: Response) {
    res.json({ message: 'Get all tenants - Placeholder' });
  }

  async getById(req: Request, res: Response) {
    const { id } = req.params;
    res.json({ message: `Get tenant ${id} - Placeholder` });
  }
}
