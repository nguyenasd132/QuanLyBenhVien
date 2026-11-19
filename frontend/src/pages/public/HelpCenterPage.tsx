import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CalendarClock,
  ChevronDown,
  ChevronUp,
  Clock,
  CreditCard,
  HelpCircle,
  MapPin,
  PhoneCall,
  Send,
  ShieldAlert,
} from 'lucide-react';
import { Button, Card, Input, Textarea, useToast } from '@/components/ui';

const faqs = [
  {
    q: 'Đặt lịch khám theo Buổi Sáng / Buổi Chiều hoạt động như thế nào?',
    a: 'Thay vì khung giờ cố định 15 phút dễ trễ dây chuyền, An Tâm chia lịch khám theo 2 buổi: Buổi Sáng (07:30 - 11:30) và Buổi Chiều (13:30 - 17:00). Hệ thống cấp ngay Số thứ tự (STT) tuần tự cho từng bác sĩ trong buổi đó cùng giờ khám dự kiến.',
  },
  {
    q: 'Tôi có thể đặt lịch theo 3 cách nào?',
    a: 'Bạn có thể chọn 1 trong 3 luồng đặt lịch: (1) Theo chuyên khoa (ví dụ Nội tổng quát, Tim mạch...) rồi chọn ngày & bác sĩ; (2) Theo bác sĩ quen thuộc; hoặc (3) Theo ngày khám mong muốn trước rồi lọc chuyên khoa.',
  },
  {
    q: 'Nếu có người hủy lịch thì STT của tôi có bị nhảy số không?',
    a: 'Không. STT đã cấp luôn được giữ cố định để đảm bảo trật tự hàng chờ và giờ dự kiến của bạn không bị xáo trộn. Khi bạn tự đổi lịch sang buổi/ngày khác, hệ thống sẽ cấp một STT mới tại buổi mới.',
  },
  {
    q: 'Thanh toán QR chuyển khoản và tại quầy khác nhau thế nào?',
    a: 'Với hóa đơn Viện phí hoặc Đơn thuốc, bạn có thể chọn "Thanh toán QR" để xem thông tin chuyển khoản VietQR mô phỏng, hoặc chọn "Thanh toán tại quầy". Cả hai đều chuyển hóa đơn sang trạng thái Chờ điều dưỡng xác nhận để đảm bảo đối soát chính xác.',
  },
  {
    q: 'Tôi cần chuẩn bị gì khi đến bệnh viện?',
    a: 'Vui lòng mang theo CCCD/CMND, thẻ BHYT (nếu có) và mã lịch hẹn (ví dụ LH-...) đến quầy tiếp nhận trước giờ dự kiến khoảng 15 phút để điều dưỡng check-in và đo sinh hiệu.',
  },
];

export const HelpCenterView: React.FC = () => {
  const toast = useToast();
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');

  const handleSupportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    toast.success('Đã tiếp nhận yêu cầu hỗ trợ', 'Bộ phận CSKH An Tâm sẽ phản hồi qua điện thoại/email trong 15 phút.');
    setSubject('');
    setMessage('');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">Trung tâm Trợ giúp & Hướng dẫn</h1>
        <p className="text-sm text-slate-600 mt-1">
          Giải đáp quy trình khám bệnh, lấy số thứ tự STT, thanh toán viện phí và liên hệ khẩn cấp.
        </p>
      </div>

      {/* Hotline & Hospital Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card padding="md" className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-[#DCEAFB] text-[#15458E] border border-[#9EC0EC] flex items-center justify-center shrink-0">
            <PhoneCall className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase">Tổng đài đặt lịch & CSKH</p>
            <p className="text-lg font-extrabold text-[#1D5BB8] mt-0.5">1900 6868</p>
            <p className="text-xs text-slate-600 mt-0.5">Hỗ trợ 07:00 – 20:00 mỗi ngày</p>
          </div>
        </Card>

        <Card padding="md" className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-rose-100 text-rose-700 border border-rose-300 flex items-center justify-center shrink-0">
            <ShieldAlert className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase">Cấp cứu 24/7</p>
            <p className="text-lg font-extrabold text-rose-700 mt-0.5">(028) 3822 1115</p>
            <p className="text-xs text-slate-600 mt-0.5">Trực cấp cứu nội & ngoại viện 24/24</p>
          </div>
        </Card>

        <Card padding="md" className="flex items-start gap-3.5">
          <div className="h-11 w-11 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-300 flex items-center justify-center shrink-0">
            <MapPin className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-bold text-slate-600 uppercase">Địa chỉ Bệnh viện An Tâm</p>
            <p className="text-sm font-bold text-slate-900 mt-0.5">268 Lý Thường Kiệt, Q.10, TP.HCM</p>
            <p className="text-xs text-slate-600 mt-0.5">Giờ khám: Sáng 07:30-11:30 • Chiều 13:30-17:00</p>
          </div>
        </Card>
      </div>

      {/* Quick Process Steps */}
      <Card padding="md">
        <h2 className="text-base font-bold text-slate-900 mb-4 flex items-center gap-2">
          <Clock className="h-5 w-5 text-[#1D5BB8]" />
          Quy trình khám ngoại trú 4 bước tại An Tâm
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            {
              step: 'Bước 1',
              title: 'Đặt lịch & Nhận STT',
              desc: 'Chọn chuyên khoa / bác sĩ / ngày và Buổi Sáng hoặc Chiều để nhận STT.',
              icon: <CalendarClock className="h-5 w-5 text-[#1D5BB8]" />,
            },
            {
              step: 'Bước 2',
              title: 'Check-in & Đo sinh hiệu',
              desc: 'Quét mã lịch hẹn tại quầy Điều dưỡng, xác minh BHYT và đo huyết áp, nhiệt độ.',
              icon: <HelpCircle className="h-5 w-5 text-[#1D5BB8]" />,
            },
            {
              step: 'Bước 3',
              title: 'Bác sĩ khám & Kê đơn',
              desc: 'Theo dõi STT đang khám trực tiếp, nhận chẩn đoán và đơn thuốc điện tử.',
              icon: <PhoneCall className="h-5 w-5 text-[#1D5BB8]" />,
            },
            {
              step: 'Bước 4',
              title: 'Thanh toán & Nhận thuốc',
              desc: 'Chuyển khoản QR hoặc nộp tiền mặt tại quầy, điều dưỡng xác nhận và phát thuốc.',
              icon: <CreditCard className="h-5 w-5 text-[#1D5BB8]" />,
            },
          ].map((item) => (
            <div key={item.step} className="p-4 rounded-2xl bg-[#EDF3FB] border border-[#C7D6EA]">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-extrabold text-[#15458E] uppercase">{item.step}</span>
                {item.icon}
              </div>
              <p className="text-sm font-bold text-slate-900">{item.title}</p>
              <p className="text-xs text-slate-700 mt-1 leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* FAQ + Contact Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <Card padding="md" className="lg:col-span-7">
          <h2 className="text-base font-bold text-slate-900 mb-3">Câu hỏi thường gặp</h2>
          <div className="divide-y divide-[#C7D6EA]">
            {faqs.map((faq, idx) => {
              const isOpen = openIndex === idx;
              return (
                <div key={faq.q} className="py-3">
                  <button
                    type="button"
                    onClick={() => setOpenIndex(isOpen ? null : idx)}
                    className="w-full flex items-center justify-between gap-3 text-left"
                  >
                    <span className="text-sm font-bold text-slate-900">{faq.q}</span>
                    {isOpen ? (
                      <ChevronUp className="h-4 w-4 text-[#1D5BB8] shrink-0" />
                    ) : (
                      <ChevronDown className="h-4 w-4 text-slate-600 shrink-0" />
                    )}
                  </button>
                  {isOpen && (
                    <p className="text-xs sm:text-sm text-slate-700 mt-2 leading-relaxed">
                      {faq.a}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </Card>

        <Card padding="md" className="lg:col-span-5">
          <h2 className="text-base font-bold text-slate-900 mb-1">Gửi yêu cầu hỗ trợ</h2>
          <p className="text-xs text-slate-600 mb-4">
            Cần hỗ trợ đổi lịch khẩn hoặc tra cứu BHYT? Nhắn cho điều phối viên An Tâm.
          </p>
          <form onSubmit={handleSupportSubmit} className="space-y-3.5">
            <Input
              label="Chủ đề cần hỗ trợ"
              placeholder="Ví dụ: Cần hỗ trợ thanh toán đơn thuốc..."
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
            />
            <Textarea
              label="Nội dung chi tiết"
              placeholder="Nhập mã lịch hẹn hoặc câu hỏi của bạn..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
            <div className="flex items-center justify-between gap-2 pt-1">
              <Link to="/doctors" className="text-xs font-semibold text-[#1D5BB8] hover:underline">
                Xem danh sách bác sĩ →
              </Link>
              <Button type="submit" size="sm" leftIcon={<Send className="h-3.5 w-3.5" />}>
                Gửi yêu cầu
              </Button>
            </div>
          </form>
        </Card>
      </div>
    </div>
  );
};
