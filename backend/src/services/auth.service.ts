import { Prisma, Role } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { signAuthToken } from '../middleware/auth';
import {
  AllergyItem,
  ChronicConditionItem,
  EmergencyContact,
  Gender
} from '../types';
import { generateHospitalCode } from '../utils/codes';
import { formatDateOnly, toDateOnly } from '../utils/date';
import {
  badRequest,
  conflict,
  forbidden,
  notFound,
  unauthorized
} from '../utils/errors';

const BCRYPT_SALT_ROUNDS = 10;

const AUTH_USER_INCLUDE = {
  patientProfile: true,
  doctorProfile: {
    include: {
      department: { select: { name: true } },
      room: { select: { name: true } }
    }
  },
  nurseProfile: {
    include: {
      department: { select: { name: true } }
    }
  }
} satisfies Prisma.UserInclude;

type UserWithProfiles = Prisma.UserGetPayload<{
  include: typeof AUTH_USER_INCLUDE;
}>;

export interface AuthUserDto {
  id: string;
  email: string;
  fullName: string;
  phone: string | null;
  role: Role;
  avatarUrl: string | null;
  isActive: boolean;
  patientProfile?: {
    id: string;
    patientCode: string;
    dateOfBirth: string | null;
    gender: Gender | null;
    address: string | null;
    nationalId: string | null;
    insuranceNumber: string | null;
    bloodType: string | null;
    allergies: AllergyItem[];
    chronicConditions: ChronicConditionItem[];
    emergencyContact: EmergencyContact | null;
  } | null;
  doctorProfile?: {
    id: string;
    doctorCode: string;
    departmentId: string;
    departmentName: string;
    roomId: string | null;
    roomName: string | null;
    specialty: string;
    title: string | null;
    consultationFee: number;
    isOnDuty: boolean;
  } | null;
  nurseProfile?: {
    id: string;
    nurseCode: string;
    departmentId: string;
    departmentName: string;
    shift: string | null;
  } | null;
}

const optionalTrimmedString = (maxLength: number) =>
  z
    .string()
    .trim()
    .max(maxLength, `Tối đa ${maxLength} ký tự`)
    .optional()
    .or(z.literal(''))
    .transform((val) => (val ? val : undefined));

export const loginSchema = z.object({
  email: z
    .string({ required_error: 'Vui lòng nhập email' })
    .trim()
    .email('Định dạng email không hợp lệ')
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu' })
    .min(1, 'Vui lòng nhập mật khẩu')
});

export const registerSchema = z.object({
  email: z
    .string({ required_error: 'Vui lòng nhập email' })
    .trim()
    .email('Định dạng email không hợp lệ')
    .transform((v) => v.toLowerCase()),
  password: z
    .string({ required_error: 'Vui lòng nhập mật khẩu' })
    .min(6, 'Mật khẩu phải có ít nhất 6 ký tự')
    .max(128, 'Mật khẩu tối đa 128 ký tự'),
  fullName: z
    .string({ required_error: 'Vui lòng nhập họ và tên' })
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(120, 'Họ và tên tối đa 120 ký tự'),
  phone: optionalTrimmedString(20),
  dateOfBirth: optionalTrimmedString(30),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  address: optionalTrimmedString(255),
  nationalId: optionalTrimmedString(30),
  insuranceNumber: optionalTrimmedString(40)
});

export const updateProfileSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, 'Họ và tên phải có ít nhất 2 ký tự')
    .max(120, 'Họ và tên tối đa 120 ký tự')
    .optional(),
  phone: z.union([z.string().trim().max(20, 'Số điện thoại tối đa 20 ký tự'), z.null()]).optional(),
  avatarUrl: z.union([z.string().trim().max(500, 'URL ảnh đại diện quá dài'), z.null()]).optional(),
  currentPassword: z.string().optional(),
  newPassword: z
    .string()
    .min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự')
    .max(128, 'Mật khẩu mới tối đa 128 ký tự')
    .optional()
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

function parseDateOfBirth(raw?: string): Date | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    throw badRequest('Ngày sinh phải theo định dạng YYYY-MM-DD');
  }
  const parsed = toDateOnly(trimmed);
  if (parsed.toISOString().slice(0, 10) !== trimmed || parsed > new Date()) {
    throw badRequest('Ngày sinh không hợp lệ');
  }
  return parsed;
}

function asJsonArray<T>(value: Prisma.JsonValue | null | undefined): T[] {
  return Array.isArray(value) ? (value as unknown as T[]) : [];
}

/**
 * Chuẩn hóa bản ghi User + hồ sơ vai trò sang DTO chuẩn theo API_CONTRACT.md.
 */
export function mapUserToAuthDto(user: UserWithProfiles): AuthUserDto {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    phone: user.phone,
    role: user.role,
    avatarUrl: user.avatarUrl,
    isActive: user.isActive,
    patientProfile: user.patientProfile
      ? {
          id: user.patientProfile.id,
          patientCode: user.patientProfile.patientCode,
          dateOfBirth: user.patientProfile.dateOfBirth
            ? formatDateOnly(user.patientProfile.dateOfBirth)
            : null,
          gender: user.patientProfile.gender,
          address: user.patientProfile.address,
          nationalId: user.patientProfile.nationalId,
          insuranceNumber: user.patientProfile.insuranceNumber,
          bloodType: user.patientProfile.bloodType,
          allergies: asJsonArray<AllergyItem>(user.patientProfile.allergies),
          chronicConditions: asJsonArray<ChronicConditionItem>(
            user.patientProfile.chronicConditions
          ),
          emergencyContact: user.patientProfile.emergencyContact
            ? (user.patientProfile.emergencyContact as unknown as EmergencyContact)
            : null
        }
      : null,
    doctorProfile: user.doctorProfile
      ? {
          id: user.doctorProfile.id,
          doctorCode: user.doctorProfile.doctorCode,
          departmentId: user.doctorProfile.departmentId,
          departmentName: user.doctorProfile.department.name,
          roomId: user.doctorProfile.roomId,
          roomName: user.doctorProfile.room?.name ?? null,
          specialty: user.doctorProfile.specialty,
          title: user.doctorProfile.title,
          consultationFee: user.doctorProfile.consultationFee,
          isOnDuty: user.doctorProfile.isOnDuty
        }
      : null,
    nurseProfile: user.nurseProfile
      ? {
          id: user.nurseProfile.id,
          nurseCode: user.nurseProfile.nurseCode,
          departmentId: user.nurseProfile.departmentId,
          departmentName: user.nurseProfile.department.name,
          shift: user.nurseProfile.shift
        }
      : null
  };
}

function issueTokenForUser(user: UserWithProfiles): string {
  return signAuthToken({
    userId: user.id,
    email: user.email,
    role: user.role
  });
}

/**
 * Xác thực đăng nhập bằng email + mật khẩu và cấp JWT token.
 */
export async function login(input: LoginInput): Promise<{ token: string; user: AuthUserDto }> {
  const user = await prisma.user.findFirst({
    where: {
      email: {
        equals: input.email,
        mode: 'insensitive'
      }
    },
    include: AUTH_USER_INCLUDE
  });

  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw unauthorized('Email hoặc mật khẩu không chính xác');
  }

  if (!user.isActive) {
    throw forbidden('Tài khoản đã bị tạm khóa, vui lòng liên hệ quản trị viên');
  }

  return {
    token: issueTokenForUser(user),
    user: mapUserToAuthDto(user)
  };
}

/**
 * Đăng ký tài khoản Bệnh nhân mới (tạo đồng thời bản ghi User + Patient) và trả về JWT token.
 */
export async function register(input: RegisterInput): Promise<{ token: string; user: AuthUserDto }> {
  const existingUser = await prisma.user.findFirst({
    where: {
      email: {
        equals: input.email,
        mode: 'insensitive'
      }
    },
    select: { id: true }
  });

  if (existingUser) {
    throw conflict('Email này đã được đăng ký trong hệ thống');
  }

  const parsedDob = parseDateOfBirth(input.dateOfBirth);
  const passwordHash = await bcrypt.hash(input.password, BCRYPT_SALT_ROUNDS);
  const patientCode = generateHospitalCode('BN');

  const createdUser = await prisma.user.create({
    data: {
      email: input.email,
      passwordHash,
      fullName: input.fullName,
      phone: input.phone ?? null,
      role: Role.PATIENT,
      isActive: true,
      patientProfile: {
        create: {
          patientCode,
          dateOfBirth: parsedDob,
          gender: input.gender ?? null,
          address: input.address ?? null,
          nationalId: input.nationalId ?? null,
          insuranceNumber: input.insuranceNumber ?? null
        }
      }
    },
    include: AUTH_USER_INCLUDE
  });

  return {
    token: issueTokenForUser(createdUser),
    user: mapUserToAuthDto(createdUser)
  };
}

/**
 * Lấy thông tin tài khoản hiện tại kèm hồ sơ vai trò tương ứng.
 */
export async function getMe(userId: string): Promise<AuthUserDto> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: AUTH_USER_INCLUDE
  });

  if (!user) {
    throw unauthorized('Tài khoản không tồn tại hoặc phiên đăng nhập không hợp lệ');
  }

  if (!user.isActive) {
    throw forbidden('Tài khoản đã bị tạm khóa');
  }

  return mapUserToAuthDto(user);
}

/**
 * Cập nhật thông tin cơ bản (họ tên, SĐT, avatar) hoặc đổi mật khẩu tài khoản hiện tại.
 */
export async function updateProfile(
  userId: string,
  input: UpdateProfileInput
): Promise<AuthUserDto> {
  const existing = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!existing) {
    throw notFound('Không tìm thấy tài khoản người dùng');
  }

  if (!existing.isActive) {
    throw forbidden('Tài khoản đã bị tạm khóa');
  }

  const updateData: Prisma.UserUpdateInput = {};

  if (input.fullName !== undefined) {
    updateData.fullName = input.fullName;
  }
  if (input.phone !== undefined) {
    updateData.phone = input.phone ? input.phone : null;
  }
  if (input.avatarUrl !== undefined) {
    updateData.avatarUrl = input.avatarUrl ? input.avatarUrl : null;
  }

  if (input.newPassword !== undefined) {
    if (!input.currentPassword) {
      throw badRequest('Vui lòng nhập mật khẩu hiện tại để đổi mật khẩu mới');
    }
    const passwordMatches = await bcrypt.compare(input.currentPassword, existing.passwordHash);
    if (!passwordMatches) {
      // Trả về 400 thay vì 401 để frontend không xóa token đăng nhập hiện tại của người dùng
      throw badRequest('Mật khẩu hiện tại không chính xác');
    }
    updateData.passwordHash = await bcrypt.hash(input.newPassword, BCRYPT_SALT_ROUNDS);
  }

  const updatedUser = await prisma.user.update({
    where: { id: userId },
    data: updateData,
    include: AUTH_USER_INCLUDE
  });

  return mapUserToAuthDto(updatedUser);
}
