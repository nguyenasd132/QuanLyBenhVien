import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { app } from '../src/app';
import { prisma } from '../src/config/prisma';

/**
 * Test tích hợp Cổng Bác sĩ (TV3) trên dữ liệu seed của BS. Hoàng Minh Long (BS-001).
 * Test tự tìm buổi khám có lượt IN_PROGRESS trong seed, và khôi phục dữ liệu ở afterAll.
 */
let token = '';
let doctorId = '';
let date = '';
let session: 'MORNING' | 'AFTERNOON' = 'MORNING';
let snapshot: { id: string; status: string; startedAt: Date | null; completedAt: Date | null }[] = [];
let calledAppointmentId = '';
let calledPatientId = '';
let createdRecordId: string | null = null;
const testStartedAt = new Date();

const auth = () => ({ Authorization: `Bearer ${token}` });

describe('Doctor API (/api/doctor)', () => {
  beforeAll(async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'long.doctor@antam.vn', password: '123456' });
    token = res.body.data.token;

    const doctor = await prisma.doctor.findUniqueOrThrow({ where: { doctorCode: 'BS-001' } });
    doctorId = doctor.id;
    const current = await prisma.appointment.findFirstOrThrow({
      where: { doctorId, status: 'IN_PROGRESS' },
      orderBy: { appointmentDate: 'desc' }
    });
    date = current.appointmentDate.toISOString().slice(0, 10);
    session = current.session;
    snapshot = await prisma.appointment.findMany({
      where: { doctorId, appointmentDate: current.appointmentDate },
      select: { id: true, status: true, startedAt: true, completedAt: true }
    });
  });

  afterAll(async () => {
    if (createdRecordId) {
      await prisma.prescription.deleteMany({ where: { medicalRecordId: createdRecordId } });
      await prisma.medicalRecord.deleteMany({ where: { id: createdRecordId } });
    }
    await prisma.notification.deleteMany({
      where: { type: 'QUEUE_CALL', createdAt: { gte: testStartedAt } }
    });
    for (const s of snapshot) {
      await prisma.appointment.update({
        where: { id: s.id },
        data: {
          status: s.status as never,
          startedAt: s.startedAt,
          completedAt: s.completedAt
        }
      });
    }
    await prisma.$disconnect();
  });

  it('rejects non-doctor roles', async () => {
    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'minhanh.patient@antam.vn', password: '123456' });
    const res = await request(app)
      .get('/api/doctor/queue')
      .set({ Authorization: `Bearer ${login.body.data.token}` });
    expect(res.status).toBe(403);
  });

  it('GET /queue groups by session and sorts by STT ascending', async () => {
    const res = await request(app).get('/api/doctor/queue').query({ date }).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.date).toBe(date);
    const block = res.body.data[session === 'MORNING' ? 'morning' : 'afternoon'];
    const stts = block.appointments.map((a: { queueNumber: number }) => a.queueNumber);
    expect(stts).toEqual([...stts].sort((a, b) => a - b));
    expect(block.currentServing.status).toBe('IN_PROGRESS');
    expect(block.stats.total).toBe(block.appointments.length);
    expect(block.appointments.every((a: { session: string }) => a.session === session)).toBe(true);
  });

  it('GET /queue validates query params', async () => {
    const res = await request(app).get('/api/doctor/queue').query({ date: '21-11-2026' }).set(auth());
    expect(res.status).toBe(400);
  });

  it('POST /queue/call-next refuses while a patient is in progress', async () => {
    const res = await request(app)
      .post('/api/doctor/queue/call-next')
      .send({ date, session })
      .set(auth());
    expect(res.status).toBe(409);
  });

  it('POST /queue/call-next completes current, calls next STT and notifies the patient', async () => {
    const res = await request(app)
      .post('/api/doctor/queue/call-next')
      .send({ date, session, completeCurrent: true })
      .set(auth());
    expect(res.status).toBe(200);
    const called = res.body.data;
    expect(called.status).toBe('IN_PROGRESS');
    expect(called.liveCurrentStt).toBe(called.queueNumber);
    calledAppointmentId = called.id;
    calledPatientId = called.patientId;

    const patient = await prisma.patient.findUniqueOrThrow({ where: { id: called.patientId } });
    const notif = await prisma.notification.findFirst({
      where: { userId: patient.userId, type: 'QUEUE_CALL', createdAt: { gte: testStartedAt } }
    });
    expect(notif).not.toBeNull();
  });

  it('GET /patients/:id returns profile, allergies, visit history with vitals', async () => {
    const res = await request(app).get(`/api/doctor/patients/${calledPatientId}`).set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.patient.id).toBe(calledPatientId);
    expect(Array.isArray(res.body.data.patient.allergies)).toBe(true);
    expect(res.body.data.appointments.some((a: { id: string }) => a.id === calledAppointmentId)).toBe(true);
    expect(res.body.data.records).toEqual(res.body.data.medicalRecords);
  });

  it('POST /prescriptions/check-allergies flags Penicillin-group drugs for allergic patient', async () => {
    const allergic = await prisma.patient.findUniqueOrThrow({ where: { patientCode: 'BN-08250' } });
    const amox = await prisma.medicine.findUniqueOrThrow({ where: { code: 'TH-001' } });
    const vitC = await prisma.medicine.findUniqueOrThrow({ where: { code: 'TH-010' } });
    const res = await request(app)
      .post('/api/doctor/prescriptions/check-allergies')
      .send({ patientId: allergic.id, medicineIds: [amox.id, vitC.id] })
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.hasWarnings).toBe(true);
    expect(res.body.data.warnings[0]).toMatchObject({ medicineId: amox.id, severity: 'HIGH' });
  });

  it('POST /records validates ICD-10 and required diagnosis', async () => {
    const res = await request(app)
      .post('/api/doctor/records')
      .send({ appointmentId: calledAppointmentId, diagnosis: '', icdCode: 'XYZ' })
      .set(auth());
    expect(res.status).toBe(400);
  });

  it('POST /records saves a draft record with JSONB results and prescription', async () => {
    const service = await prisma.service.findFirstOrThrow({ where: { category: 'LAB_TEST', isActive: true } });
    const amox = await prisma.medicine.findUniqueOrThrow({ where: { code: 'TH-001' } });
    const res = await request(app)
      .post('/api/doctor/records')
      .send({
        appointmentId: calledAppointmentId,
        symptoms: 'Sốt nhẹ, ho khan',
        diagnosis: 'Viêm họng cấp',
        icdCode: 'j02.9',
        specialtyResults: {
          examFindings: 'Họng đỏ',
          labOrders: [{ testName: 'Ghi chú khám', status: 'COMPLETED', result: 'Bình thường' }]
        },
        orderedServiceIds: [service.id],
        prescription: {
          items: [{ medicineId: amox.id, quantity: 10, dosage: '1 viên x 2 lần/ngày', durationDays: 5 }]
        }
      })
      .set(auth());
    expect(res.status).toBe(201);
    const { medicalRecord, prescription, invoices, allergyWarnings } = res.body.data;
    createdRecordId = medicalRecord.id;
    expect(medicalRecord.status).toBe('DRAFT');
    expect(medicalRecord.icdCode).toBe('J02.9');
    expect(medicalRecord.specialtyResults.labOrders).toHaveLength(2);
    expect(medicalRecord.specialtyResults.labOrders[1]).toMatchObject({
      serviceId: service.id,
      status: 'ORDERED'
    });
    expect(prescription.totalAmount).toBe(amox.unitPrice * 10);
    expect(prescription.allergyWarnings).toEqual(allergyWarnings);
    expect(invoices).toEqual([]);
  });

  it('POST /records rejects a second record for the same appointment', async () => {
    const res = await request(app)
      .post('/api/doctor/records')
      .send({ appointmentId: calledAppointmentId, diagnosis: 'Trùng' })
      .set(auth());
    expect(res.status).toBe(409);
  });

  it('PUT /records/:id updates fields and removes prescription with empty items', async () => {
    const res = await request(app)
      .put(`/api/doctor/records/${createdRecordId}`)
      .send({ diagnosis: 'Viêm họng cấp do virus', prescription: { items: [] } })
      .set(auth());
    expect(res.status).toBe(200);
    expect(res.body.data.medicalRecord.diagnosis).toBe('Viêm họng cấp do virus');
    expect(res.body.data.medicalRecord.icdCode).toBe('J02.9');
    expect(res.body.data.prescription).toBeNull();

    const get = await request(app).get(`/api/doctor/records/${createdRecordId}`).set(auth());
    expect(get.status).toBe(200);
    expect(get.body.data.specialtyResults.examFindings).toBe('Họng đỏ');
  });
});
