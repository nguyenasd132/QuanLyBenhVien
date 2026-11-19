-- CreateEnum
CREATE TYPE "Role" AS ENUM ('PATIENT', 'DOCTOR', 'NURSE', 'ADMIN');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE', 'OTHER');

-- CreateEnum
CREATE TYPE "SessionType" AS ENUM ('MORNING', 'AFTERNOON');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('ONLINE', 'WALK_IN', 'FOLLOW_UP');

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('BOOKED', 'CHECKED_IN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "RoomType" AS ENUM ('EXAMINATION', 'INPATIENT_WARD', 'TRIAGE', 'PHARMACY', 'LAB');

-- CreateEnum
CREATE TYPE "BedStatus" AS ENUM ('AVAILABLE', 'OCCUPIED', 'MAINTENANCE');

-- CreateEnum
CREATE TYPE "RecordStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- CreateEnum
CREATE TYPE "ServiceCategory" AS ENUM ('CONSULTATION', 'LAB_TEST', 'IMAGING', 'PROCEDURE');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('PENDING_PAYMENT', 'PAID', 'DISPENSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('HOSPITAL_FEE', 'PRESCRIPTION');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('UNPAID', 'PENDING_VERIFICATION', 'PAID', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('QR_TRANSFER', 'COUNTER_CASH', 'CARD');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED', 'REJECTED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('APPOINTMENT', 'QUEUE_CALL', 'EXAM_RESULT', 'PAYMENT', 'PRESCRIPTION', 'SYSTEM');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "phone" TEXT,
    "role" "Role" NOT NULL,
    "avatar_url" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT,
    "consultation_fee" INTEGER NOT NULL DEFAULT 150000,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rooms" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "room_type" "RoomType" NOT NULL DEFAULT 'EXAMINATION',
    "floor" TEXT,
    "department_id" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rooms_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "beds" (
    "id" TEXT NOT NULL,
    "bed_number" TEXT NOT NULL,
    "room_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "status" "BedStatus" NOT NULL DEFAULT 'AVAILABLE',
    "current_patient_id" TEXT,
    "admitted_at" TIMESTAMP(3),
    "notes" TEXT,
    "assignment_history" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "beds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "patient_code" TEXT NOT NULL,
    "date_of_birth" DATE,
    "gender" "Gender",
    "address" TEXT,
    "national_id" TEXT,
    "insurance_number" TEXT,
    "blood_type" TEXT,
    "allergies" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "chronic_conditions" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "emergency_contact" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctors" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "doctor_code" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "room_id" TEXT,
    "specialty" TEXT NOT NULL,
    "title" TEXT,
    "bio" TEXT,
    "years_of_experience" INTEGER NOT NULL DEFAULT 5,
    "consultation_fee" INTEGER NOT NULL DEFAULT 150000,
    "is_on_duty" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctors_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "nurses" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "nurse_code" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "shift" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "nurses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "doctor_schedules" (
    "id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "schedule_date" DATE NOT NULL,
    "session" "SessionType" NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,
    "max_patients" INTEGER NOT NULL DEFAULT 20,
    "avg_minutes_per_patient" INTEGER NOT NULL DEFAULT 12,
    "last_queue_number" INTEGER NOT NULL DEFAULT 0,
    "is_available" BOOLEAN NOT NULL DEFAULT true,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "doctor_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "appointment_code" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "department_id" TEXT NOT NULL,
    "schedule_id" TEXT,
    "appointment_date" DATE NOT NULL,
    "session" "SessionType" NOT NULL,
    "queue_number" INTEGER NOT NULL,
    "estimated_time" TEXT NOT NULL,
    "booking_type" "BookingType" NOT NULL DEFAULT 'ONLINE',
    "booking_flow" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'BOOKED',
    "is_priority" BOOLEAN NOT NULL DEFAULT false,
    "chief_complaint" TEXT,
    "cancel_reason" TEXT,
    "checked_in_at" TIMESTAMP(3),
    "started_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "triage_data" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "chk_appointments_queue_number_positive" CHECK ("queue_number" > 0)
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" TEXT NOT NULL,
    "record_code" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "symptoms" TEXT,
    "diagnosis" TEXT NOT NULL,
    "icd_code" TEXT,
    "clinical_notes" TEXT,
    "treatment_plan" TEXT,
    "specialty_results" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "status" "RecordStatus" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medicines" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "generic_name" TEXT,
    "unit" TEXT NOT NULL,
    "unit_price" INTEGER NOT NULL,
    "stock_quantity" INTEGER NOT NULL DEFAULT 500,
    "dosage_form" TEXT,
    "contraindications" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "manufacturer" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "medicines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "services" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" "ServiceCategory" NOT NULL,
    "department_id" TEXT,
    "unit_price" INTEGER NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "services_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" TEXT NOT NULL,
    "prescription_code" TEXT NOT NULL,
    "medical_record_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "doctor_id" TEXT NOT NULL,
    "notes" TEXT,
    "allergy_warnings" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "total_amount" INTEGER NOT NULL DEFAULT 0,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "dispensed_by_nurse_id" TEXT,
    "dispensed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" TEXT NOT NULL,
    "invoice_code" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_id" TEXT,
    "prescription_id" TEXT,
    "invoice_type" "InvoiceType" NOT NULL,
    "items" JSONB NOT NULL DEFAULT '[]'::jsonb,
    "subtotal" INTEGER NOT NULL,
    "insurance_discount" INTEGER NOT NULL DEFAULT 0,
    "total_amount" INTEGER NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'UNPAID',
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "payment_code" TEXT NOT NULL,
    "invoice_id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "qr_reference" TEXT,
    "confirmed_by_nurse_id" TEXT,
    "confirmed_at" TIMESTAMP(3),
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "payload" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "is_read" BOOLEAN NOT NULL DEFAULT false,
    "read_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "actor_user_id" TEXT,
    "action" TEXT NOT NULL,
    "entity_type" TEXT NOT NULL,
    "entity_id" TEXT NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}'::jsonb,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE INDEX "users_role_is_active_idx" ON "users"("role", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "departments_code_key" ON "departments"("code");

-- CreateIndex
CREATE UNIQUE INDEX "rooms_code_key" ON "rooms"("code");
CREATE INDEX "rooms_department_id_room_type_idx" ON "rooms"("department_id", "room_type");

-- CreateIndex
CREATE UNIQUE INDEX "beds_bed_number_key" ON "beds"("bed_number");
CREATE UNIQUE INDEX "beds_current_patient_id_key" ON "beds"("current_patient_id");
CREATE INDEX "beds_department_id_status_idx" ON "beds"("department_id", "status");
CREATE INDEX "beds_room_id_status_idx" ON "beds"("room_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");
CREATE UNIQUE INDEX "patients_patient_code_key" ON "patients"("patient_code");

-- CreateIndex
CREATE UNIQUE INDEX "doctors_user_id_key" ON "doctors"("user_id");
CREATE UNIQUE INDEX "doctors_doctor_code_key" ON "doctors"("doctor_code");
CREATE INDEX "doctors_department_id_is_on_duty_idx" ON "doctors"("department_id", "is_on_duty");

-- CreateIndex
CREATE UNIQUE INDEX "nurses_user_id_key" ON "nurses"("user_id");
CREATE UNIQUE INDEX "nurses_nurse_code_key" ON "nurses"("nurse_code");
CREATE INDEX "nurses_department_id_idx" ON "nurses"("department_id");

-- CreateIndex
CREATE UNIQUE INDEX "doctor_schedules_doctor_id_schedule_date_session_key" ON "doctor_schedules"("doctor_id", "schedule_date", "session");
CREATE INDEX "doctor_schedules_schedule_date_session_is_available_idx" ON "doctor_schedules"("schedule_date", "session", "is_available");

-- CreateIndex
CREATE UNIQUE INDEX "appointments_appointment_code_key" ON "appointments"("appointment_code");
CREATE INDEX "appointments_doctor_id_appointment_date_session_queue_numbe_idx" ON "appointments"("doctor_id", "appointment_date", "session", "queue_number");
CREATE INDEX "appointments_patient_id_appointment_date_status_idx" ON "appointments"("patient_id", "appointment_date", "status");
CREATE INDEX "appointments_appointment_date_status_idx" ON "appointments"("appointment_date", "status");

-- CRITICAL: Partial Unique Indexes for atomic session-based STT and duplicate-booking protection
CREATE UNIQUE INDEX "uq_appointments_doctor_date_session_stt_active"
    ON "appointments"("doctor_id", "appointment_date", "session", "queue_number")
    WHERE "status" <> 'CANCELLED';

CREATE UNIQUE INDEX "uq_appointments_patient_doctor_date_session_active"
    ON "appointments"("patient_id", "doctor_id", "appointment_date", "session")
    WHERE "status" <> 'CANCELLED';

-- CreateIndex
CREATE UNIQUE INDEX "medical_records_record_code_key" ON "medical_records"("record_code");
CREATE UNIQUE INDEX "medical_records_appointment_id_key" ON "medical_records"("appointment_id");
CREATE INDEX "medical_records_patient_id_created_at_idx" ON "medical_records"("patient_id", "created_at");
CREATE INDEX "medical_records_doctor_id_created_at_idx" ON "medical_records"("doctor_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "medicines_code_key" ON "medicines"("code");

-- CreateIndex
CREATE UNIQUE INDEX "services_code_key" ON "services"("code");
CREATE INDEX "services_category_is_active_idx" ON "services"("category", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "prescriptions_prescription_code_key" ON "prescriptions"("prescription_code");
CREATE UNIQUE INDEX "prescriptions_medical_record_id_key" ON "prescriptions"("medical_record_id");
CREATE INDEX "prescriptions_patient_id_status_idx" ON "prescriptions"("patient_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_code_key" ON "invoices"("invoice_code");
CREATE UNIQUE INDEX "invoices_prescription_id_key" ON "invoices"("prescription_id");
CREATE INDEX "invoices_patient_id_status_idx" ON "invoices"("patient_id", "status");
CREATE INDEX "invoices_status_invoice_type_idx" ON "invoices"("status", "invoice_type");

-- CreateIndex
CREATE UNIQUE INDEX "payments_payment_code_key" ON "payments"("payment_code");
CREATE INDEX "payments_invoice_id_status_idx" ON "payments"("invoice_id", "status");
CREATE INDEX "payments_status_created_at_idx" ON "payments"("status", "created_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_is_read_created_at_idx" ON "notifications"("user_id", "is_read", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");
CREATE INDEX "audit_logs_created_at_idx" ON "audit_logs"("created_at");

-- CRITICAL: GIN Indexes on JSONB columns for fast containment/search queries
CREATE INDEX "idx_beds_assignment_history_gin" ON "beds" USING GIN ("assignment_history");
CREATE INDEX "idx_patients_allergies_gin" ON "patients" USING GIN ("allergies");
CREATE INDEX "idx_patients_chronic_conditions_gin" ON "patients" USING GIN ("chronic_conditions");
CREATE INDEX "idx_appointments_triage_data_gin" ON "appointments" USING GIN ("triage_data");
CREATE INDEX "idx_medical_records_specialty_results_gin" ON "medical_records" USING GIN ("specialty_results");
CREATE INDEX "idx_medicines_contraindications_gin" ON "medicines" USING GIN ("contraindications");
CREATE INDEX "idx_prescriptions_items_gin" ON "prescriptions" USING GIN ("items");
CREATE INDEX "idx_prescriptions_allergy_warnings_gin" ON "prescriptions" USING GIN ("allergy_warnings");
CREATE INDEX "idx_invoices_items_gin" ON "invoices" USING GIN ("items");
CREATE INDEX "idx_notifications_payload_gin" ON "notifications" USING GIN ("payload");
CREATE INDEX "idx_audit_logs_metadata_gin" ON "audit_logs" USING GIN ("metadata");

-- AddForeignKey
ALTER TABLE "rooms" ADD CONSTRAINT "rooms_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "beds" ADD CONSTRAINT "beds_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "beds" ADD CONSTRAINT "beds_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "beds" ADD CONSTRAINT "beds_current_patient_id_fkey" FOREIGN KEY ("current_patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "doctors" ADD CONSTRAINT "doctors_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "nurses" ADD CONSTRAINT "nurses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "nurses" ADD CONSTRAINT "nurses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "doctor_schedules" ADD CONSTRAINT "doctor_schedules_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "doctor_schedules"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "services" ADD CONSTRAINT "services_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_medical_record_id_fkey" FOREIGN KEY ("medical_record_id") REFERENCES "medical_records"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "doctors"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_dispensed_by_nurse_id_fkey" FOREIGN KEY ("dispensed_by_nurse_id") REFERENCES "nurses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_invoice_id_fkey" FOREIGN KEY ("invoice_id") REFERENCES "invoices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "payments" ADD CONSTRAINT "payments_confirmed_by_nurse_id_fkey" FOREIGN KEY ("confirmed_by_nurse_id") REFERENCES "nurses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
