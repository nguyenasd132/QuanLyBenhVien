import { Request, Response, Router } from 'express';
import { authenticate, requireRole } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
import { validateBody, validateQuery } from '../middleware/validate';
import {
  appointmentStatusSchema,
  callNextSchema,
  checkAllergiesSchema,
  createRecordSchema,
  followUpSchema,
  idParamSchema,
  queueQuerySchema,
  scheduleQuerySchema,
  updateRecordSchema,
  updateScheduleSchema,
  upsertScheduleSchema
} from '../schemas/doctor.schema';
import * as recordService from '../services/record.service';
import { sendSuccess } from '../utils/response';

/**
 * Cổng Bác sĩ (TV3) — `/api/doctor`, Role: DOCTOR.
 * Đối chiếu: backend/API_CONTRACT.md mục 3.5 & frontend/src/lib/api.ts (doctorApi).
 */
const router = Router();

router.use(authenticate, requireRole('DOCTOR'));

const userId = (req: Request) => req.user!.userId;
const paramId = (req: Request) => idParamSchema.parse(req.params).id;

// --- Hàng đợi & lượt khám --------------------------------------------------
router.get(
  '/queue',
  validateQuery(queueQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.getQueue(userId(req), req.query);
    return sendSuccess(res, data);
  })
);

router.post(
  '/queue/call-next',
  validateBody(callNextSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.callNext(userId(req), req.body);
    return sendSuccess(res, data);
  })
);

router.patch(
  '/appointments/:id/status',
  validateBody(appointmentStatusSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.updateAppointmentStatus(userId(req), paramId(req), req.body);
    return sendSuccess(res, data);
  })
);

router.get(
  '/patients/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.getPatientHistory(userId(req), paramId(req));
    return sendSuccess(res, data);
  })
);

// --- Đối chiếu dị ứng ------------------------------------------------------
router.post(
  '/prescriptions/check-allergies',
  validateBody(checkAllergiesSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.checkAllergies(req.body);
    return sendSuccess(res, data);
  })
);

// --- Bệnh án & đơn thuốc ---------------------------------------------------
router.post(
  '/records',
  validateBody(createRecordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.createRecord(userId(req), req.body);
    return sendSuccess(res, data, 201);
  })
);

router.get(
  '/records/:id',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.getRecordById(userId(req), paramId(req));
    return sendSuccess(res, data);
  })
);

router.put(
  '/records/:id',
  validateBody(updateRecordSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.updateRecord(userId(req), paramId(req), req.body);
    return sendSuccess(res, data);
  })
);

router.post(
  '/records/:id/publish',
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.publishRecord(userId(req), paramId(req));
    return sendSuccess(res, data);
  })
);

// --- Tái khám & lịch trực --------------------------------------------------
router.post(
  '/follow-up',
  validateBody(followUpSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.bookFollowUp(userId(req), req.body);
    return sendSuccess(res, data, 201);
  })
);

router.get(
  '/schedules',
  validateQuery(scheduleQuerySchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.listSchedules(userId(req), req.query);
    return sendSuccess(res, data);
  })
);

router.post(
  '/schedules',
  validateBody(upsertScheduleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.upsertSchedule(userId(req), req.body);
    return sendSuccess(res, data);
  })
);

router.patch(
  '/schedules/:id',
  validateBody(updateScheduleSchema),
  asyncHandler(async (req: Request, res: Response) => {
    const data = await recordService.updateSchedule(userId(req), paramId(req), req.body);
    return sendSuccess(res, data);
  })
);

export default router;
