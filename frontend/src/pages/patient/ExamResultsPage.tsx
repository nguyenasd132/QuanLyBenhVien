import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  FileText,
  FlaskConical,
  Pill,
  Printer,
} from 'lucide-react';
import { ApiError, patientApi } from '@/lib/api';
import { formatCurrencyVND, formatDateVN, getSessionShortLabel } from '@/lib/format';
import type { MedicalRecordDto, PrescriptionDto } from '@/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  PrescriptionStatusBadge,
  Spinner,
  Table,
  Tabs,
} from '@/components/ui';

export const ExamResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const targetRecordId = searchParams.get('recordId');
  const [records, setRecords] = useState<MedicalRecordDto[]>([]);
  const [prescriptions, setPrescriptions] = useState<PrescriptionDto[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<MedicalRecordDto | null>(null);
  const [tab, setTab] = useState<'RECORDS' | 'PRESCRIPTIONS'>('RECORDS');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [recs, rxs] = await Promise.all([
          patientApi.getRecords(),
          patientApi.getPrescriptions(),
        ]);
        setRecords(recs);
        setPrescriptions(rxs);
        if (recs.length > 0) {
          const matched = targetRecordId ? recs.find((r) => r.id === targetRecordId) : null;
          setSelectedRecord(matched || recs[0]);
        }
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Không thể tải kết quả khám.');
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const handleSelectRecord = async (rec: MedicalRecordDto) => {
    setSelectedRecord(rec);
    try {
      const full = await patientApi.getRecordDetail(rec.id);
      setSelectedRecord(full);
    } catch {
      // keep summary record
    }
  };

  if (loading) {
    return <Spinner label="Đang tải kết quả khám & đơn thuốc..." />;
  }

  return (
    <div className="space-y-5">
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Kết quả khám & Đơn thuốc</h1>
          <p className="text-sm text-slate-600 mt-0.5">
            Xem chẩn đoán, chỉ số sinh hiệu, kết quả cận lâm sàng và đơn thuốc chi tiết.
          </p>
        </div>
        {selectedRecord && tab === 'RECORDS' && (
          <Button
            variant="outline"
            size="sm"
            leftIcon={<Printer className="h-4 w-4" />}
            onClick={() => window.print()}
          >
            In phiếu kết quả
          </Button>
        )}
      </div>

      <div className="no-print">
        <Tabs
          activeId={tab}
          onChange={(id) => setTab(id as 'RECORDS' | 'PRESCRIPTIONS')}
          items={[
            {
              id: 'RECORDS',
              label: 'Hồ sơ kết quả khám',
              icon: <FileText className="h-4 w-4" />,
              count: records.length,
            },
            {
              id: 'PRESCRIPTIONS',
              label: 'Đơn thuốc điện tử',
              icon: <Pill className="h-4 w-4" />,
              count: prescriptions.length,
            },
          ]}
        />
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      {tab === 'RECORDS' ? (
        records.length === 0 ? (
          <EmptyState
            icon={<FileText className="h-6 w-6" />}
            title="Chưa có kết quả khám được công bố"
            description="Sau khi bác sĩ hoàn tất buổi khám và công bố hồ sơ, kết quả sẽ hiển thị tại đây."
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Master list */}
            <div className="no-print lg:col-span-4 space-y-2.5">
              {records.map((rec) => {
                const active = selectedRecord?.id === rec.id;
                return (
                  <button
                    key={rec.id}
                    type="button"
                    onClick={() => void handleSelectRecord(rec)}
                    className={`w-full text-left p-4 rounded-2xl border transition-all ${
                      active
                        ? 'bg-[#DCEAFB] border-[#1D5BB8] shadow-sm'
                        : 'bg-white border-[#C7D6EA] hover:bg-[#EDF3FB]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-extrabold text-[#1D5BB8]">
                        {rec.recordCode}
                      </span>
                      <span className="text-[11px] text-slate-600">
                        {formatDateVN(rec.appointmentDate)}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-slate-900 mt-1 line-clamp-2">
                      {rec.diagnosis}
                    </p>
                    <p className="text-xs text-slate-600 mt-1">
                      {rec.departmentName} • {rec.doctorName}
                    </p>
                  </button>
                );
              })}
            </div>

            {/* Print-friendly Detail Sheet */}
            <div className="lg:col-span-8">
              {selectedRecord && (
                <Card padding="lg" className="print-only-card space-y-5">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 pb-4 border-b border-[#C7D6EA]">
                    <div>
                      <p className="text-xs font-bold text-[#1D5BB8] uppercase">
                        Bệnh viện Đa khoa An Tâm • Phiếu kết quả khám bệnh
                      </p>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-1">
                        {selectedRecord.diagnosis}
                      </h2>
                      <p className="text-xs text-slate-600 mt-1">
                        Mã hồ sơ: <strong>{selectedRecord.recordCode}</strong>
                        {selectedRecord.icdCode ? ` • ICD-10: ${selectedRecord.icdCode}` : ''} •{' '}
                        {formatDateVN(selectedRecord.appointmentDate)} (
                        {getSessionShortLabel(selectedRecord.session)})
                      </p>
                    </div>
                    <Badge variant="emerald">Đã công bố</Badge>
                  </div>

                  {/* Doctor & Patient meta */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs sm:text-sm p-3.5 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
                    <div>
                      <p className="text-slate-600 text-xs">Bệnh nhân</p>
                      <p className="font-bold text-slate-900">
                        {selectedRecord.patientName} ({selectedRecord.patientCode})
                      </p>
                    </div>
                    <div>
                      <p className="text-slate-600 text-xs">Bác sĩ phụ trách</p>
                      <p className="font-bold text-slate-900">
                        {selectedRecord.doctorTitle ? `${selectedRecord.doctorTitle} ` : ''}
                        {selectedRecord.doctorName} • {selectedRecord.departmentName}
                      </p>
                    </div>
                  </div>

                  {/* Vitals */}
                  {selectedRecord.vitals && (
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                        <Activity className="h-4 w-4 text-[#1D5BB8]" />
                        Chỉ số sinh hiệu
                      </h3>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                        {selectedRecord.vitals.bloodPressureSystolic && (
                          <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                            <span className="text-slate-600 block">Huyết áp</span>
                            <strong className="text-sm text-slate-900">
                              {selectedRecord.vitals.bloodPressureSystolic}/
                              {selectedRecord.vitals.bloodPressureDiastolic} mmHg
                            </strong>
                          </div>
                        )}
                        {selectedRecord.vitals.heartRate && (
                          <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                            <span className="text-slate-600 block">Nhịp tim</span>
                            <strong className="text-sm text-slate-900">
                              {selectedRecord.vitals.heartRate} lần/phút
                            </strong>
                          </div>
                        )}
                        {selectedRecord.vitals.temperature && (
                          <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                            <span className="text-slate-600 block">Nhiệt độ</span>
                            <strong className="text-sm text-slate-900">
                              {selectedRecord.vitals.temperature} °C
                            </strong>
                          </div>
                        )}
                        {selectedRecord.vitals.spo2 && (
                          <div className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                            <span className="text-slate-600 block">SpO2</span>
                            <strong className="text-sm text-slate-900">
                              {selectedRecord.vitals.spo2}%
                            </strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Clinical Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    {selectedRecord.symptoms && (
                      <div className="p-3.5 rounded-xl border border-[#C7D6EA]">
                        <p className="text-xs font-bold text-slate-600 mb-1">Triệu chứng</p>
                        <p className="text-slate-900">{selectedRecord.symptoms}</p>
                      </div>
                    )}
                    {selectedRecord.clinicalNotes && (
                      <div className="p-3.5 rounded-xl border border-[#C7D6EA]">
                        <p className="text-xs font-bold text-slate-600 mb-1">Khám lâm sàng</p>
                        <p className="text-slate-900">{selectedRecord.clinicalNotes}</p>
                      </div>
                    )}
                    {selectedRecord.specialtyResults?.examFindings && (
                      <div className="p-3.5 rounded-xl border border-[#C7D6EA]">
                        <p className="text-xs font-bold text-slate-600 mb-1">Khám chuyên khoa</p>
                        <p className="text-slate-900">
                          {selectedRecord.specialtyResults.examFindings}
                        </p>
                      </div>
                    )}
                    {selectedRecord.treatmentPlan && (
                      <div className="p-3.5 rounded-xl border border-[#C7D6EA]">
                        <p className="text-xs font-bold text-slate-600 mb-1">Hướng điều trị & dặn dò</p>
                        <p className="text-slate-900">{selectedRecord.treatmentPlan}</p>
                      </div>
                    )}
                  </div>

                  {/* Lab Orders */}
                  {selectedRecord.specialtyResults?.labOrders &&
                    selectedRecord.specialtyResults.labOrders.length > 0 && (
                      <div>
                        <h3 className="text-sm font-bold text-slate-900 mb-2 flex items-center gap-1.5">
                          <FlaskConical className="h-4 w-4 text-[#1D5BB8]" />
                          Chỉ định & Kết quả Cận lâm sàng
                        </h3>
                        <Table
                          data={selectedRecord.specialtyResults.labOrders}
                          columns={[
                            {
                              key: 'name',
                              header: 'Xét nghiệm / Dịch vụ',
                              render: (row) => <span className="font-semibold">{row.testName}</span>,
                            },
                            {
                              key: 'result',
                              header: 'Kết quả',
                              render: (row) =>
                                row.result ? (
                                  <span className="font-bold text-[#1D5BB8]">
                                    {row.result} {row.unit || ''}
                                  </span>
                                ) : (
                                  <span className="text-slate-600">Đang chờ</span>
                                ),
                            },
                            {
                              key: 'range',
                              header: 'Trị số tham chiếu',
                              render: (row) => row.normalRange || '—',
                            },
                            {
                              key: 'status',
                              header: 'Trạng thái',
                              render: (row) => (
                                <Badge
                                  variant={row.status === 'COMPLETED' ? 'emerald' : 'amber'}
                                  size="sm"
                                >
                                  {row.status === 'COMPLETED' ? 'Đã có kết quả' : 'Đã chỉ định'}
                                </Badge>
                              ),
                            },
                          ]}
                        />
                      </div>
                    )}

                  {/* Attached Prescription */}
                  {selectedRecord.prescription && (
                    <div className="pt-2 border-t border-[#C7D6EA] space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                          <Pill className="h-4 w-4 text-[#1D5BB8]" />
                          Đơn thuốc kèm theo ({selectedRecord.prescription.prescriptionCode})
                        </h3>
                        <PrescriptionStatusBadge status={selectedRecord.prescription.status} />
                      </div>

                      {selectedRecord.prescription.allergyWarnings?.length > 0 && (
                        <Alert variant="warning" title="Lưu ý cảnh báo dị ứng đã kiểm tra">
                          {selectedRecord.prescription.allergyWarnings
                            .map((w) => w.message)
                            .join('; ')}
                        </Alert>
                      )}

                      <Table
                        data={selectedRecord.prescription.items}
                        columns={[
                          {
                            key: 'med',
                            header: 'Tên thuốc',
                            render: (row) => (
                              <div>
                                <p className="font-bold text-slate-900">{row.medicineName}</p>
                                {row.genericName && (
                                  <p className="text-[11px] text-slate-600">{row.genericName}</p>
                                )}
                              </div>
                            ),
                          },
                          {
                            key: 'qty',
                            header: 'SL',
                            render: (row) => (
                              <span className="font-semibold">
                                {row.quantity} {row.unit}
                              </span>
                            ),
                          },
                          {
                            key: 'dosage',
                            header: 'Cách dùng & Liều lượng',
                            render: (row) => (
                              <div className="text-xs">
                                <p className="font-semibold text-slate-900">{row.dosage}</p>
                                {(row.frequency || row.instructions) && (
                                  <p className="text-slate-600">
                                    {[row.frequency, row.instructions].filter(Boolean).join(' • ')}
                                  </p>
                                )}
                              </div>
                            ),
                          },
                          {
                            key: 'total',
                            header: 'Thành tiền',
                            render: (row) => (
                              <span className="font-semibold">
                                {formatCurrencyVND(row.lineTotal)}
                              </span>
                            ),
                          },
                        ]}
                      />

                      <div className="flex items-center justify-between text-sm pt-1">
                        <span className="text-slate-600">
                          Lời dặn: {selectedRecord.prescription.notes || 'Uống thuốc đúng giờ'}
                        </span>
                        <span className="font-extrabold text-[#1D5BB8]">
                          Tổng tiền thuốc:{' '}
                          {formatCurrencyVND(selectedRecord.prescription.totalAmount)}
                        </span>
                      </div>
                    </div>
                  )}
                </Card>
              )}
            </div>
          </div>
        )
      ) : prescriptions.length === 0 ? (
        <EmptyState
          icon={<Pill className="h-6 w-6" />}
          title="Chưa có đơn thuốc điện tử nào"
        />
      ) : (
        <div className="space-y-4">
          {prescriptions.map((rx) => (
            <Card key={rx.id} padding="md" className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="text-xs font-extrabold text-[#1D5BB8]">
                    {rx.prescriptionCode}
                  </span>
                  <h3 className="text-base font-bold text-slate-900">
                    {rx.diagnosis || 'Đơn thuốc điều trị'} — BS. {rx.doctorName}
                  </h3>
                  <p className="text-xs text-slate-600">Ngày kê: {formatDateVN(rx.createdAt)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <PrescriptionStatusBadge status={rx.status} />
                  <span className="text-sm font-extrabold text-slate-900">
                    {formatCurrencyVND(rx.totalAmount)}
                  </span>
                </div>
              </div>

              {rx.allergyWarnings?.length > 0 && (
                <div className="flex items-start gap-2 p-2.5 rounded-xl bg-amber-100/80 border border-amber-300 text-xs text-amber-900">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                  <span>{rx.allergyWarnings.map((w) => w.message).join('; ')}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {rx.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA] text-xs"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-slate-900">{item.medicineName}</span>
                      <span className="font-bold text-[#1D5BB8]">
                        {item.quantity} {item.unit}
                      </span>
                    </div>
                    <p className="text-slate-700 mt-1">
                      {item.dosage}
                      {item.instructions ? ` • ${item.instructions}` : ''}
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};
