import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Building,
  CheckCircle2,
  Copy,
  CreditCard,
  Pill,
  QrCode,
  Receipt,
  Wallet,
} from 'lucide-react';
import { ApiError, patientApi } from '@/lib/api';
import { formatCurrencyVND, formatDateTimeVN } from '@/lib/format';
import type { InvoiceDto, PaymentDto, QrInfoDto } from '@/types';
import {
  Alert,
  Badge,
  Button,
  Card,
  EmptyState,
  InvoiceStatusBadge,
  Modal,
  QrCodeBox,
  Spinner,
  Table,
  Tabs,
  useToast,
} from '@/components/ui';

type BillingTab = 'ALL' | 'HOSPITAL_FEE' | 'PRESCRIPTION' | 'RECEIPTS';

export const BillingPage: React.FC = () => {
  const toast = useToast();

  const [invoices, setInvoices] = useState<InvoiceDto[]>([]);
  const [payments, setPayments] = useState<PaymentDto[]>([]);
  const [tab, setTab] = useState<BillingTab>('ALL');
  const [loading, setLoading] = useState(true);
  const [submittingId, setSubmittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [qrModal, setQrModal] = useState<{
    invoice: InvoiceDto;
    qrInfo: QrInfoDto;
  } | null>(null);

  const loadBilling = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [invs, pays] = await Promise.all([
        patientApi.getInvoices(),
        patientApi.getPayments(),
      ]);
      setInvoices(invs);
      setPayments(pays);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Không thể tải thông tin thanh toán.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBilling();
  }, [loadBilling]);

  const summary = useMemo(() => {
    const unpaid = invoices
      .filter((i) => i.status === 'UNPAID')
      .reduce((s, i) => s + i.totalAmount, 0);
    const pending = invoices
      .filter((i) => i.status === 'PENDING_VERIFICATION')
      .reduce((s, i) => s + i.totalAmount, 0);
    const paid = invoices
      .filter((i) => i.status === 'PAID')
      .reduce((s, i) => s + i.totalAmount, 0);
    return { unpaid, pending, paid };
  }, [invoices]);

  const filteredInvoices = useMemo(() => {
    if (tab === 'HOSPITAL_FEE') return invoices.filter((i) => i.invoiceType === 'HOSPITAL_FEE');
    if (tab === 'PRESCRIPTION') return invoices.filter((i) => i.invoiceType === 'PRESCRIPTION');
    return invoices;
  }, [invoices, tab]);

  const handlePayQr = async (invoice: InvoiceDto) => {
    setSubmittingId(invoice.id);
    try {
      const res = await patientApi.createPayment({
        invoiceId: invoice.id,
        method: 'QR_TRANSFER',
        notes: `Chuyển khoản QR cho hóa đơn ${invoice.invoiceCode}`,
      });
      const qrInfo: QrInfoDto = res.qrInfo || {
        bankName: 'Vietcombank - CN TP.HCM',
        accountNumber: '1029384756',
        accountName: 'BENH VIEN DA KHOA AN TAM',
        amount: invoice.totalAmount,
        transferContent: `ANTAM ${invoice.invoiceCode}`,
        qrDataString: `ANTAM|VCB|1029384756|${invoice.totalAmount}|${invoice.invoiceCode}`,
      };
      setQrModal({ invoice: res.invoice, qrInfo });
      toast.info(
        'Đã tạo mã QR chuyển khoản',
        'Hóa đơn đã chuyển sang trạng thái Chờ điều dưỡng xác nhận.'
      );
      await loadBilling();
    } catch (err) {
      toast.error(
        'Không thể tạo thanh toán QR',
        err instanceof ApiError ? err.message : 'Vui lòng thử lại.'
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const handlePayCounter = async (invoice: InvoiceDto) => {
    setSubmittingId(invoice.id);
    try {
      await patientApi.createPayment({
        invoiceId: invoice.id,
        method: 'COUNTER_CASH',
        notes: 'Đăng ký thanh toán tiền mặt tại quầy thu ngân',
      });
      toast.success(
        'Đã gửi yêu cầu thanh toán tại quầy',
        `Vui lòng đọc mã ${invoice.invoiceCode} tại quầy Điều dưỡng để xác nhận.`
      );
      await loadBilling();
    } catch (err) {
      toast.error(
        'Không thể gửi yêu cầu',
        err instanceof ApiError ? err.message : 'Vui lòng thử lại.'
      );
    } finally {
      setSubmittingId(null);
    }
  };

  const openExistingQr = (invoice: InvoiceDto) => {
    const qrPayment = invoice.payments?.find((p) => p.method === 'QR_TRANSFER');
    setQrModal({
      invoice,
      qrInfo: {
        bankName: 'Vietcombank - CN TP.HCM',
        accountNumber: '1029384756',
        accountName: 'BENH VIEN DA KHOA AN TAM',
        amount: invoice.totalAmount,
        transferContent: `ANTAM ${invoice.invoiceCode}`,
        qrDataString:
          qrPayment?.qrReference ||
          `ANTAM|VCB|1029384756|${invoice.totalAmount}|${invoice.invoiceCode}`,
      },
    });
  };

  const copyText = (text: string) => {
    navigator.clipboard?.writeText(text);
    toast.success('Đã sao chép', text);
  };

  if (loading) {
    return <Spinner label="Đang tải hóa đơn và thanh toán..." />;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Thanh toán Viện phí & Đơn thuốc</h1>
        <p className="text-sm text-slate-600 mt-0.5">
          Tách biệt hóa đơn Viện phí và Đơn thuốc. Hỗ trợ chuyển khoản QR hoặc thanh toán tại quầy.
        </p>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card padding="md">
          <p className="text-xs font-bold text-slate-600 uppercase">Chưa thanh toán</p>
          <p className="text-2xl font-extrabold text-amber-700 mt-1">
            {formatCurrencyVND(summary.unpaid)}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs font-bold text-slate-600 uppercase">Chờ điều dưỡng xác nhận</p>
          <p className="text-2xl font-extrabold text-[#1D5BB8] mt-1">
            {formatCurrencyVND(summary.pending)}
          </p>
        </Card>
        <Card padding="md">
          <p className="text-xs font-bold text-slate-600 uppercase">Đã thanh toán</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatCurrencyVND(summary.paid)}
          </p>
        </Card>
      </div>

      <Tabs
        activeId={tab}
        onChange={(id) => setTab(id as BillingTab)}
        items={[
          { id: 'ALL', label: 'Tất cả hóa đơn', count: invoices.length },
          {
            id: 'HOSPITAL_FEE',
            label: 'Viện phí',
            icon: <Building className="h-4 w-4" />,
            count: invoices.filter((i) => i.invoiceType === 'HOSPITAL_FEE').length,
          },
          {
            id: 'PRESCRIPTION',
            label: 'Đơn thuốc',
            icon: <Pill className="h-4 w-4" />,
            count: invoices.filter((i) => i.invoiceType === 'PRESCRIPTION').length,
          },
          {
            id: 'RECEIPTS',
            label: 'Biên lai',
            icon: <Receipt className="h-4 w-4" />,
            count: payments.length,
          },
        ]}
      />

      {error && <Alert variant="error">{error}</Alert>}

      {tab === 'RECEIPTS' ? (
        payments.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-6 w-6" />}
            title="Chưa có giao dịch thanh toán nào"
          />
        ) : (
          <Table
            data={payments}
            columns={[
              {
                key: 'code',
                header: 'Mã giao dịch',
                render: (row) => <span className="font-bold text-slate-900">{row.paymentCode}</span>,
              },
              {
                key: 'inv',
                header: 'Hóa đơn',
                render: (row) => row.invoiceCode || row.invoiceId,
              },
              {
                key: 'method',
                header: 'Phương thức',
                render: (row) =>
                  row.method === 'QR_TRANSFER' ? 'Chuyển khoản QR' : 'Tiền mặt tại quầy',
              },
              {
                key: 'amount',
                header: 'Số tiền',
                render: (row) => (
                  <span className="font-bold text-[#1D5BB8]">{formatCurrencyVND(row.amount)}</span>
                ),
              },
              {
                key: 'status',
                header: 'Trạng thái',
                render: (row) => (
                  <Badge
                    variant={
                      row.status === 'CONFIRMED'
                        ? 'emerald'
                        : row.status === 'REJECTED'
                        ? 'rose'
                        : 'blue'
                    }
                  >
                    {row.status === 'CONFIRMED'
                      ? 'Đã xác nhận'
                      : row.status === 'REJECTED'
                      ? 'Từ chối'
                      : 'Chờ xác nhận'}
                  </Badge>
                ),
              },
              {
                key: 'time',
                header: 'Thời gian',
                render: (row) => formatDateTimeVN(row.confirmedAt || row.createdAt),
              },
            ]}
          />
        )
      ) : filteredInvoices.length === 0 ? (
        <EmptyState
          icon={<CreditCard className="h-6 w-6" />}
          title="Không có hóa đơn nào trong mục này"
        />
      ) : (
        <div className="space-y-4">
          {filteredInvoices.map((inv) => (
            <Card key={inv.id} padding="md" className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-sm font-extrabold text-slate-900">{inv.invoiceCode}</span>
                    <Badge variant={inv.invoiceType === 'HOSPITAL_FEE' ? 'blue' : 'violet'}>
                      {inv.invoiceType === 'HOSPITAL_FEE' ? 'Viện phí khám' : 'Đơn thuốc'}
                    </Badge>
                    <InvoiceStatusBadge status={inv.status} />
                  </div>
                  <p className="text-xs text-slate-600">
                    Ngày tạo: {formatDateTimeVN(inv.createdAt)}
                    {inv.appointmentCode ? ` • Lịch hẹn ${inv.appointmentCode}` : ''}
                    {inv.prescriptionCode ? ` • Đơn thuốc ${inv.prescriptionCode}` : ''}
                  </p>
                </div>

                <div className="text-left sm:text-right">
                  <p className="text-xs text-slate-600">Tổng thanh toán</p>
                  <p className="text-xl font-extrabold text-[#1D5BB8]">
                    {formatCurrencyVND(inv.totalAmount)}
                  </p>
                </div>
              </div>

              {/* Items breakdown */}
              <div className="rounded-xl bg-[#EDF3FB] border border-[#C7D6EA] divide-y divide-[#C7D6EA]">
                {inv.items.map((item) => (
                  <div
                    key={item.id}
                    className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs sm:text-sm"
                  >
                    <div>
                      <span className="font-semibold text-slate-900">{item.description}</span>
                      <span className="text-slate-600 ml-2">
                        (x{item.quantity} • {formatCurrencyVND(item.unitPrice)})
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">
                      {formatCurrencyVND(item.lineTotal)}
                    </span>
                  </div>
                ))}
                {inv.insuranceDiscount > 0 && (
                  <div className="px-3.5 py-2 flex items-center justify-between text-xs text-emerald-800 font-semibold bg-emerald-100/70">
                    <span>Khấu trừ BHYT</span>
                    <span>-{formatCurrencyVND(inv.insuranceDiscount)}</span>
                  </div>
                )}
              </div>

              {/* Payment actions */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                <span className="text-xs text-slate-600">
                  {inv.paidAt
                    ? `Đã thanh toán lúc ${formatDateTimeVN(inv.paidAt)}`
                    : inv.status === 'PENDING_VERIFICATION'
                    ? 'Đang chờ Điều dưỡng quầy thu ngân xác nhận giao dịch'
                    : 'Chọn phương thức thanh toán bên phải'}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                  {inv.status === 'UNPAID' && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        loading={submittingId === inv.id}
                        leftIcon={<Wallet className="h-4 w-4" />}
                        onClick={() => void handlePayCounter(inv)}
                      >
                        Thanh toán tại quầy
                      </Button>
                      <Button
                        size="sm"
                        loading={submittingId === inv.id}
                        leftIcon={<QrCode className="h-4 w-4" />}
                        onClick={() => void handlePayQr(inv)}
                      >
                        Thanh toán QR
                      </Button>
                    </>
                  )}
                  {inv.status === 'PENDING_VERIFICATION' && (
                    <Button
                      variant="secondary"
                      size="sm"
                      leftIcon={<QrCode className="h-4 w-4" />}
                      onClick={() => openExistingQr(inv)}
                    >
                      Xem thông tin QR
                    </Button>
                  )}
                  {inv.status === 'PAID' && (
                    <Badge variant="emerald" size="md">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Đã hoàn tất
                    </Badge>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Simulated QR Transfer Modal */}
      <Modal
        open={Boolean(qrModal)}
        onClose={() => setQrModal(null)}
        title="Chuyển khoản VietQR An Tâm (Mô phỏng)"
        description="Quét mã QR hoặc chuyển khoản đúng nội dung bên dưới. Điều dưỡng sẽ xác nhận trong giây lát."
        footer={
          <Button onClick={() => setQrModal(null)}>Đã hiểu, chờ điều dưỡng xác nhận</Button>
        }
      >
        {qrModal && (
          <div className="space-y-4">
            <div className="flex flex-col items-center p-4 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <QrCodeBox value={qrModal.qrInfo.qrDataString} size={172} />
              <p className="text-xs text-slate-600 mt-3">Số tiền cần thanh toán</p>
              <p className="text-2xl font-extrabold text-[#1D5BB8]">
                {formatCurrencyVND(qrModal.qrInfo.amount)}
              </p>
            </div>

            <div className="space-y-2.5 text-xs sm:text-sm">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                <span className="text-slate-600">Ngân hàng</span>
                <span className="font-bold text-slate-900">{qrModal.qrInfo.bankName}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                <span className="text-slate-600">Số tài khoản</span>
                <button
                  type="button"
                  onClick={() => copyText(qrModal.qrInfo.accountNumber)}
                  className="inline-flex items-center gap-1.5 font-bold text-[#1D5BB8] hover:underline"
                >
                  {qrModal.qrInfo.accountNumber}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#EDF3FB] border border-[#C7D6EA]">
                <span className="text-slate-600">Chủ tài khoản</span>
                <span className="font-bold text-slate-900">{qrModal.qrInfo.accountName}</span>
              </div>
              <div className="flex items-center justify-between p-3 rounded-xl bg-[#DCEAFB] border border-[#9EC0EC]">
                <span className="text-slate-700 font-semibold">Nội dung CK</span>
                <button
                  type="button"
                  onClick={() => copyText(qrModal.qrInfo.transferContent)}
                  className="inline-flex items-center gap-1.5 font-extrabold text-[#15458E] hover:underline"
                >
                  {qrModal.qrInfo.transferContent}
                  <Copy className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
