import crypto from 'crypto';
import { PrismaClient, Role, SessionType } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function toDateOnly(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00.000Z`);
}

function getTodayVn(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());
}

function addDays(dateStr: string, days: number): string {
  const d = toDateOnly(dateStr);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function computeEst(session: SessionType, stt: number, avg = 12): string {
  const start = session === 'MORNING' ? 450 : 810;
  const total = start + (stt - 1) * avg;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

async function main() {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@antam.vn' }
  });
  if (existingAdmin) {
    console.log('Seed data already exists — skipping seed.');
    return;
  }

  console.log('Seeding An Tâm Hospital & Clinic Management System...');
  const passwordHash = await bcrypt.hash('123456', 10);
  const today = getTodayVn();

  // 1. Departments (4 primary bed-holding groups + specialized outpatient departments)
  const deptNoi = await prisma.department.create({
    data: {
      code: 'NOI_TQ',
      name: 'Nội tổng quát',
      description: 'Khám và điều trị các bệnh lý nội khoa tổng quát, mãn tính',
      location: 'Tầng 2 - Khu A',
      consultationFee: 150000
    }
  });

  const deptNgoai = await prisma.department.create({
    data: {
      code: 'NGOAI',
      name: 'Ngoại khoa',
      description: 'Phẫu thuật tổng quát, chấn thương chỉnh hình và tiểu phẫu',
      location: 'Tầng 2 - Khu B',
      consultationFee: 180000
    }
  });

  const deptSanNhi = await prisma.department.create({
    data: {
      code: 'SAN_NHI',
      name: 'Sản & Nhi',
      description: 'Chăm sóc sức khỏe phụ nữ, thai sản và nhi khoa nội trú',
      location: 'Tầng 1 - Khu A',
      consultationFee: 170000
    }
  });

  const deptTimMach = await prisma.department.create({
    data: {
      code: 'TIM_MACH',
      name: 'Tim mạch',
      description: 'Chẩn đoán, theo dõi tăng huyết áp, mạch vành, rối loạn nhịp tim',
      location: 'Tầng 3 - Khu A',
      consultationFee: 220000
    }
  });

  const deptNhiKhoa = await prisma.department.create({
    data: {
      code: 'NHI_KHOA',
      name: 'Nhi khoa',
      description: 'Khám và điều trị ngoại trú cho trẻ sơ sinh và trẻ nhỏ',
      location: 'Tầng 1 - Khu B',
      consultationFee: 160000
    }
  });

  const deptDaLieu = await prisma.department.create({
    data: {
      code: 'DA_LIEU',
      name: 'Da liễu',
      description: 'Điều trị các bệnh lý da liễu, dị ứng và chăm sóc da chuyên sâu',
      location: 'Tầng 2 - Khu C',
      consultationFee: 160000
    }
  });

  const deptKhac = await prisma.department.create({
    data: {
      code: 'KHAC',
      name: 'Các khoa khác',
      description: 'Tai Mũi Họng, Mắt, Răng Hàm Mặt và Phục hồi chức năng',
      location: 'Tầng 3 - Khu B',
      consultationFee: 150000
    }
  });

  // 2. Rooms (Examination rooms + Inpatient wards for 200 beds)
  const room201 = await prisma.room.create({
    data: {
      code: 'P-201',
      name: 'Phòng 201',
      roomType: 'EXAMINATION',
      floor: 'Tầng 2',
      departmentId: deptNoi.id
    }
  });
  const room305 = await prisma.room.create({
    data: {
      code: 'P-305',
      name: 'Phòng 305',
      roomType: 'EXAMINATION',
      floor: 'Tầng 3',
      departmentId: deptTimMach.id
    }
  });
  const room102 = await prisma.room.create({
    data: {
      code: 'P-102',
      name: 'Phòng 102',
      roomType: 'EXAMINATION',
      floor: 'Tầng 1',
      departmentId: deptNhiKhoa.id
    }
  });
  const room205 = await prisma.room.create({
    data: {
      code: 'P-205',
      name: 'Phòng 205',
      roomType: 'EXAMINATION',
      floor: 'Tầng 2',
      departmentId: deptNgoai.id
    }
  });
  const room108 = await prisma.room.create({
    data: {
      code: 'P-108',
      name: 'Phòng 108',
      roomType: 'EXAMINATION',
      floor: 'Tầng 1',
      departmentId: deptSanNhi.id
    }
  });
  const room210 = await prisma.room.create({
    data: {
      code: 'P-210',
      name: 'Phòng 210',
      roomType: 'EXAMINATION',
      floor: 'Tầng 2',
      departmentId: deptDaLieu.id
    }
  });
  const room301 = await prisma.room.create({
    data: {
      code: 'P-301',
      name: 'Phòng 301',
      roomType: 'EXAMINATION',
      floor: 'Tầng 3',
      departmentId: deptKhac.id
    }
  });

  // Inpatient Ward Rooms for 200 beds
  const wardConfigs = [
    { dept: deptNoi, prefix: 'NOI', totalBeds: 60, occupied: 48, maintenance: 2, floor: 'Tầng 4' },
    { dept: deptNgoai, prefix: 'NGOAI', totalBeds: 50, occupied: 42, maintenance: 1, floor: 'Tầng 5' },
    { dept: deptSanNhi, prefix: 'SAN', totalBeds: 50, occupied: 38, maintenance: 1, floor: 'Tầng 6' },
    { dept: deptKhac, prefix: 'KHAC', totalBeds: 40, occupied: 28, maintenance: 1, floor: 'Tầng 7' }
  ];

  // 3. Admin User
  await prisma.user.create({
    data: {
      email: 'admin@antam.vn',
      passwordHash,
      fullName: 'Minh Anh',
      phone: '0901000001',
      role: Role.ADMIN
    }
  });

  // 4. Doctors
  const doctorSeeds = [
    {
      email: 'long.doctor@antam.vn',
      fullName: 'BS. Hoàng Minh Long',
      phone: '0902000001',
      doctorCode: 'BS-001',
      departmentId: deptNoi.id,
      roomId: room201.id,
      specialty: 'Nội tổng quát',
      title: 'ThS.BS',
      yearsOfExperience: 12,
      consultationFee: 150000,
      bio: 'Chuyên gia khám và điều trị các bệnh lý nội khoa, đái tháo đường và rối loạn chuyển hóa.'
    },
    {
      email: 'nguyen.doctor@antam.vn',
      fullName: 'BS. Trần Thảo Nguyên',
      phone: '0902000002',
      doctorCode: 'BS-002',
      departmentId: deptTimMach.id,
      roomId: room305.id,
      specialty: 'Tim mạch',
      title: 'BS.CKII',
      yearsOfExperience: 15,
      consultationFee: 220000,
      bio: 'Điều trị tăng huyết áp, suy tim, bệnh mạch vành và siêu âm tim.'
    },
    {
      email: 'huy.doctor@antam.vn',
      fullName: 'BS. Nguyễn Quốc Huy',
      phone: '0902000003',
      doctorCode: 'BS-003',
      departmentId: deptNhiKhoa.id,
      roomId: room102.id,
      specialty: 'Nhi khoa',
      title: 'ThS.BS',
      yearsOfExperience: 9,
      consultationFee: 160000,
      bio: 'Khám bệnh hô hấp, tiêu hóa trẻ em và tư vấn dinh dưỡng nhi khoa.'
    },
    {
      email: 'minh.doctor@antam.vn',
      fullName: 'BS. Phạm Văn Minh',
      phone: '0902000004',
      doctorCode: 'BS-004',
      departmentId: deptNgoai.id,
      roomId: room205.id,
      specialty: 'Ngoại khoa',
      title: 'BS.CKI',
      yearsOfExperience: 11,
      consultationFee: 180000,
      bio: 'Chẩn đoán ngoại tổng quát, vết thương phần mềm và chấn thương chỉnh hình.'
    },
    {
      email: 'ha.doctor@antam.vn',
      fullName: 'BS. Lê Thị Thu Hà',
      phone: '0902000005',
      doctorCode: 'BS-005',
      departmentId: deptSanNhi.id,
      roomId: room108.id,
      specialty: 'Sản & Nhi',
      title: 'BS.CKII',
      yearsOfExperience: 14,
      consultationFee: 170000,
      bio: 'Theo dõi thai kỳ, chăm sóc sản phụ khoa và sức khỏe trẻ sơ sinh.'
    },
    {
      email: 'tram.doctor@antam.vn',
      fullName: 'BS. Đặng Bảo Trâm',
      phone: '0902000006',
      doctorCode: 'BS-006',
      departmentId: deptDaLieu.id,
      roomId: room210.id,
      specialty: 'Da liễu',
      title: 'ThS.BS',
      yearsOfExperience: 8,
      consultationFee: 160000,
      bio: 'Điều trị viêm da cơ địa, dị ứng da và các bệnh da liễu thường gặp.'
    },
    {
      email: 'tung.doctor@antam.vn',
      fullName: 'BS. Vũ Thanh Tùng',
      phone: '0902000007',
      doctorCode: 'BS-007',
      departmentId: deptKhac.id,
      roomId: room301.id,
      specialty: 'Tai Mũi Họng',
      title: 'BS.CKI',
      yearsOfExperience: 10,
      consultationFee: 150000,
      bio: 'Nội soi Tai Mũi Họng, điều trị viêm xoang và viêm họng mạn tính.'
    }
  ];

  const doctors = [];
  for (const d of doctorSeeds) {
    const user = await prisma.user.create({
      data: {
        email: d.email,
        passwordHash,
        fullName: d.fullName,
        phone: d.phone,
        role: Role.DOCTOR,
        doctorProfile: {
          create: {
            doctorCode: d.doctorCode,
            departmentId: d.departmentId,
            roomId: d.roomId,
            specialty: d.specialty,
            title: d.title,
            yearsOfExperience: d.yearsOfExperience,
            consultationFee: d.consultationFee,
            bio: d.bio,
            isOnDuty: true
          }
        }
      },
      include: { doctorProfile: true }
    });
    doctors.push(user.doctorProfile!);
  }

  // 5. Nurses
  const nurseMaiUser = await prisma.user.create({
    data: {
      email: 'mai.nurse@antam.vn',
      passwordHash,
      fullName: 'ĐD. Phạm Thị Mai',
      phone: '0903000001',
      role: Role.NURSE,
      nurseProfile: {
        create: {
          nurseCode: 'DD-001',
          departmentId: deptNoi.id,
          shift: 'FULL_DAY'
        }
      }
    },
    include: { nurseProfile: true }
  });
  const nurseMai = nurseMaiUser.nurseProfile!;

  await prisma.user.create({
    data: {
      email: 'yen.nurse@antam.vn',
      passwordHash,
      fullName: 'ĐD. Nguyễn Hoàng Yến',
      phone: '0903000002',
      role: Role.NURSE,
      nurseProfile: {
        create: {
          nurseCode: 'DD-002',
          departmentId: deptNgoai.id,
          shift: 'MORNING'
        }
      }
    }
  });

  // 6. Demo & Named Patients
  const patientMinhAnhUser = await prisma.user.create({
    data: {
      email: 'minhanh.patient@antam.vn',
      passwordHash,
      fullName: 'Lê Minh Anh',
      phone: '0909123450',
      role: Role.PATIENT,
      patientProfile: {
        create: {
          patientCode: 'BN-08250',
          dateOfBirth: toDateOnly('1996-05-14'),
          gender: 'FEMALE',
          address: '120 Nguyễn Văn Cừ, Quận 5, TP.HCM',
          nationalId: '079196008250',
          insuranceNumber: 'DN4790825012345',
          bloodType: 'O+',
          allergies: [
            { name: 'Penicillin', severity: 'SEVERE', reaction: 'Nổi mề đay, khó thở' },
            { name: 'Hải sản giáp xác', severity: 'MILD', reaction: 'Ngứa nhẹ ngoài da' }
          ],
          chronicConditions: [{ name: 'Viêm mũi dị ứng', diagnosedYear: 2021 }],
          emergencyContact: {
            name: 'Lê Văn Hoàng',
            relationship: 'Anh trai',
            phone: '0909111222'
          }
        }
      }
    },
    include: { patientProfile: true }
  });
  const pMinhAnh = patientMinhAnhUser.patientProfile!;

  const pLanUser = await prisma.user.create({
    data: {
      email: 'lan.nguyen@antam.vn',
      passwordHash,
      fullName: 'Nguyễn Thị Lan',
      phone: '0909123445',
      role: Role.PATIENT,
      patientProfile: {
        create: {
          patientCode: 'BN-08245',
          dateOfBirth: toDateOnly('1984-09-20'),
          gender: 'FEMALE',
          address: '45 Lê Lợi, Quận 1, TP.HCM',
          insuranceNumber: 'GD4790824599881',
          bloodType: 'A+',
          allergies: [{ name: 'Sulfa', severity: 'MODERATE', reaction: 'Phát ban' }],
          chronicConditions: [{ name: 'Tăng huyết áp', diagnosedYear: 2022 }],
          emergencyContact: { name: 'Trần Văn Nam', relationship: 'Chồng', phone: '0908222333' }
        }
      }
    },
    include: { patientProfile: true }
  });
  const pLan = pLanUser.patientProfile!;

  const pHungUser = await prisma.user.create({
    data: {
      email: 'hung.tran@antam.vn',
      passwordHash,
      fullName: 'Trần Văn Hùng',
      phone: '0909123447',
      role: Role.PATIENT,
      patientProfile: {
        create: {
          patientCode: 'BN-08247',
          dateOfBirth: toDateOnly('1978-02-11'),
          gender: 'MALE',
          address: '88 Điện Biên Phủ, Bình Thạnh, TP.HCM',
          insuranceNumber: 'DN4790824700112',
          bloodType: 'B+',
          allergies: [],
          chronicConditions: [{ name: 'Đái tháo đường type 2', diagnosedYear: 2020 }],
          emergencyContact: { name: 'Trần Thị Hoa', relationship: 'Vợ', phone: '0908333444' }
        }
      }
    },
    include: { patientProfile: true }
  });
  const pHung = pHungUser.patientProfile!;

  const pBaoUser = await prisma.user.create({
    data: {
      email: 'bao.pham@antam.vn',
      passwordHash,
      fullName: 'Phạm Quốc Bảo',
      phone: '0909123448',
      role: Role.PATIENT,
      patientProfile: {
        create: {
          patientCode: 'BN-08248',
          dateOfBirth: toDateOnly(addDays(today, -8 * 365)),
          gender: 'MALE',
          address: '214 Cách Mạng Tháng 8, Quận 3, TP.HCM',
          insuranceNumber: 'TE1790824800555',
          bloodType: 'O+',
          allergies: [{ name: 'Ibuprofen', severity: 'MODERATE', reaction: 'Đau dạ dày' }],
          chronicConditions: [],
          emergencyContact: {
            name: 'Phạm Minh Tuấn',
            relationship: 'Bố (8 tuổi)',
            phone: '0908444555'
          }
        }
      }
    },
    include: { patientProfile: true }
  });
  const pBao = pBaoUser.patientProfile!;

  // Additional named outpatient/inpatient records
  const extraOutpatients = [
    { code: 'BN-08241', name: 'Võ Thị Ngọc Ánh', email: 'anh.vo@antam.vn', gender: 'FEMALE' as const },
    { code: 'BN-08242', name: 'Đỗ Minh Khang', email: 'khang.do@antam.vn', gender: 'MALE' as const },
    { code: 'BN-08243', name: 'Huỳnh Tấn Phát', email: 'phat.huynh@antam.vn', gender: 'MALE' as const },
    { code: 'BN-08244', name: 'Bùi Thanh Thảo', email: 'thao.bui@antam.vn', gender: 'FEMALE' as const },
    { code: 'BN-08246', name: 'Ngô Đức Anh', email: 'ducanh.ngo@antam.vn', gender: 'MALE' as const },
    { code: 'BN-08249', name: 'Lý Mỹ Linh', email: 'linh.ly@antam.vn', gender: 'FEMALE' as const }
  ];
  const outpatientPool = [pMinhAnh, pLan, pHung, pBao];

  for (const ep of extraOutpatients) {
    const u = await prisma.user.create({
      data: {
        email: ep.email,
        passwordHash,
        fullName: ep.name,
        phone: '0909555000',
        role: Role.PATIENT,
        patientProfile: {
          create: {
            patientCode: ep.code,
            dateOfBirth: toDateOnly('1990-01-15'),
            gender: ep.gender,
            bloodType: 'O+',
            allergies: [],
            chronicConditions: []
          }
        }
      },
      include: { patientProfile: true }
    });
    outpatientPool.push(u.patientProfile!);
  }

  // 7. Create 200 Beds across 4 departments (156 OCCUPIED = 78%, 39 AVAILABLE, 5 MAINTENANCE)
  let inpatientSeq = 1;
  const lastNames = ['Nguyễn', 'Trần', 'Lê', 'Phạm', 'Hoàng', 'Huỳnh', 'Võ', 'Đặng', 'Bùi', 'Đỗ'];
  const middleNames = ['Văn', 'Thị', 'Minh', 'Quốc', 'Thanh', 'Ngọc', 'Hữu', 'Gia'];
  const firstNames = ['An', 'Bình', 'Châu', 'Dũng', 'Hà', 'Hải', 'Khoa', 'Linh', 'Nam', 'Phương', 'Quân', 'Trang'];

  for (const cfg of wardConfigs) {
    const numWards = Math.ceil(cfg.totalBeds / 10);
    const wardRooms = [];
    for (let w = 1; w <= numWards; w++) {
      const r = await prisma.room.create({
        data: {
          code: `W-${cfg.prefix}-${String(w).padStart(2, '0')}`,
          name: `Khu nội trú ${cfg.dept.name} - P.${w}`,
          roomType: 'INPATIENT_WARD',
          floor: cfg.floor,
          departmentId: cfg.dept.id
        }
      });
      wardRooms.push(r);
    }

    for (let i = 1; i <= cfg.totalBeds; i++) {
      const room = wardRooms[Math.floor((i - 1) / 10)];
      const bedNumber = `${cfg.prefix}-${String(i).padStart(3, '0')}`;
      const isOccupied = i <= cfg.occupied;
      const isMaintenance = !isOccupied && i <= cfg.occupied + cfg.maintenance;

      let currentPatientId: string | null = null;
      let admittedAt: Date | null = null;

      if (isOccupied) {
        const pCode = `BN-NT-${String(inpatientSeq).padStart(4, '0')}`;
        const fullName = `${lastNames[inpatientSeq % lastNames.length]} ${
          middleNames[(inpatientSeq * 3) % middleNames.length]
        } ${firstNames[(inpatientSeq * 7) % firstNames.length]}`;
        const inUser = await prisma.user.create({
          data: {
            email: `inpatient.${inpatientSeq}@antam.vn`,
            passwordHash,
            fullName,
            phone: `091${String(1000000 + inpatientSeq)}`,
            role: Role.PATIENT,
            patientProfile: {
              create: {
                patientCode: pCode,
                dateOfBirth: toDateOnly('1975-06-01'),
                gender: inpatientSeq % 2 === 0 ? 'FEMALE' : 'MALE',
                bloodType: 'O+',
                allergies: [],
                chronicConditions: []
              }
            }
          },
          include: { patientProfile: true }
        });
        currentPatientId = inUser.patientProfile!.id;
        admittedAt = new Date(Date.now() - (inpatientSeq % 7) * 86400000);
        inpatientSeq += 1;
      }

      await prisma.bed.create({
        data: {
          bedNumber,
          roomId: room.id,
          departmentId: cfg.dept.id,
          status: isOccupied ? 'OCCUPIED' : isMaintenance ? 'MAINTENANCE' : 'AVAILABLE',
          currentPatientId,
          admittedAt,
          notes: isMaintenance ? 'Đang bảo trì thiết bị đầu giường' : null,
          assignmentHistory:
            currentPatientId && admittedAt
              ? [
                  {
                    id: crypto.randomUUID(),
                    patientId: currentPatientId,
                    assignedByNurseId: nurseMai.id,
                    action: 'ADMIT',
                    admittedAt: admittedAt.toISOString(),
                    dischargedAt: null,
                    notes: 'Nhập viện nội trú theo chỉ định'
                  }
                ]
              : []
        }
      });
    }
  }

  // 8. Medicines Catalog
  const medData = [
    {
      code: 'TH-001',
      name: 'Amoxicillin 500mg',
      genericName: 'Amoxicillin',
      unit: 'Viên',
      unitPrice: 3500,
      stockQuantity: 1200,
      dosageForm: 'Viên nang cứng',
      manufacturer: 'DHG Pharma',
      contraindications: {
        allergens: ['Penicillin', 'Amoxicillin', 'Beta-lactam'],
        conditions: [],
        warningText: 'Chống chỉ định cho bệnh nhân dị ứng nhóm Penicillin/Beta-lactam'
      }
    },
    {
      code: 'TH-002',
      name: 'Paracetamol 500mg',
      genericName: 'Acetaminophen',
      unit: 'Viên',
      unitPrice: 1500,
      stockQuantity: 2500,
      dosageForm: 'Viên nén',
      manufacturer: 'Traphaco',
      contraindications: {
        allergens: ['Paracetamol'],
        conditions: ['Suy gan nặng'],
        warningText: 'Thận trọng ở người bệnh gan'
      }
    },
    {
      code: 'TH-003',
      name: 'Ibuprofen 400mg',
      genericName: 'Ibuprofen',
      unit: 'Viên',
      unitPrice: 3000,
      stockQuantity: 800,
      dosageForm: 'Viên bao phim',
      manufacturer: 'Imexpharm',
      contraindications: {
        allergens: ['Ibuprofen', 'NSAID', 'Aspirin'],
        conditions: ['Loét dạ dày', 'Tăng huyết áp'],
        warningText: 'Tránh dùng khi dị ứng NSAID hoặc loét dạ dày'
      }
    },
    {
      code: 'TH-004',
      name: 'Azithromycin 250mg',
      genericName: 'Azithromycin',
      unit: 'Viên',
      unitPrice: 8500,
      stockQuantity: 600,
      dosageForm: 'Viên nén bao phim',
      manufacturer: 'Domesco',
      contraindications: {
        allergens: ['Macrolid', 'Azithromycin'],
        conditions: []
      }
    },
    {
      code: 'TH-005',
      name: 'Amlodipine 5mg',
      genericName: 'Amlodipine',
      unit: 'Viên',
      unitPrice: 4000,
      stockQuantity: 1000,
      dosageForm: 'Viên nén',
      manufacturer: 'Stada VN',
      contraindications: {
        allergens: ['Dihydropyridine'],
        conditions: ['Hẹp van động mạch chủ nặng']
      }
    },
    {
      code: 'TH-006',
      name: 'Metformin 850mg',
      genericName: 'Metformin HCl',
      unit: 'Viên',
      unitPrice: 3200,
      stockQuantity: 900,
      dosageForm: 'Viên nén bao phim',
      manufacturer: 'Servier',
      contraindications: {
        allergens: ['Metformin'],
        conditions: ['Suy thận nặng']
      }
    },
    {
      code: 'TH-007',
      name: 'Omeprazole 20mg',
      genericName: 'Omeprazole',
      unit: 'Viên',
      unitPrice: 4500,
      stockQuantity: 1100,
      dosageForm: 'Viên nang bao tan trong ruột',
      manufacturer: 'DHG Pharma',
      contraindications: { allergens: ['Omeprazole'], conditions: [] }
    },
    {
      code: 'TH-008',
      name: 'Loratadine 10mg',
      genericName: 'Loratadine',
      unit: 'Viên',
      unitPrice: 2500,
      stockQuantity: 1500,
      dosageForm: 'Viên nén',
      manufacturer: 'Imexpharm',
      contraindications: { allergens: ['Loratadine'], conditions: [] }
    },
    {
      code: 'TH-009',
      name: 'Cefuroxime 500mg',
      genericName: 'Cefuroxime axetil',
      unit: 'Viên',
      unitPrice: 12000,
      stockQuantity: 700,
      dosageForm: 'Viên nén bao phim',
      manufacturer: 'GSK',
      contraindications: {
        allergens: ['Cephalosporin', 'Penicillin'],
        conditions: [],
        warningText: 'Thận trọng dị ứng chéo với Penicillin'
      }
    },
    {
      code: 'TH-010',
      name: 'Vitamin C 500mg',
      genericName: 'Ascorbic Acid',
      unit: 'Viên',
      unitPrice: 2000,
      stockQuantity: 2000,
      dosageForm: 'Viên sủi',
      manufacturer: 'DHG Pharma',
      contraindications: { allergens: [], conditions: ['Sỏi thận oxalat'] }
    }
  ];

  const createdMeds = [];
  for (const m of medData) {
    createdMeds.push(await prisma.medicine.create({ data: m }));
  }

  // 9. Services Catalog
  const svcBlood = await prisma.service.create({
    data: {
      code: 'DV-XN-01',
      name: 'Xét nghiệm công thức máu toàn phần',
      category: 'LAB_TEST',
      departmentId: deptNoi.id,
      unitPrice: 120000,
      description: 'Đánh giá hồng cầu, bạch cầu, tiểu cầu'
    }
  });
  const svcBiochem = await prisma.service.create({
    data: {
      code: 'DV-XN-02',
      name: 'Sinh hóa máu (Đường huyết, Mỡ máu, Gan Thận)',
      category: 'LAB_TEST',
      departmentId: deptNoi.id,
      unitPrice: 250000,
      description: 'Glucose, HbA1c, AST/ALT, Creatinine, Lipid'
    }
  });
  const svcEcg = await prisma.service.create({
    data: {
      code: 'DV-CD-01',
      name: 'Điện tâm đồ (ECG 12 chuyển đạo)',
      category: 'IMAGING',
      departmentId: deptTimMach.id,
      unitPrice: 150000,
      description: 'Kiểm tra nhịp tim và thiếu máu cơ tim'
    }
  });
  await prisma.service.create({
    data: {
      code: 'DV-CD-02',
      name: 'Siêu âm ổ bụng tổng quát',
      category: 'IMAGING',
      departmentId: deptNoi.id,
      unitPrice: 220000,
      description: 'Siêu âm gan, mật, tụy, lách, thận'
    }
  });
  await prisma.service.create({
    data: {
      code: 'DV-CD-03',
      name: 'Chụp X-Quang ngực thẳng',
      category: 'IMAGING',
      departmentId: deptNgoai.id,
      unitPrice: 180000,
      description: 'Đánh giá phổi và lồng ngực'
    }
  });

  // 10. Doctor Schedules (-14 days to +14 days)
  const scheduleMap = new Map<string, string>();
  for (let offset = -14; offset <= 14; offset++) {
    const dateStr = addDays(today, offset);
    const dateObj = toDateOnly(dateStr);
    for (const doc of doctors) {
      for (const session of ['MORNING', 'AFTERNOON'] as SessionType[]) {
        const sched = await prisma.doctorSchedule.create({
          data: {
            doctorId: doc.id,
            scheduleDate: dateObj,
            session,
            startTime: session === 'MORNING' ? '07:30' : '13:30',
            endTime: session === 'MORNING' ? '11:30' : '17:00',
            maxPatients: 20,
            avgMinutesPerPatient: 12,
            lastQueueNumber: 0,
            isAvailable: true
          }
        });
        scheduleMap.set(`${doc.id}|${dateStr}|${session}`, sched.id);
      }
    }
  }

  // 11. Historical Appointments over past 13 days (-13 .. -1) for 7-day comparison chart
  const dailyVolumes: Record<number, number> = {
    [-13]: 10,
    [-12]: 12,
    [-11]: 11,
    [-10]: 14,
    [-9]: 13,
    [-8]: 9,
    [-7]: 12,
    [-6]: 15,
    [-5]: 17,
    [-4]: 16,
    [-3]: 19,
    [-2]: 18,
    [-1]: 14
  };

  let apptSeq = 1;
  const doctorSessionCounters = new Map<string, number>();

  for (let offset = -13; offset <= -1; offset++) {
    const dateStr = addDays(today, offset);
    const count = dailyVolumes[offset] || 12;

    for (let i = 0; i < count; i++) {
      const doc = doctors[i % doctors.length];
      const session: SessionType = i % 2 === 0 ? 'MORNING' : 'AFTERNOON';
      const pat = outpatientPool[(i + Math.abs(offset)) % outpatientPool.length];
      // Prevent duplicate (pat, doc, date, session) by varying doctor or patient
      const key = `${doc.id}|${dateStr}|${session}`;
      const nextStt = (doctorSessionCounters.get(key) || 0) + 1;

      // Ensure patient doesn't collide with same doc/date/session
      const already = await prisma.appointment.findFirst({
        where: {
          patientId: pat.id,
          doctorId: doc.id,
          appointmentDate: toDateOnly(dateStr),
          session
        }
      });
      if (already) continue;

      doctorSessionCounters.set(key, nextStt);
      const schedId = scheduleMap.get(key)!;

      await prisma.appointment.create({
        data: {
          appointmentCode: `LH-HIST-${String(apptSeq).padStart(4, '0')}`,
          patientId: pat.id,
          doctorId: doc.id,
          departmentId: doc.departmentId,
          scheduleId: schedId,
          appointmentDate: toDateOnly(dateStr),
          session,
          queueNumber: nextStt,
          estimatedTime: computeEst(session, nextStt),
          bookingType: i % 4 === 0 ? 'WALK_IN' : 'ONLINE',
          bookingFlow: 'BY_DEPARTMENT',
          status: 'COMPLETED',
          chiefComplaint: 'Khám sức khỏe định kỳ và kiểm tra triệu chứng',
          checkedInAt: new Date(`${dateStr}T01:00:00Z`),
          startedAt: new Date(`${dateStr}T01:20:00Z`),
          completedAt: new Date(`${dateStr}T01:40:00Z`)
        }
      });
      apptSeq += 1;
    }
  }

  // 12. Historical completed visit for Lê Minh Anh (with MedicalRecord, Prescription, Paid Invoices)
  const yesterdayStr = addDays(today, -1);
  const docLong = doctors[0];
  const docNguyen = doctors[1];
  const docHuy = doctors[2];

  const maHistKey = `${docLong.id}|${yesterdayStr}|MORNING`;
  const maHistStt = (doctorSessionCounters.get(maHistKey) || 0) + 1;
  doctorSessionCounters.set(maHistKey, maHistStt);

  const maPastAppt = await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-2026-0001',
      patientId: pMinhAnh.id,
      doctorId: docLong.id,
      departmentId: docLong.departmentId,
      scheduleId: scheduleMap.get(maHistKey)!,
      appointmentDate: toDateOnly(yesterdayStr),
      session: 'MORNING',
      queueNumber: maHistStt,
      estimatedTime: computeEst('MORNING', maHistStt),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DEPARTMENT',
      status: 'COMPLETED',
      chiefComplaint: 'Đau đầu nhẹ, mệt mỏi kéo dài 3 ngày',
      checkedInAt: new Date(Date.now() - 86400000),
      startedAt: new Date(Date.now() - 85500000),
      completedAt: new Date(Date.now() - 84600000),
      triageData: {
        id: crypto.randomUUID(),
        nurseId: nurseMai.id,
        nurseName: 'ĐD. Phạm Thị Mai',
        vitals: {
          bloodPressureSystolic: 118,
          bloodPressureDiastolic: 76,
          heartRate: 74,
          temperature: 36.8,
          spo2: 99,
          heightCm: 162,
          weightKg: 53,
          bmi: 20.2
        },
        checklistData: {
          bhytVerified: true,
          identityVerified: true,
          allergyScreened: true,
          consentSigned: true,
          notes: 'Lưu ý dị ứng Penicillin'
        },
        triageNotes: null,
        recordedAt: new Date(Date.now() - 85800000).toISOString()
      }
    }
  });

  const maRecord = await prisma.medicalRecord.create({
    data: {
      recordCode: 'HS-2026-0001',
      appointmentId: maPastAppt.id,
      patientId: pMinhAnh.id,
      doctorId: docLong.id,
      symptoms: 'Đau đầu vùng trán, hắt hơi, nghẹt mũi buổi sáng',
      diagnosis: 'Viêm mũi dị ứng kết hợp suy nhược nhẹ',
      icdCode: 'J30.4',
      clinicalNotes: 'Niêm mạc mũi phù nề nhẹ, tim phổi bình thường',
      treatmentPlan: 'Dùng kháng histamin thế hệ 2, bổ sung vitamin C, tránh tác nhân dị ứng',
      specialtyResults: {
        examFindings: 'Họng sạch, không sốt, huyết áp ổn định 118/76 mmHg',
        labOrders: [
          {
            serviceId: svcBlood.id,
            testName: svcBlood.name,
            status: 'COMPLETED',
            result: 'Bình thường (WBC 6.8 G/L)',
            normalRange: '4.0 - 10.0 G/L'
          }
        ]
      },
      status: 'PUBLISHED',
      publishedAt: new Date(Date.now() - 84000000)
    }
  });

  const medPara = createdMeds[1]; // Paracetamol
  const medLoratadine = createdMeds[7]; // Loratadine
  const medVitC = createdMeds[9]; // Vitamin C

  const rxTotal = 10 * medLoratadine.unitPrice + 10 * medVitC.unitPrice;
  const maRx = await prisma.prescription.create({
    data: {
      prescriptionCode: 'DT-2026-0001',
      medicalRecordId: maRecord.id,
      patientId: pMinhAnh.id,
      doctorId: docLong.id,
      notes: 'Uống nhiều nước ấm, tránh thức khuya',
      allergyWarnings: [],
      totalAmount: rxTotal,
      status: 'DISPENSED',
      dispensedByNurseId: nurseMai.id,
      dispensedAt: new Date(Date.now() - 83000000),
      items: [
        {
          id: crypto.randomUUID(),
          medicineId: medLoratadine.id,
          medicineCode: medLoratadine.code,
          medicineName: medLoratadine.name,
          genericName: medLoratadine.genericName,
          unit: medLoratadine.unit,
          quantity: 10,
          dosage: '1 viên/ngày',
          frequency: 'Tối trước khi ngủ',
          durationDays: 10,
          instructions: 'Uống sau ăn',
          unitPrice: medLoratadine.unitPrice,
          lineTotal: 10 * medLoratadine.unitPrice
        },
        {
          id: crypto.randomUUID(),
          medicineId: medVitC.id,
          medicineCode: medVitC.code,
          medicineName: medVitC.name,
          genericName: medVitC.genericName,
          unit: medVitC.unit,
          quantity: 10,
          dosage: '1 viên/ngày',
          frequency: 'Buổi sáng',
          durationDays: 10,
          instructions: 'Hòa tan với 200ml nước',
          unitPrice: medVitC.unitPrice,
          lineTotal: 10 * medVitC.unitPrice
        }
      ]
    }
  });

  // Paid Hospital fee invoice + Paid Prescription invoice for yesterday's visit
  const pastHospTotal = docLong.consultationFee + svcBlood.unitPrice;
  const invPastHosp = await prisma.invoice.create({
    data: {
      invoiceCode: 'HD-2026-0001',
      patientId: pMinhAnh.id,
      appointmentId: maPastAppt.id,
      invoiceType: 'HOSPITAL_FEE',
      subtotal: pastHospTotal,
      insuranceDiscount: 0,
      totalAmount: pastHospTotal,
      status: 'PAID',
      paidAt: new Date(Date.now() - 83500000),
      items: [
        {
          id: crypto.randomUUID(),
          serviceId: null,
          medicineId: null,
          description: `Phí khám Nội tổng quát - ${docLong.doctorCode}`,
          quantity: 1,
          unitPrice: docLong.consultationFee,
          lineTotal: docLong.consultationFee
        },
        {
          id: crypto.randomUUID(),
          serviceId: svcBlood.id,
          medicineId: null,
          description: svcBlood.name,
          quantity: 1,
          unitPrice: svcBlood.unitPrice,
          lineTotal: svcBlood.unitPrice
        }
      ]
    }
  });

  await prisma.payment.create({
    data: {
      paymentCode: 'TT-2026-0001',
      invoiceId: invPastHosp.id,
      patientId: pMinhAnh.id,
      amount: pastHospTotal,
      method: 'QR_TRANSFER',
      status: 'CONFIRMED',
      qrReference: 'ANTAM-HD-2026-0001',
      confirmedByNurseId: nurseMai.id,
      confirmedAt: new Date(Date.now() - 83500000)
    }
  });

  const invPastRx = await prisma.invoice.create({
    data: {
      invoiceCode: 'HD-2026-0002',
      patientId: pMinhAnh.id,
      appointmentId: maPastAppt.id,
      prescriptionId: maRx.id,
      invoiceType: 'PRESCRIPTION',
      subtotal: rxTotal,
      insuranceDiscount: 0,
      totalAmount: rxTotal,
      status: 'PAID',
      paidAt: new Date(Date.now() - 83200000),
      items: [
        {
          id: crypto.randomUUID(),
          serviceId: null,
          medicineId: medLoratadine.id,
          description: `${medLoratadine.name} (10 ${medLoratadine.unit})`,
          quantity: 10,
          unitPrice: medLoratadine.unitPrice,
          lineTotal: 10 * medLoratadine.unitPrice
        },
        {
          id: crypto.randomUUID(),
          serviceId: null,
          medicineId: medVitC.id,
          description: `${medVitC.name} (10 ${medVitC.unit})`,
          quantity: 10,
          unitPrice: medVitC.unitPrice,
          lineTotal: 10 * medVitC.unitPrice
        }
      ]
    }
  });

  await prisma.payment.create({
    data: {
      paymentCode: 'TT-2026-0002',
      invoiceId: invPastRx.id,
      patientId: pMinhAnh.id,
      amount: rxTotal,
      method: 'COUNTER_CASH',
      status: 'CONFIRMED',
      confirmedByNurseId: nurseMai.id,
      confirmedAt: new Date(Date.now() - 83200000)
    }
  });

  // 13. Today's Appointments (Active workflow across portals!)
  // Doctor Long (Nội tổng quát, Phòng 201) MORNING:
  // STT #1: Nguyễn Thị Lan (COMPLETED -> unpaid prescription ready to pay!)
  // STT #2: Trần Văn Hùng (IN_PROGRESS -> currently being examined!)
  // STT #3: Lê Minh Anh (CHECKED_IN -> next waiting for Doctor Long & Patient upcoming!)
  // STT #4: Võ Thị Ngọc Ánh (BOOKED -> waiting check-in at nurse desk)
  const todayLongMorningKey = `${docLong.id}|${today}|MORNING`;
  const schedLongTodayMorn = scheduleMap.get(todayLongMorningKey)!;

  const apptLanToday = await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-TODAY-001',
      patientId: pLan.id,
      doctorId: docLong.id,
      departmentId: docLong.departmentId,
      scheduleId: schedLongTodayMorn,
      appointmentDate: toDateOnly(today),
      session: 'MORNING',
      queueNumber: 1,
      estimatedTime: computeEst('MORNING', 1),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DEPARTMENT',
      status: 'COMPLETED',
      chiefComplaint: 'Tái khám kiểm tra huyết áp định kỳ',
      checkedInAt: new Date(),
      startedAt: new Date(),
      completedAt: new Date(),
      triageData: {
        id: crypto.randomUUID(),
        nurseId: nurseMai.id,
        nurseName: 'ĐD. Phạm Thị Mai',
        vitals: {
          bloodPressureSystolic: 138,
          bloodPressureDiastolic: 86,
          heartRate: 78,
          temperature: 36.7,
          spo2: 98,
          heightCm: 158,
          weightKg: 57,
          bmi: 22.8
        },
        checklistData: {
          bhytVerified: true,
          identityVerified: true,
          allergyScreened: true,
          consentSigned: true
        },
        triageNotes: null,
        recordedAt: new Date().toISOString()
      }
    }
  });

  const recLanToday = await prisma.medicalRecord.create({
    data: {
      recordCode: 'HS-TODAY-001',
      appointmentId: apptLanToday.id,
      patientId: pLan.id,
      doctorId: docLong.id,
      symptoms: 'Nhức đầu nhẹ vùng chẩm buổi sáng',
      diagnosis: 'Tăng huyết áp độ 1 kiểm soát tương đối ổn',
      icdCode: 'I10',
      clinicalNotes: 'Tiếp tục duy trì thuốc hạ áp, giảm muối',
      treatmentPlan: 'Tái khám sau 1 tháng',
      specialtyResults: {
        examFindings: 'Tim đều T1 T2 rõ',
        labOrders: [{ serviceId: svcBiochem.id, testName: svcBiochem.name, status: 'COMPLETED', result: 'Glucose 5.4 mmol/L' }]
      },
      status: 'PUBLISHED',
      publishedAt: new Date()
    }
  });

  const medAmlo = createdMeds[4]; // Amlodipine 5mg
  const rxLanTotal = 30 * medAmlo.unitPrice;
  const rxLan = await prisma.prescription.create({
    data: {
      prescriptionCode: 'DT-TODAY-001',
      medicalRecordId: recLanToday.id,
      patientId: pLan.id,
      doctorId: docLong.id,
      notes: 'Uống đều mỗi sáng, theo dõi huyết áp tại nhà',
      allergyWarnings: [],
      totalAmount: rxLanTotal,
      status: 'PENDING_PAYMENT',
      items: [
        {
          id: crypto.randomUUID(),
          medicineId: medAmlo.id,
          medicineCode: medAmlo.code,
          medicineName: medAmlo.name,
          genericName: medAmlo.genericName,
          unit: medAmlo.unit,
          quantity: 30,
          dosage: '1 viên/ngày',
          frequency: 'Buổi sáng',
          durationDays: 30,
          instructions: 'Uống sau ăn sáng',
          unitPrice: medAmlo.unitPrice,
          lineTotal: rxLanTotal
        }
      ]
    }
  });

  // Unpaid/Pending Verification Invoices for Cashier demo
  const invLanHosp = await prisma.invoice.create({
    data: {
      invoiceCode: 'HD-TODAY-001',
      patientId: pLan.id,
      appointmentId: apptLanToday.id,
      invoiceType: 'HOSPITAL_FEE',
      subtotal: docLong.consultationFee + svcBiochem.unitPrice,
      insuranceDiscount: 0,
      totalAmount: docLong.consultationFee + svcBiochem.unitPrice,
      status: 'PENDING_VERIFICATION',
      items: [
        {
          id: crypto.randomUUID(),
          serviceId: null,
          medicineId: null,
          description: `Phí khám Nội tổng quát - ${docLong.doctorCode}`,
          quantity: 1,
          unitPrice: docLong.consultationFee,
          lineTotal: docLong.consultationFee
        },
        {
          id: crypto.randomUUID(),
          serviceId: svcBiochem.id,
          medicineId: null,
          description: svcBiochem.name,
          quantity: 1,
          unitPrice: svcBiochem.unitPrice,
          lineTotal: svcBiochem.unitPrice
        }
      ]
    }
  });

  await prisma.payment.create({
    data: {
      paymentCode: 'TT-TODAY-001',
      invoiceId: invLanHosp.id,
      patientId: pLan.id,
      amount: invLanHosp.totalAmount,
      method: 'QR_TRANSFER',
      status: 'PENDING',
      qrReference: `ANTAM-${invLanHosp.invoiceCode}`,
      notes: 'Bệnh nhân vừa chuyển khoản QR, chờ điều dưỡng đối soát'
    }
  });

  await prisma.invoice.create({
    data: {
      invoiceCode: 'HD-TODAY-002',
      patientId: pLan.id,
      appointmentId: apptLanToday.id,
      prescriptionId: rxLan.id,
      invoiceType: 'PRESCRIPTION',
      subtotal: rxLanTotal,
      insuranceDiscount: 0,
      totalAmount: rxLanTotal,
      status: 'UNPAID',
      items: [
        {
          id: crypto.randomUUID(),
          serviceId: null,
          medicineId: medAmlo.id,
          description: `${medAmlo.name} (30 ${medAmlo.unit})`,
          quantity: 30,
          unitPrice: medAmlo.unitPrice,
          lineTotal: rxLanTotal
        }
      ]
    }
  });

  // STT #2 for Doctor Long: Trần Văn Hùng (IN_PROGRESS)
  await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-TODAY-002',
      patientId: pHung.id,
      doctorId: docLong.id,
      departmentId: docLong.departmentId,
      scheduleId: schedLongTodayMorn,
      appointmentDate: toDateOnly(today),
      session: 'MORNING',
      queueNumber: 2,
      estimatedTime: computeEst('MORNING', 2),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DOCTOR',
      status: 'IN_PROGRESS',
      chiefComplaint: 'Kiểm tra đường huyết và tê bì bàn chân',
      checkedInAt: new Date(),
      startedAt: new Date(),
      triageData: {
        id: crypto.randomUUID(),
        nurseId: nurseMai.id,
        nurseName: 'ĐD. Phạm Thị Mai',
        vitals: {
          bloodPressureSystolic: 130,
          bloodPressureDiastolic: 82,
          heartRate: 80,
          temperature: 36.6,
          spo2: 98,
          heightCm: 170,
          weightKg: 72,
          bmi: 24.9
        },
        checklistData: {
          bhytVerified: true,
          identityVerified: true,
          allergyScreened: true,
          consentSigned: true
        },
        triageNotes: 'Bệnh nhân nhịn ăn sáng để xét nghiệm đường huyết',
        recordedAt: new Date().toISOString()
      }
    }
  });

  // STT #3 for Doctor Long: Lê Minh Anh (CHECKED_IN)
  const apptMinhAnhToday = await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-TODAY-003',
      patientId: pMinhAnh.id,
      doctorId: docLong.id,
      departmentId: docLong.departmentId,
      scheduleId: schedLongTodayMorn,
      appointmentDate: toDateOnly(today),
      session: 'MORNING',
      queueNumber: 3,
      estimatedTime: computeEst('MORNING', 3),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DEPARTMENT',
      status: 'CHECKED_IN',
      chiefComplaint: 'Ho khan, rát họng nhẹ 2 ngày nay',
      checkedInAt: new Date(),
      triageData: {
        id: crypto.randomUUID(),
        nurseId: nurseMai.id,
        nurseName: 'ĐD. Phạm Thị Mai',
        vitals: {
          bloodPressureSystolic: 115,
          bloodPressureDiastolic: 75,
          heartRate: 76,
          temperature: 37.3,
          spo2: 99,
          heightCm: 162,
          weightKg: 53,
          bmi: 20.2
        },
        checklistData: {
          bhytVerified: true,
          identityVerified: true,
          allergyScreened: true,
          consentSigned: true,
          notes: 'CẢNH BÁO DỊ ỨNG PENICILLIN'
        },
        triageNotes: null,
        recordedAt: new Date().toISOString()
      }
    }
  });

  // Unpaid hospital consultation invoice for Lê Minh Anh so Patient Billing page has an unpaid item to demo QR!
  await prisma.invoice.create({
    data: {
      invoiceCode: 'HD-TODAY-003',
      patientId: pMinhAnh.id,
      appointmentId: apptMinhAnhToday.id,
      invoiceType: 'HOSPITAL_FEE',
      subtotal: docLong.consultationFee,
      insuranceDiscount: 0,
      totalAmount: docLong.consultationFee,
      status: 'UNPAID',
      items: [
        {
          id: crypto.randomUUID(),
          serviceId: null,
          medicineId: null,
          description: `Phí khám Nội tổng quát - ${docLong.doctorCode}`,
          quantity: 1,
          unitPrice: docLong.consultationFee,
          lineTotal: docLong.consultationFee
        }
      ]
    }
  });

  // STT #4 for Doctor Long: Võ Thị Ngọc Ánh (BOOKED)
  await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-TODAY-004',
      patientId: outpatientPool[4].id,
      doctorId: docLong.id,
      departmentId: docLong.departmentId,
      scheduleId: schedLongTodayMorn,
      appointmentDate: toDateOnly(today),
      session: 'MORNING',
      queueNumber: 4,
      estimatedTime: computeEst('MORNING', 4),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DATE',
      status: 'BOOKED',
      chiefComplaint: 'Đau dạ dày khi đói'
    }
  });

  // Doctor Nguyên (Tim mạch, Phòng 305) today: STT #1 (BOOKED)
  const todayNguyenKey = `${docNguyen.id}|${today}|MORNING`;
  await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-TODAY-005',
      patientId: outpatientPool[5].id,
      doctorId: docNguyen.id,
      departmentId: docNguyen.departmentId,
      scheduleId: scheduleMap.get(todayNguyenKey)!,
      appointmentDate: toDateOnly(today),
      session: 'MORNING',
      queueNumber: 1,
      estimatedTime: computeEst('MORNING', 1),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DOCTOR',
      status: 'CHECKED_IN',
      chiefComplaint: 'Hồi hộp, nhịp tim nhanh khi gắng sức',
      checkedInAt: new Date()
    }
  });

  // Doctor Huy (Nhi khoa, Phòng 102) today: Phạm Quốc Bảo (8 tuổi, BOOKED)
  const todayHuyKey = `${docHuy.id}|${today}|MORNING`;
  await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-TODAY-006',
      patientId: pBao.id,
      doctorId: docHuy.id,
      departmentId: docHuy.departmentId,
      scheduleId: scheduleMap.get(todayHuyKey)!,
      appointmentDate: toDateOnly(today),
      session: 'MORNING',
      queueNumber: 1,
      estimatedTime: computeEst('MORNING', 1),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DEPARTMENT',
      status: 'BOOKED',
      chiefComplaint: 'Sốt 38.5°C, ho có đờm (Phạm Quốc Bảo - 8 tuổi)'
    }
  });

  // Also book an appointment for Lê Minh Anh tomorrow afternoon so upcoming list has multiple entries
  const tomorrowStr = addDays(today, 1);
  const tomorrowNguyenKey = `${docNguyen.id}|${tomorrowStr}|AFTERNOON`;
  await prisma.appointment.create({
    data: {
      appointmentCode: 'LH-TMR-001',
      patientId: pMinhAnh.id,
      doctorId: docNguyen.id,
      departmentId: docNguyen.departmentId,
      scheduleId: scheduleMap.get(tomorrowNguyenKey)!,
      appointmentDate: toDateOnly(tomorrowStr),
      session: 'AFTERNOON',
      queueNumber: 1,
      estimatedTime: computeEst('AFTERNOON', 1),
      bookingType: 'ONLINE',
      bookingFlow: 'BY_DOCTOR',
      status: 'BOOKED',
      chiefComplaint: 'Đo điện tâm đồ kiểm tra định kỳ'
    }
  });
  doctorSessionCounters.set(tomorrowNguyenKey, 1);
  doctorSessionCounters.set(todayLongMorningKey, 4);
  doctorSessionCounters.set(todayNguyenKey, 1);
  doctorSessionCounters.set(todayHuyKey, 1);

  // Sync lastQueueNumber on all schedules that had seeded appointments
  for (const [key, maxStt] of doctorSessionCounters.entries()) {
    const schedId = scheduleMap.get(key);
    if (schedId) {
      await prisma.doctorSchedule.update({
        where: { id: schedId },
        data: { lastQueueNumber: maxStt }
      });
    }
  }

  // 14. Notifications for Lê Minh Anh
  await prisma.notification.createMany({
    data: [
      {
        userId: pMinhAnh.userId,
        title: 'Lịch khám hôm nay • STT #03',
        message: `Bạn đã check-in thành công tại Nội tổng quát (${room201.name}). Bác sĩ đang khám đến STT #02.`,
        type: 'APPOINTMENT',
        payload: { appointmentId: apptMinhAnhToday.id, queueNumber: 3 },
        isRead: false
      },
      {
        userId: pMinhAnh.userId,
        title: `Có kết quả khám mới • ${maRecord.recordCode}`,
        message: 'BS. Hoàng Minh Long đã công bố kết quả khám ngày hôm qua và đơn thuốc.',
        type: 'EXAM_RESULT',
        payload: { medicalRecordId: maRecord.id },
        isRead: false
      },
      {
        userId: pMinhAnh.userId,
        title: 'Hóa đơn cần thanh toán • HD-TODAY-003',
        message: 'Phí khám Nội tổng quát (150.000đ) đang chờ thanh toán.',
        type: 'PAYMENT',
        payload: { amount: 150000 },
        isRead: true,
        readAt: new Date()
      }
    ]
  });

  // Note: Unused variables check
  void medPara;
  void svcEcg;

  console.log('Seed completed successfully! (200 beds, 7 doctors, 2 nurses, demo accounts ready)');
}

main()
  .catch((err) => {
    console.error('Seed error:', err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
