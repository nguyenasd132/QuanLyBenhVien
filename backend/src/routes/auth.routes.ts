import { Request, Response, Router } from 'express';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody } from '../middleware/validate';
import * as authService from '../services/auth.service';
import { sendSuccess } from '../utils/response';

const router = Router();

router.post(
  '/login',
  validateBody(authService.loginSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.login(req.body);
    return sendSuccess(res, result, 200);
  })
);

router.post(
  '/register',
  validateBody(authService.registerSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const result = await authService.register(req.body);
    return sendSuccess(res, result, 201);
  })
);

router.get(
  '/me',
  authenticate,
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.getMe(req.user!.userId);
    return sendSuccess(res, { user }, 200);
  })
);

router.patch(
  '/profile',
  authenticate,
  validateBody(authService.updateProfileSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const user = await authService.updateProfile(req.user!.userId, req.body);
    return sendSuccess(res, { user }, 200);
  })
);

export default router;
