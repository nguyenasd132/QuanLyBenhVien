import React, { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  Banknote,
  CheckCircle2,
  CreditCard,
  PackageCheck,
  Pill,
  Printer,
  QrCode,
  RefreshCw,
  Search,
  XCircle,
} from 'lucide-react';
import { nurseApi } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVN } from '@/lib/format';
import type { InvoiceDto, PaymentMethod, PrescriptionDto, PrescriptionStatus } from '@/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  InvoiceStatusBadge,
  Modal,
  PrescriptionStatusBadge,
  Spinner,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui';

export const NurseCashierPage: React.FC = () => {
  const toast = useToast();

  const [mainTab, setMainTab] = useState<'PAYMENTS' | 'DISPENSING'>('PAYMENTS');

  // Payments state
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState<string>('PENDING');
  const [paymentSearch, setPaymentSearch] = useState<string>('');
  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [loadingPayments, setLoadingPayments] = useState<boolean>(true);

  // Confirm Payment Modal
  const [confirmTarget, setConfirmTarget] = useState<InvoiceDto | null>(null);
  const [confirmMethod, setConfirmMethod] = useState<PaymentMethod>('COUNTER_CASH');
  const [confirmNotes, setConfirmNotes] = useState<string>('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject Payment Modal
  const [rejectTarget, setRejectTarget] = useState<InvoiceDto | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('Chưa nhận được giao dịch chuyển khoản');

  // Dispensing state
  const [rxFilter, setRxFilter] = useState<'ALL' | PrescriptionStatus>('PAID');
  const [rxSearch, setRxSearch] = useState<string>('');
  const [prescriptions, setPrescriptions] = useState<PrescriptionDto[]>([]);
  const [loadingRx, setLoadingRx] = useState<boolean>(true);

  const loadPayments = useCallback(async () => {
    setLoadingPayments(true);
    try {
      const data = await nurseApi.getPayments({
        status: invoiceStatusFilter === 'ALL' ? undefined : invoiceStatusFilter,
        search: paymentSearch.trim() || undefined,
      });
      setInvoices(data);
    } catch (err) {
      toast.error(
        'Không thể tải danh sách hóa đơn',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoadingPayments(false);
    }
  }, [invoiceStatusFilter, paymentSearch, toast]);

  const loadPrescriptions = useCallback(async () => {
    setLoadingRx(true);
    try {
      const data = await nurseApi.getPrescriptions({
        status: rxFilter === 'ALL' ? undefined : rxFilter,
        search: rxSearch.trim() || undefined,
      });
      setPrescriptions(data);
    } catch (err) {
      toast.error(
        'Không thể tải danh sách đơn thuốc',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoadingRx(false);
    }
  }, [rxFilter, rxSearch, toast]);

  useEffect(() => {
    if (mainTab === 'PAYMENTS') void loadPayments();
    else void loadPrescriptions();
  }, [mainTab, loadPayments, loadPrescriptions]);

  const openConfirmModal = (inv: InvoiceDto) => {
    const latestPending = inv.payments?.find((p) => p.status === 'PENDING');
    setConfirmTarget(inv);
    setConfirmMethod(latestPending?.method || 'COUNTER_CASH');
    setConfirmNotes('');
  };

  const handleConfirmPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmTarget) return;
    setProcessingId(confirmTarget.id);
    try {
      await nurseApi.confirmPayment(confirmTarget.id, {
        method: confirmMethod,
        notes: confirmNotes.trim() || undefined,
      });
      toast.success(
        `Đã xác nhận thanh toán ${confirmTarget.invoiceCode}`,
        `Số tiền ${formatCurrencyVND(confirmTarget.totalAmount)} đã ghi nhận thành công.`
      );
      setConfirmTarget(null);
      await loadPayments();
    } catch (err) {
      toast.error(
        'Xác nhận thanh toán thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectTarget) return;
    setProcessingId(rejectTarget.id);
    try {
      await nurseApi.rejectPayment(rejectTarget.id, {
        reason: rejectReason.trim() || undefined,
      });
      toast.info(`Đã từ chối giao dịch chờ xác nhận của ${rejectTarget.invoiceCode}`);
      setRejectTarget(null);
      await loadPayments();
    } catch (err) {
      toast.error(
        'Từ chối thanh toán thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setProcessingId(null);
    }
  };

  const handleDispense = async (rx: PrescriptionDto) => {
    setProcessingId(rx.id);
    try {
      await nurseApi.dispensePrescription(rx.id);
      toast.success(
        `Đã cấp phát đơn thuốc ${rx.prescriptionCode}`,
        `Đã trừ tồn kho và cập nhật trạng thái cho ${rx.patientName}.`
      );
      await loadPrescriptions();
    } catch (err) {
      toast.error(
        'Cấp phát thuốc thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra trạng thái thanh toán / tồn kho'
      );
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Thu ngân Viện phí & Cấp phát Thuốc
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Xác nhận thanh toán Tiền mặt / Chuyển khoản QR nguyên tử và cấp phát đơn thuốc đã thanh
            toán.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          leftIcon={<RefreshCw className="h-4 w-4" />}
          onClick={() => (mainTab === 'PAYMENTS' ? void loadPayments() : void loadPrescriptions())}
        >
          Làm mới
        </Button>
      </div>

      <Tabs
        variant="underline"
        activeId={mainTab}
        onChange={(id) => setMainTab(id as 'PAYMENTS' | 'DISPENSING')}
        items={[
          {
            id: 'PAYMENTS',
            label: 'Thu ngân & Xác nhận Thanh toán',
            icon: <Banknote className="h-4 w-4" />,
          },
          {
            id: 'DISPENSING',
            label: 'Cấp phát Thuốc (Quầy dược)',
            icon: <Pill className="h-4 w-4" />,
          },
        ]}
      />

      {mainTab === 'PAYMENTS' ? (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <Tabs
              activeId={invoiceStatusFilter}
              onChange={setInvoiceStatusFilter}
              items={[
                { id: 'PENDING', label: 'Cần thu / Chờ xác nhận' },
                { id: 'PENDING_VERIFICATION', label: 'Chờ xác nhận QR' },
                { id: 'UNPAID', label: 'Chưa thanh toán' },
                { id: 'PAID', label: 'Đã thanh toán' },
                { id: 'ALL', label: 'Tất cả' },
              ]}
            />
            <div className="w-full lg:w-72">
              <Input
                placeholder="Tìm mã hóa đơn, tên BN..."
                value={paymentSearch}
                onChange={(e) => setPaymentSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {loadingPayments ? (
            <Spinner label="Đang tải danh sách hóa đơn..." />
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<Banknote className="h-6 w-6" />}
              title="Không có hóa đơn cần xử lý"
              description="Tất cả hóa đơn trong bộ lọc này đã được xử lý."
            />
          ) : (
            <div className="space-y-3">
              {invoices.map((inv) => {
                const pendingPayment = inv.payments?.find((p) => p.status === 'PENDING');
                const canConfirm =
                  inv.status === 'UNPAID' || inv.status === 'PENDING_VERIFICATION';
                return (
                  <Card key={inv.id} className="overflow-hidden">
                    <CardHeader className="py-3.5 bg-[#EDF3FB]">
                      <div className="flex flex-wrap items-center gap-2">
                        <CardTitle className="text-sm font-mono">{inv.invoiceCode}</CardTitle>
                        <Badge
                          variant={inv.invoiceType === 'HOSPITAL_FEE' ? 'blue' : 'violet'}
                          size="sm"
                        >
                          {inv.invoiceType === 'HOSPITAL_FEE' ? 'Viện phí & CLS' : 'Đơn thuốc'}
                        </Badge>
                        <InvoiceStatusBadge status={inv.status} />
                      </div>
                      <span className="text-base font-extrabold text-[#1D5BB8]">
                        {formatCurrencyVND(inv.totalAmount)}
                      </span>
                    </CardHeader>

                    <CardContent className="p-4 space-y-3">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 text-xs sm:text-sm">
                        <div>
                          <span className="font-bold text-slate-900">{inv.patientName}</span>{' '}
                          <span className="text-slate-600">({inv.patientCode})</span>
                          {inv.appointmentCode && (
                            <span className="ml-2 text-slate-600">
                              • Mã hẹn: {inv.appointmentCode}
                            </span>
                          )}
                          {inv.prescriptionCode && (
                            <span className="ml-2 text-slate-600">
                              • Đơn thuốc: {inv.prescriptionCode}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-600">
                          Tạo lúc: {formatDateTimeVN(inv.createdAt)}
                        </span>
                      </div>

                      {inv.items && inv.items.length > 0 && (
                        <div className="rounded-xl border border-[#C7D6EA] bg-[#EDF3FB] p-3 space-y-1.5 text-xs">
                          {inv.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-2 text-slate-700"
                            >
                              <span>
                                {item.description} × {item.quantity}
                              </span>
                              <span className="font-semibold">
                                {formatCurrencyVND(item.lineTotal)}
                              </span>
                            </div>
                          ))}
                          {inv.insuranceDiscount > 0 && (
                            <div className="flex items-center justify-between text-emerald-800 pt-1 border-t border-[#C7D6EA]">
                              <span>BHYT chi trả / Giảm trừ</span>
                              <span>-{formatCurrencyVND(inv.insuranceDiscount)}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {pendingPayment && (
                        <div className="p-3 rounded-xl bg-amber-50 border border-amber-300 flex flex-wrap items-center justify-between gap-2 text-xs text-amber-900">
                          <div className="flex items-center gap-2">
                            {pendingPayment.method === 'QR_TRANSFER' ? (
                              <QrCode className="h-4 w-4 text-amber-800" />
                            ) : (
                              <Banknote className="h-4 w-4 text-amber-800" />
                            )}
                            <span>
                              Bệnh nhân đã gửi yêu cầu thanh toán{' '}
                              <strong>
                                {pendingPayment.method === 'QR_TRANSFER'
                                  ? 'Chuyển khoản QR'
                                  : 'Tiền mặt tại quầy'}
                              </strong>
                              {pendingPayment.qrReference &&
                                ` • Mã CK: ${pendingPayment.qrReference}`}
                            </span>
                          </div>
                          <span>{formatDateTimeVN(pendingPayment.createdAt)}</span>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                        {inv.status === 'PAID' && (
                          <Button
                            variant="outline"
                            size="xs"
                            leftIcon={<Printer className="h-3.5 w-3.5" />}
                            onClick={() => window.print()}
                          >
                            In biên lai
                          </Button>
                        )}
                        {inv.status === 'PENDING_VERIFICATION' && (
                          <Button
                            variant="outline"
                            size="sm"
                            leftIcon={<XCircle className="h-4 w-4 text-rose-500" />}
                            onClick={() => setRejectTarget(inv)}
                          >
                            Từ chối
                          </Button>
                        )}
                        {canConfirm && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<CheckCircle2 className="h-4 w-4" />}
                            onClick={() => openConfirmModal(inv)}
                          >
                            Xác nhận Thanh toán
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
            <Tabs
              activeId={rxFilter}
              onChange={(id) => setRxFilter(id as 'ALL' | PrescriptionStatus)}
              items={[
                { id: 'PAID', label: 'Chờ cấp phát (Đã thanh toán)' },
                { id: 'PENDING_PAYMENT', label: 'Chưa thanh toán' },
                { id: 'DISPENSED', label: 'Đã cấp thuốc' },
                { id: 'ALL', label: 'Tất cả' },
              ]}
            />
            <div className="w-full lg:w-72">
              <Input
                placeholder="Tìm mã đơn thuốc, bệnh nhân..."
                value={rxSearch}
                onChange={(e) => setRxSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>

          {loadingRx ? (
            <Spinner label="Đang tải danh sách đơn thuốc..." />
          ) : prescriptions.length === 0 ? (
            <EmptyState
              icon={<Pill className="h-6 w-6" />}
              title="Không có đơn thuốc nào"
              description="Các đơn thuốc sau khi bác sĩ kê và bệnh nhân thanh toán sẽ hiển thị tại đây."
            />
          ) : (
            <div className="space-y-3">
              {prescriptions.map((rx) => (
                <Card key={rx.id} className="overflow-hidden">
                  <CardHeader className="py-3.5 bg-[#EDF3FB]">
                    <div className="flex flex-wrap items-center gap-2">
                      <CardTitle className="text-sm font-mono">{rx.prescriptionCode}</CardTitle>
                      <PrescriptionStatusBadge status={rx.status} />
                      {rx.allergyWarnings && rx.allergyWarnings.length > 0 && (
                        <Badge variant="rose" size="sm">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Có lưu ý dị ứng ({rx.allergyWarnings.length})
                        </Badge>
                      )}
                    </div>
                    <span className="text-base font-extrabold text-[#1D5BB8]">
                      {formatCurrencyVND(rx.totalAmount)}
                    </span>
                  </CardHeader>

                  <CardContent className="p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm">
                      <div>
                        <strong className="text-slate-900">{rx.patientName}</strong>{' '}
                        <span className="text-slate-600">({rx.patientCode})</span>
                        <span className="mx-2 text-slate-300">|</span>
                        <span className="text-slate-600">
                          Kê bởi: {rx.doctorName}
                          {rx.departmentName ? ` (${rx.departmentName})` : ''}
                        </span>
                      </div>
                      {rx.diagnosis && (
                        <span className="text-xs font-semibold text-slate-700">
                          Chẩn đoán: {rx.diagnosis}
                        </span>
                      )}
                    </div>

                    <div className="rounded-xl border border-[#C7D6EA] divide-y divide-[#C7D6EA] bg-white">
                      {rx.items.map((item) => (
                        <div
                          key={item.id}
                          className="px-3.5 py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900">{item.medicineName}</span>{' '}
                            <span className="text-slate-600">({item.medicineCode})</span>
                            <p className="text-slate-600">
                              Liều dùng: {item.dosage}
                              {item.instructions ? ` • ${item.instructions}` : ''}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="font-bold text-slate-900">
                              {item.quantity} {item.unit}
                            </span>
                            <span className="text-slate-600 ml-2">
                              ({formatCurrencyVND(item.lineTotal)})
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <span className="text-xs text-slate-600">
                        {rx.dispensedAt
                          ? `Đã cấp phát lúc ${formatDateTimeVN(rx.dispensedAt)} bởi ${rx.dispensedByNurseName || 'Điều dưỡng'}`
                          : `Ngày kê: ${formatDateTimeVN(rx.createdAt)}`}
                      </span>

                      {rx.status === 'PAID' && (
                        <Button
                          variant="success"
                          size="sm"
                          loading={processingId === rx.id}
                          leftIcon={<PackageCheck className="h-4 w-4" />}
                          onClick={() => void handleDispense(rx)}
                        >
                          Xác nhận Phát thuốc
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Atomic Payment Confirmation Modal */}
      <Modal
        open={Boolean(confirmTarget)}
        onClose={() => setConfirmTarget(null)}
        title="Xác nhận Thanh toán Hóa đơn"
        description={
          confirmTarget
            ? `${confirmTarget.invoiceCode} • ${confirmTarget.patientName} • ${formatCurrencyVND(confirmTarget.totalAmount)}`
            : undefined
        }
      >
        <form onSubmit={handleConfirmPayment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            {[
              {
                value: 'COUNTER_CASH' as PaymentMethod,
                label: 'Tiền mặt tại quầy',
                icon: <Banknote className="h-4 w-4" />,
              },
              {
                value: 'QR_TRANSFER' as PaymentMethod,
                label: 'Chuyển khoản QR',
                icon: <QrCode className="h-4 w-4" />,
              },
              {
                value: 'CARD' as PaymentMethod,
                label: 'Thẻ POS',
                icon: <CreditCard className="h-4 w-4" />,
              },
            ].map((m) => (
              <button
                key={m.value}
                type="button"
                onClick={() => setConfirmMethod(m.value)}
                className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                  confirmMethod === m.value
                    ? 'bg-[#DCEAFB] border-[#1D5BB8] text-[#1D5BB8]'
                    : 'bg-white border-[#C7D6EA] text-slate-600 hover:bg-[#EDF3FB]'
                }`}
              >
                {m.icon}
                {m.label}
              </button>
            ))}
          </div>

          <Textarea
            label="Ghi chú thu ngân"
            placeholder="Ví dụ: Đã đối chiếu biên lai chuyển khoản / thu đủ tiền mặt..."
            value={confirmNotes}
            onChange={(e) => setConfirmNotes(e.target.value)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setConfirmTarget(null)}>
              Hủy
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={Boolean(confirmTarget && processingId === confirmTarget.id)}
              leftIcon={<CheckCircle2 className="h-4 w-4" />}
            >
              Xác nhận đã thu {confirmTarget ? formatCurrencyVND(confirmTarget.totalAmount) : ''}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reject QR Modal */}
      <Modal
        open={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        title="Từ chối Yêu cầu Thanh toán QR"
        description={rejectTarget ? `${rejectTarget.invoiceCode} • ${rejectTarget.patientName}` : undefined}
      >
        <form onSubmit={handleRejectPayment} className="space-y-4">
          <Textarea
            label="Lý do từ chối"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            required
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Đóng
            </Button>
            <Button
              type="submit"
              variant="danger"
              loading={Boolean(rejectTarget && processingId === rejectTarget.id)}
            >
              Xác nhận từ chối
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
