import React, { useCallback, useEffect, useState } from 'react';
import { Edit3, FlaskConical, Pill, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { adminApi } from '@/lib/api';
import { formatCurrencyVND } from '@/lib/format';
import type { DepartmentDto, MedicineDto, ServiceCategory, ServiceDto } from '@/types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Input,
  Modal,
  Select,
  Spinner,
  Table,
  Tabs,
  Textarea,
  useToast,
} from '@/components/ui';

const CATEGORY_LABELS: Record<ServiceCategory, string> = {
  CONSULTATION: 'Khám bệnh',
  LAB_TEST: 'Xét nghiệm',
  IMAGING: 'Chẩn đoán hình ảnh',
  PROCEDURE: 'Thủ thuật',
};

export const AdminCatalogPage: React.FC = () => {
  const toast = useToast();

  const [tab, setTab] = useState<'MEDICINES' | 'SERVICES'>('MEDICINES');
  const [loading, setLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [catFilter, setCatFilter] = useState<string>('');

  const [medicines, setMedicines] = useState<MedicineDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [departments, setDepartments] = useState<DepartmentDto[]>([]);

  // Medicine modal
  const [medModalOpen, setMedModalOpen] = useState<boolean>(false);
  const [editingMed, setEditingMed] = useState<MedicineDto | null>(null);
  const [medForm, setMedForm] = useState({
    code: '',
    name: '',
    genericName: '',
    unit: 'Viên',
    unitPrice: 5000,
    stockQuantity: 100,
    dosageForm: 'Viên nén',
    manufacturer: '',
    allergensText: '',
    conditionsText: '',
    warningText: '',
    isActive: true,
  });

  // Service modal
  const [svcModalOpen, setSvcModalOpen] = useState<boolean>(false);
  const [editingSvc, setEditingSvc] = useState<ServiceDto | null>(null);
  const [svcForm, setSvcForm] = useState({
    code: '',
    name: '',
    category: 'LAB_TEST' as ServiceCategory,
    departmentId: '',
    unitPrice: 120000,
    description: '',
    isActive: true,
  });

  const [saving, setSaving] = useState<boolean>(false);

  const loadCatalog = useCallback(async () => {
    setLoading(true);
    try {
      const [medsRes, svcsRes, deptsRes] = await Promise.all([
        adminApi.getMedicines({
          search: search.trim() || undefined,
          includeInactive: true,
        }),
        adminApi.getServices({
          category: (catFilter as ServiceCategory) || undefined,
          search: search.trim() || undefined,
          includeInactive: true,
        }),
        adminApi.getDepartments(),
      ]);
      setMedicines(medsRes);
      setServices(svcsRes);
      setDepartments(deptsRes);
    } catch (err) {
      toast.error(
        'Không thể tải danh mục thuốc & dịch vụ',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    } finally {
      setLoading(false);
    }
  }, [search, catFilter, toast]);

  useEffect(() => {
    void loadCatalog();
  }, [loadCatalog]);

  const openCreateMed = () => {
    setEditingMed(null);
    setMedForm({
      code: '',
      name: '',
      genericName: '',
      unit: 'Viên',
      unitPrice: 5000,
      stockQuantity: 200,
      dosageForm: 'Viên nén',
      manufacturer: '',
      allergensText: '',
      conditionsText: '',
      warningText: '',
      isActive: true,
    });
    setMedModalOpen(true);
  };

  const openEditMed = (m: MedicineDto) => {
    setEditingMed(m);
    setMedForm({
      code: m.code,
      name: m.name,
      genericName: m.genericName || '',
      unit: m.unit,
      unitPrice: Number(m.unitPrice),
      stockQuantity: m.stockQuantity,
      dosageForm: m.dosageForm || '',
      manufacturer: m.manufacturer || '',
      allergensText: m.contraindications?.allergens?.join(', ') || '',
      conditionsText: m.contraindications?.conditions?.join(', ') || '',
      warningText: m.contraindications?.warningText || '',
      isActive: m.isActive,
    });
    setMedModalOpen(true);
  };

  const handleSaveMed = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const allergens = medForm.allergensText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    const conditions = medForm.conditionsText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const contraindications = {
      allergens,
      conditions,
      warningText: medForm.warningText.trim() || undefined,
    };

    try {
      if (editingMed) {
        await adminApi.updateMedicine(editingMed.id, {
          name: medForm.name,
          genericName: medForm.genericName || null,
          unit: medForm.unit,
          unitPrice: Number(medForm.unitPrice),
          stockQuantity: Number(medForm.stockQuantity),
          dosageForm: medForm.dosageForm || null,
          manufacturer: medForm.manufacturer || null,
          contraindications,
          isActive: medForm.isActive,
        });
        toast.success(`Đã cập nhật thuốc ${medForm.name}`);
      } else {
        await adminApi.createMedicine({
          code: medForm.code,
          name: medForm.name,
          genericName: medForm.genericName || undefined,
          unit: medForm.unit,
          unitPrice: Number(medForm.unitPrice),
          stockQuantity: Number(medForm.stockQuantity),
          dosageForm: medForm.dosageForm || undefined,
          manufacturer: medForm.manufacturer || undefined,
          contraindications,
        });
        toast.success(`Đã thêm thuốc ${medForm.name}`);
      }
      setMedModalOpen(false);
      await loadCatalog();
    } catch (err) {
      toast.error(
        'Lưu thuốc thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra dữ liệu'
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteMed = async (m: MedicineDto) => {
    try {
      await adminApi.deleteMedicine(m.id);
      toast.info(`Đã ngưng sử dụng thuốc ${m.name}`);
      await loadCatalog();
    } catch (err) {
      toast.error(
        'Thao tác thất bại',
        err instanceof Error ? err.message : 'Vui lòng thử lại'
      );
    }
  };

  const openCreateSvc = () => {
    setEditingSvc(null);
    setSvcForm({
      code: '',
      name: '',
      category: 'LAB_TEST',
      departmentId: '',
      unitPrice: 120000,
      description: '',
      isActive: true,
    });
    setSvcModalOpen(true);
  };

  const openEditSvc = (s: ServiceDto) => {
    setEditingSvc(s);
    setSvcForm({
      code: s.code,
      name: s.name,
      category: s.category,
      departmentId: s.departmentId || '',
      unitPrice: Number(s.unitPrice),
      description: s.description || '',
      isActive: s.isActive,
    });
    setSvcModalOpen(true);
  };

  const handleSaveSvc = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingSvc) {
        await adminApi.updateService(editingSvc.id, {
          name: svcForm.name,
          category: svcForm.category,
          departmentId: svcForm.departmentId || null,
          unitPrice: Number(svcForm.unitPrice),
          description: svcForm.description || null,
          isActive: svcForm.isActive,
        });
        toast.success(`Đã cập nhật dịch vụ ${svcForm.name}`);
      } else {
        await adminApi.createService({
          code: svcForm.code,
          name: svcForm.name,
          category: svcForm.category,
          departmentId: svcForm.departmentId || null,
          unitPrice: Number(svcForm.unitPrice),
          description: svcForm.description || undefined,
        });
        toast.success(`Đã thêm dịch vụ ${svcForm.name}`);
      }
      setSvcModalOpen(false);
      await loadCatalog();
    } catch (err) {
      toast.error(
        'Lưu dịch vụ thất bại',
        err instanceof Error ? err.message : 'Vui lòng kiểm tra dữ liệu'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            Danh mục Thuốc & Dịch vụ Y tế
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-1">
            Quản lý giá thuốc, tồn kho, dị nguyên chống chỉ định và bảng giá dịch vụ cận lâm sàng.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className="h-4 w-4" />}
            onClick={() => void loadCatalog()}
          >
            Làm mới
          </Button>
          {tab === 'MEDICINES' ? (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateMed}
            >
              Thêm Thuốc
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="h-4 w-4" />}
              onClick={openCreateSvc}
            >
              Thêm Dịch vụ
            </Button>
          )}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <Tabs
            activeId={tab}
            onChange={(id) => setTab(id as 'MEDICINES' | 'SERVICES')}
            items={[
              {
                id: 'MEDICINES',
                label: 'Kho Thuốc',
                count: medicines.length,
                icon: <Pill className="h-4 w-4" />,
              },
              {
                id: 'SERVICES',
                label: 'Dịch vụ & Xét nghiệm',
                count: services.length,
                icon: <FlaskConical className="h-4 w-4" />,
              },
            ]}
          />

          <div className="flex flex-col sm:flex-row gap-2.5">
            {tab === 'SERVICES' && (
              <div className="w-full sm:w-48">
                <Select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                  <option value="">Tất cả nhóm DV</option>
                  {Object.entries(CATEGORY_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </Select>
              </div>
            )}
            <div className="w-full sm:w-64">
              <Input
                placeholder="Tìm theo tên hoặc mã..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Spinner label="Đang tải danh mục..." />
      ) : tab === 'MEDICINES' ? (
        <Table
          data={medicines}
          rowKey={(m) => m.id}
          emptyState={<EmptyState title="Chưa có thuốc nào" />}
          columns={[
            {
              key: 'code',
              header: 'Mã thuốc',
              render: (m) => (
                <span className="font-mono text-xs font-bold text-[#1D5BB8]">{m.code}</span>
              ),
            },
            {
              key: 'name',
              header: 'Tên thuốc & Hoạt chất',
              render: (m) => (
                <div>
                  <p className="font-bold text-slate-900">{m.name}</p>
                  <p className="text-xs text-slate-600">
                    {m.genericName || '—'} • {m.dosageForm || m.unit}
                  </p>
                </div>
              ),
            },
            {
              key: 'price',
              header: 'Đơn giá',
              render: (m) => (
                <span className="font-semibold text-slate-800">
                  {formatCurrencyVND(m.unitPrice)}/{m.unit}
                </span>
              ),
            },
            {
              key: 'stock',
              header: 'Tồn kho',
              render: (m) => (
                <Badge variant={m.stockQuantity > 20 ? 'emerald' : 'amber'} size="sm">
                  {m.stockQuantity} {m.unit}
                </Badge>
              ),
            },
            {
              key: 'allergens',
              header: 'Dị nguyên / Cảnh báo',
              render: (m) => (
                <span className="text-xs text-rose-800">
                  {m.contraindications?.allergens?.join(', ') || '—'}
                </span>
              ),
            },
            {
              key: 'action',
              header: '',
              render: (m) => (
                <div className="flex items-center gap-1.5 justify-end">
                  <Button
                    variant="outline"
                    size="xs"
                    leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                    onClick={() => openEditMed(m)}
                  >
                    Sửa
                  </Button>
                  {m.isActive && (
                    <Button variant="ghost" size="xs" onClick={() => void handleDeleteMed(m)}>
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </Button>
                  )}
                </div>
              ),
            },
          ]}
        />
      ) : (
        <Table
          data={services}
          rowKey={(s) => s.id}
          emptyState={<EmptyState title="Chưa có dịch vụ nào" />}
          columns={[
            {
              key: 'code',
              header: 'Mã DV',
              render: (s) => <span className="font-mono text-xs font-bold">{s.code}</span>,
            },
            {
              key: 'name',
              header: 'Tên dịch vụ',
              render: (s) => (
                <div>
                  <p className="font-bold text-slate-900">{s.name}</p>
                  {s.description && (
                    <p className="text-xs text-slate-600 line-clamp-1">{s.description}</p>
                  )}
                </div>
              ),
            },
            {
              key: 'cat',
              header: 'Nhóm',
              render: (s) => (
                <Badge variant="blue" size="sm">
                  {CATEGORY_LABELS[s.category] || s.category}
                </Badge>
              ),
            },
            {
              key: 'dept',
              header: 'Khoa thực hiện',
              render: (s) => (
                <span className="text-xs text-slate-600">{s.departmentName || 'Dùng chung'}</span>
              ),
            },
            {
              key: 'price',
              header: 'Đơn giá',
              render: (s) => (
                <span className="font-bold text-slate-900">{formatCurrencyVND(s.unitPrice)}</span>
              ),
            },
            {
              key: 'action',
              header: '',
              render: (s) => (
                <Button
                  variant="outline"
                  size="xs"
                  leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                  onClick={() => openEditSvc(s)}
                >
                  Sửa
                </Button>
              ),
            },
          ]}
        />
      )}

      {/* Medicine Modal */}
      <Modal
        open={medModalOpen}
        onClose={() => setMedModalOpen(false)}
        size="lg"
        title={editingMed ? 'Cập nhật Thuốc' : 'Thêm Thuốc mới'}
      >
        <form onSubmit={handleSaveMed} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mã thuốc"
              required
              disabled={Boolean(editingMed)}
              value={medForm.code}
              onChange={(e) => setMedForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Input
              label="Tên thuốc"
              required
              value={medForm.name}
              onChange={(e) => setMedForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Input
              label="Hoạt chất (Generic Name)"
              value={medForm.genericName}
              onChange={(e) => setMedForm((f) => ({ ...f, genericName: e.target.value }))}
            />
            <Input
              label="Đơn vị tính"
              required
              value={medForm.unit}
              onChange={(e) => setMedForm((f) => ({ ...f, unit: e.target.value }))}
            />
            <Input
              label="Đơn giá (VNĐ)"
              type="number"
              min={0}
              value={medForm.unitPrice}
              onChange={(e) => setMedForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
            />
            <Input
              label="Số lượng tồn kho"
              type="number"
              min={0}
              value={medForm.stockQuantity}
              onChange={(e) =>
                setMedForm((f) => ({ ...f, stockQuantity: Number(e.target.value) }))
              }
            />
            <Input
              label="Dạng bào chế"
              value={medForm.dosageForm}
              onChange={(e) => setMedForm((f) => ({ ...f, dosageForm: e.target.value }))}
            />
            <Input
              label="Nhà sản xuất"
              value={medForm.manufacturer}
              onChange={(e) => setMedForm((f) => ({ ...f, manufacturer: e.target.value }))}
            />
          </div>
          <Input
            label="Dị nguyên liên quan (cách nhau bởi dấu phẩy)"
            placeholder="VD: Penicillin, Amoxicillin"
            value={medForm.allergensText}
            onChange={(e) => setMedForm((f) => ({ ...f, allergensText: e.target.value }))}
          />
          <Input
            label="Bệnh lý chống chỉ định (cách nhau bởi dấu phẩy)"
            placeholder="VD: Suy gan, Loét dạ dày"
            value={medForm.conditionsText}
            onChange={(e) => setMedForm((f) => ({ ...f, conditionsText: e.target.value }))}
          />
          <Textarea
            label="Cảnh báo lâm sàng"
            value={medForm.warningText}
            onChange={(e) => setMedForm((f) => ({ ...f, warningText: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setMedModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu thuốc
            </Button>
          </div>
        </form>
      </Modal>

      {/* Service Modal */}
      <Modal
        open={svcModalOpen}
        onClose={() => setSvcModalOpen(false)}
        title={editingSvc ? 'Cập nhật Dịch vụ' : 'Thêm Dịch vụ mới'}
      >
        <form onSubmit={handleSaveSvc} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Mã dịch vụ"
              required
              disabled={Boolean(editingSvc)}
              value={svcForm.code}
              onChange={(e) => setSvcForm((f) => ({ ...f, code: e.target.value }))}
            />
            <Input
              label="Tên dịch vụ"
              required
              value={svcForm.name}
              onChange={(e) => setSvcForm((f) => ({ ...f, name: e.target.value }))}
            />
            <Select
              label="Nhóm dịch vụ"
              value={svcForm.category}
              onChange={(e) =>
                setSvcForm((f) => ({ ...f, category: e.target.value as ServiceCategory }))
              }
              options={Object.entries(CATEGORY_LABELS).map(([k, v]) => ({ value: k, label: v }))}
            />
            <Select
              label="Chuyên khoa"
              value={svcForm.departmentId}
              onChange={(e) => setSvcForm((f) => ({ ...f, departmentId: e.target.value }))}
            >
              <option value="">Dùng chung toàn viện</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </Select>
          </div>
          <Input
            label="Đơn giá (VNĐ)"
            type="number"
            min={0}
            step={10000}
            value={svcForm.unitPrice}
            onChange={(e) => setSvcForm((f) => ({ ...f, unitPrice: Number(e.target.value) }))}
          />
          <Textarea
            label="Mô tả dịch vụ"
            value={svcForm.description}
            onChange={(e) => setSvcForm((f) => ({ ...f, description: e.target.value }))}
          />
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setSvcModalOpen(false)}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" loading={saving}>
              Lưu dịch vụ
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
