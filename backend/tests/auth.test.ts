import request from 'supertest';
import { afterAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

const TEST_EMAIL = `test.auth.${Date.now()}@antam.vn`;
const TEST_PASSWORD = 'Password123!';
const NEW_PASSWORD = 'NewPassword456!';

let createdUserId: string | null = null;
let registeredToken: string | null = null;

describe('Auth API (/api/auth)', () => {
  afterAll(async () => {
    if (createdUserId) {
      await prisma.patient.deleteMany({ where: { userId: createdUserId } });
      await prisma.user.deleteMany({ where: { id: createdUserId } });
    }
    await prisma.$disconnect();
  });

  describe('POST /api/auth/login', () => {
    it('logs in seeded demo accounts across all 4 roles and returns matching profiles', async () => {
      const cases = [
        { email: 'minhanh.patient@antam.vn', role: 'PATIENT', profileKey: 'patientProfile' },
        { email: 'long.doctor@antam.vn', role: 'DOCTOR', profileKey: 'doctorProfile' },
        { email: 'mai.nurse@antam.vn', role: 'NURSE', profileKey: 'nurseProfile' },
        { email: 'admin@antam.vn', role: 'ADMIN', profileKey: null }
      ] as const;

      for (const item of cases) {
        const res = await request(app)
          .post('/api/auth/login')
          .send({ email: item.email, password: '123456' });

        expect(res.status).toBe(200);
        expect(res.body.success).toBe(true);
        expect(typeof res.body.data.token).toBe('string');
        expect(res.body.data.user.role).toBe(item.role);
        if (item.profileKey) {
          expect(res.body.data.user[item.profileKey]).toBeTruthy();
        }
      }
    });

    it('supports case-insensitive email lookup', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'MINHANH.PATIENT@ANTAM.VN', password: '123456' });

      expect(res.status).toBe(200);
      expect(res.body.data.user.email).toBe('minhanh.patient@antam.vn');
    });

    it('rejects invalid credentials with 401 UNAUTHORIZED', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'minhanh.patient@antam.vn', password: 'wrong-password' });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('rejects malformed payload with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'not-an-email', password: '' });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('POST /api/auth/register', () => {
    it('creates a new PATIENT user + patient profile and returns 201 + JWT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `  ${TEST_EMAIL.toUpperCase()}  `,
          password: TEST_PASSWORD,
          fullName: 'Nguyễn Kiểm Thử',
          phone: '0909888777',
          dateOfBirth: '1998-05-15',
          gender: 'MALE',
          address: 'Quận 1, TP.HCM',
          nationalId: '079098001234',
          insuranceNumber: 'DN4790123456789'
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.data.token).toBe('string');

      const user = res.body.data.user;
      createdUserId = user.id;
      registeredToken = res.body.data.token;

      expect(user.email).toBe(TEST_EMAIL);
      expect(user.role).toBe('PATIENT');
      expect(user.fullName).toBe('Nguyễn Kiểm Thử');
      expect(user.patientProfile).toBeTruthy();
      expect(user.patientProfile.patientCode).toMatch(/^BN-\d{8}-[0-9A-F]{6}$/);
      expect(user.patientProfile.dateOfBirth).toBe('1998-05-15');
      expect(user.patientProfile.gender).toBe('MALE');
    });

    it('rejects duplicate email registration with 409 CONFLICT', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: TEST_EMAIL,
          password: TEST_PASSWORD,
          fullName: 'Người Dùng Trùng'
        });

      expect(res.status).toBe(409);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('CONFLICT');
    });

    it('rejects invalid calendar dateOfBirth with 400 VALIDATION_ERROR', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `bad.dob.${Date.now()}@antam.vn`,
          password: TEST_PASSWORD,
          fullName: 'Ngày Sinh Sai',
          dateOfBirth: '2020-02-31'
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });
  });

  describe('GET /api/auth/me & PATCH /api/auth/profile', () => {
    it('returns 401 when token is missing', async () => {
      const res = await request(app).get('/api/auth/me');
      expect(res.status).toBe(401);
      expect(res.body.error.code).toBe('UNAUTHORIZED');
    });

    it('returns current authenticated user profile on GET /api/auth/me', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${registeredToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.user.id).toBe(createdUserId);
      expect(res.body.data.user.patientProfile).toBeTruthy();
    });

    it('rejects password change when currentPassword is wrong (400)', async () => {
      const res = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${registeredToken}`)
        .send({
          currentPassword: 'wrong-current-password',
          newPassword: NEW_PASSWORD
        });

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('VALIDATION_ERROR');
    });

    it('updates fullName, phone and password, then allows login with new password', async () => {
      const patchRes = await request(app)
        .patch('/api/auth/profile')
        .set('Authorization', `Bearer ${registeredToken}`)
        .send({
          fullName: 'Nguyễn Kiểm Thử Đã Sửa',
          phone: '0911222333',
          currentPassword: TEST_PASSWORD,
          newPassword: NEW_PASSWORD
        });

      expect(patchRes.status).toBe(200);
      expect(patchRes.body.data.user.fullName).toBe('Nguyễn Kiểm Thử Đã Sửa');
      expect(patchRes.body.data.user.phone).toBe('0911222333');

      const oldLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: TEST_PASSWORD });
      expect(oldLogin.status).toBe(401);

      const newLogin = await request(app)
        .post('/api/auth/login')
        .send({ email: TEST_EMAIL, password: NEW_PASSWORD });
      expect(newLogin.status).toBe(200);
      expect(newLogin.body.data.user.fullName).toBe('Nguyễn Kiểm Thử Đã Sửa');
    });
  });
});
