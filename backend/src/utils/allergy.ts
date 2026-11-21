/**
 * TV3 — Đối chiếu dị ứng & chống chỉ định bệnh nền khi kê đơn.
 *
 * Module thuần (không truy cập DB) để dễ kiểm thử:
 * - Dị ứng của bệnh nhân (`patients.allergies` JSONB) được so với
 *   `medicines.contraindications.allergens`, tên thuốc và hoạt chất (`genericName`).
 * - Bệnh nền (`patients.chronic_conditions` JSONB) được so với
 *   `medicines.contraindications.conditions`.
 * So khớp không phân biệt hoa/thường, bỏ dấu tiếng Việt, cho phép chứa nhau
 * (vd. dị ứng "Penicillin" khớp với nhóm "Penicillin/Beta-lactam").
 */
import {
  AllergyItem,
  AllergyWarningDto,
  ChronicConditionItem,
  MedicineContraindications
} from '../types';

/** Độ dài tối thiểu để cho phép so khớp kiểu "chứa nhau", tránh khớp nhầm chuỗi quá ngắn. */
const MIN_PARTIAL_MATCH_LENGTH = 4;

export interface AllergyCheckPatient {
  allergies: unknown;
  chronicConditions: unknown;
}

export interface AllergyCheckMedicine {
  id: string;
  name: string;
  genericName: string | null;
  contraindications: unknown;
}

/** Chuẩn hóa chuỗi: bỏ dấu tiếng Việt, chữ thường, gộp khoảng trắng. */
export function normalizeText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** Hai thuật ngữ được coi là khớp nếu bằng nhau hoặc chứa nhau (sau chuẩn hóa). */
export function termsMatch(a: string, b: string): boolean {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  const [shorter, longer] = na.length <= nb.length ? [na, nb] : [nb, na];
  if (shorter.length < MIN_PARTIAL_MATCH_LENGTH) return false;
  return longer.includes(shorter);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Đọc an toàn cột JSONB `allergies` (chấp nhận cả mảng chuỗi). */
export function parseAllergies(value: unknown): AllergyItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): AllergyItem[] => {
    if (typeof item === 'string') return item.trim() ? [{ name: item.trim() }] : [];
    if (isRecord(item) && typeof item.name === 'string' && item.name.trim()) {
      const severity = item.severity;
      return [
        {
          name: item.name.trim(),
          severity:
            severity === 'MILD' || severity === 'MODERATE' || severity === 'SEVERE'
              ? severity
              : undefined,
          reaction: typeof item.reaction === 'string' ? item.reaction : undefined
        }
      ];
    }
    return [];
  });
}

/** Đọc an toàn cột JSONB `chronic_conditions` (chấp nhận cả mảng chuỗi). */
export function parseChronicConditions(value: unknown): ChronicConditionItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): ChronicConditionItem[] => {
    if (typeof item === 'string') return item.trim() ? [{ name: item.trim() }] : [];
    if (isRecord(item) && typeof item.name === 'string' && item.name.trim()) {
      return [
        {
          name: item.name.trim(),
          diagnosedYear: typeof item.diagnosedYear === 'number' ? item.diagnosedYear : undefined,
          notes: typeof item.notes === 'string' ? item.notes : undefined
        }
      ];
    }
    return [];
  });
}

/** Đọc an toàn cột JSONB `medicines.contraindications`. */
export function parseContraindications(value: unknown): MedicineContraindications {
  if (!isRecord(value)) return { allergens: [], conditions: [] };
  const toStringList = (v: unknown) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string' && x.trim() !== '') : [];
  return {
    allergens: toStringList(value.allergens),
    conditions: toStringList(value.conditions),
    warningText: typeof value.warningText === 'string' ? value.warningText : undefined
  };
}

/**
 * Đối chiếu 1 thuốc với hồ sơ bệnh nhân.
 * Trả về `null` nếu không có xung đột.
 * - Khớp dị ứng  → severity `HIGH`
 * - Chỉ khớp bệnh nền → severity `MODERATE`
 */
export function checkMedicineAgainstPatient(
  patient: AllergyCheckPatient,
  medicine: AllergyCheckMedicine
): AllergyWarningDto | null {
  const allergies = parseAllergies(patient.allergies);
  const conditions = parseChronicConditions(patient.chronicConditions);
  const contra = parseContraindications(medicine.contraindications);

  const medicineTerms = [
    ...(contra.allergens ?? []),
    medicine.name,
    ...(medicine.genericName ? [medicine.genericName] : [])
  ];

  const matchedAllergens = allergies
    .filter((allergy) => medicineTerms.some((term) => termsMatch(allergy.name, term)))
    .map((allergy) => allergy.name);

  const matchedConditions = conditions
    .filter((condition) =>
      (contra.conditions ?? []).some((term) => termsMatch(condition.name, term))
    )
    .map((condition) => condition.name);

  if (matchedAllergens.length === 0 && matchedConditions.length === 0) {
    return null;
  }

  const parts: string[] = [];
  if (matchedAllergens.length > 0) {
    parts.push(`Bệnh nhân dị ứng ${matchedAllergens.join(', ')}`);
  }
  if (matchedConditions.length > 0) {
    parts.push(`chống chỉ định với bệnh nền ${matchedConditions.join(', ')}`);
  }
  let message = `${medicine.name}: ${parts.join('; ')}.`;
  if (contra.warningText) {
    message += ` ${contra.warningText}.`;
  }

  return {
    medicineId: medicine.id,
    medicineName: medicine.name,
    matchedAllergens,
    matchedConditions,
    severity: matchedAllergens.length > 0 ? 'HIGH' : 'MODERATE',
    message
  };
}

/** Đối chiếu toàn bộ danh sách thuốc kê đơn, trả về các cảnh báo (HIGH trước). */
export function checkPrescriptionAllergies(
  patient: AllergyCheckPatient,
  medicines: AllergyCheckMedicine[]
): AllergyWarningDto[] {
  return medicines
    .map((medicine) => checkMedicineAgainstPatient(patient, medicine))
    .filter((warning): warning is AllergyWarningDto => warning !== null)
    .sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'HIGH' ? -1 : 1));
}
