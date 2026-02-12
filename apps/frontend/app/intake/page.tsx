"use client";

export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import {
  createChild,
  getAccessToken,
  getIntake,
  listChildren,
  updateChild,
  upsertIntake,
} from "@/lib/api";

type Child = {
  id: string;
  full_name: string;
  birth_date?: string | null;
  gender?: string | null;
  address?: string | null;
};

type Intake = {
  admission_date?: string | null;
  admission_reason?: string | null;
  obstetric_history?: string | null;
  development_history?: string | null;
  nutrition_history?: string | null;
  immunization_history?: string | null;
  allergy_history?: string | null;
  pathology_history?: string | null;
  epidemiology_history?: string | null;
  family_history?: string | null;
  medical_history?: string | null;
  general_exam?: string | null;
};

const intakeFields: Array<{ key: keyof Intake; label: string; hint: string }>
  = [
    {
      key: "admission_reason",
      label: "2. Lý do nhập viện",
      hint: "Ghi lý do chính khiến trẻ được đưa đến bệnh viện.",
    },
    {
      key: "obstetric_history",
      label: "3.1.1. Sản khoa",
      hint:
        "Con thứ mấy, số lần mang thai, diễn tiến thai kỳ, sinh thường/mổ, Apgar, tai biến sơ sinh...",
    },
    {
      key: "development_history",
      label: "3.1.2. Phát triển thể chất, tâm thần, vận động",
      hint:
        "Các mốc phát triển, cân nặng/chiều cao, biểu hiện bất thường.",
    },
    {
      key: "nutrition_history",
      label: "3.1.3. Dinh dưỡng",
      hint: "Cách nuôi dưỡng, vấn đề thiếu chất, khẩu phần, bổ sung.",
    },
    {
      key: "immunization_history",
      label: "3.1.4. Chủng ngừa",
      hint: "Các mũi tiêm đã/ chưa tiêm, lịch tiêm, phản ứng sau tiêm.",
    },
    {
      key: "allergy_history",
      label: "3.1.5. Dị ứng",
      hint: "Tiền căn dị ứng thuốc, thức ăn, dị nguyên khác.",
    },
    {
      key: "pathology_history",
      label: "3.1.6. Bệnh lý",
      hint: "Tiền sử bệnh nội/ngoại khoa, điều trị trước đó, kết quả.",
    },
    {
      key: "epidemiology_history",
      label: "3.1.7. Dịch tễ",
      hint: "Tiếp xúc nguồn bệnh, đi lại vùng dịch, các yếu tố nguy cơ.",
    },
    {
      key: "family_history",
      label: "3.2. Gia đình",
      hint: "Tiền sử bệnh lý gia đình, di truyền, lây nhiễm.",
    },
    {
      key: "medical_history",
      label: "4. Bệnh sử",
      hint:
        "Diễn tiến triệu chứng, điều trị trước đó, đáp ứng, diễn tiến hiện tại.",
    },
    {
      key: "general_exam",
      label: "5. Khám",
      hint: "Tổng trạng, Glasgow, dấu hiệu sinh tồn, khám hệ cơ quan.",
    },
  ];

const emptyIntake = (): Intake => ({
  admission_date: "",
  admission_reason: "",
  obstetric_history: "",
  development_history: "",
  nutrition_history: "",
  immunization_history: "",
  allergy_history: "",
  pathology_history: "",
  epidemiology_history: "",
  family_history: "",
  medical_history: "",
  general_exam: "",
});

export default function IntakePage() {
  const router = useRouter();
  const [children, setChildren] = useState<Child[]>([]);
  const [activeChildId, setActiveChildId] = useState<string | null>(null);
  const [childDrafts, setChildDrafts] = useState<Record<string, Child>>({});
  const [intakeDrafts, setIntakeDrafts] = useState<Record<string, Intake>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [newChild, setNewChild] = useState<Omit<Child, "id">>({
    full_name: "",
    birth_date: "",
    gender: "",
    address: "",
  });

  useEffect(() => {
    if (!getAccessToken()) {
      router.push("/login");
      return;
    }
    const load = async () => {
      try {
        const data = await listChildren();
        setChildren(data);
        if (data.length > 0) {
          setActiveChildId(data[0].id);
          setChildDrafts((prev) => {
            const next = { ...prev };
            data.forEach((child) => {
              if (!next[child.id]) next[child.id] = child;
            });
            return next;
          });
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Không thể tải danh sách trẻ.";
        if (message.includes("Phiên đăng nhập")) {
          toast({ type: "error", description: "Phiên đăng nhập hết hạn, vui lòng đăng nhập lại." });
          router.push("/login");
          return;
        }
        toast({ type: "error", description: message });
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, []);

  useEffect(() => {
    if (!activeChildId || intakeDrafts[activeChildId]) return;
    const loadIntake = async () => {
      try {
        const intake = await getIntake(activeChildId);
        setIntakeDrafts((prev) => ({
          ...prev,
          [activeChildId]: { ...emptyIntake(), ...intake },
        }));
      } catch (error) {
        const message = String(error || "");
        if (!message.includes("Intake not found") && !message.includes("404")) {
          toast({ type: "error", description: "Không thể tải intake." });
        }
        setIntakeDrafts((prev) => ({
          ...prev,
          [activeChildId]: emptyIntake(),
        }));
      }
    };

    loadIntake();
  }, [activeChildId, intakeDrafts]);

  const activeChild = useMemo(
    () => (activeChildId ? children.find((c) => c.id === activeChildId) : null),
    [children, activeChildId]
  );

  const intake = activeChildId ? intakeDrafts[activeChildId] || emptyIntake() : emptyIntake();
  const childDraft = activeChildId ? childDrafts[activeChildId] || activeChild || null : null;

  const updateIntakeField = (key: keyof Intake, value: string) => {
    if (!activeChildId) return;
    setIntakeDrafts((prev) => ({
      ...prev,
      [activeChildId]: {
        ...emptyIntake(),
        ...(prev[activeChildId] || {}),
        [key]: value,
      },
    }));
  };

  const updateChildField = (key: keyof Child, value: string) => {
    if (!activeChildId || !childDraft) return;
    setChildDrafts((prev) => ({
      ...prev,
      [activeChildId]: {
        ...childDraft,
        [key]: value,
      },
    }));
  };

  const handleSave = async () => {
    if (!activeChildId || !childDraft) return;
    setIsSaving(true);
    try {
      await updateChild(activeChildId, {
        full_name: childDraft.full_name,
        birth_date: childDraft.birth_date || null,
        gender: childDraft.gender || null,
        address: childDraft.address || null,
      });
      await upsertIntake(activeChildId, intake);
      toast({ type: "success", description: "Đã lưu hồ sơ trẻ." });
    } catch (error) {
      toast({ type: "error", description: "Lưu hồ sơ thất bại." });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddChild = async () => {
    if (!newChild.full_name.trim()) {
      toast({ type: "error", description: "Vui lòng nhập họ tên trẻ." });
      return;
    }
    try {
      const created = await createChild({
        full_name: newChild.full_name,
        birth_date: newChild.birth_date || null,
        gender: newChild.gender || null,
        address: newChild.address || null,
      });
      setChildren((prev) => [created, ...prev]);
      setChildDrafts((prev) => ({ ...prev, [created.id]: created }));
      setActiveChildId(created.id);
      setNewChild({ full_name: "", birth_date: "", gender: "", address: "" });
      toast({ type: "success", description: "Đã tạo hồ sơ trẻ mới." });
    } catch (error) {
      toast({ type: "error", description: "Không thể tạo hồ sơ trẻ." });
    }
  };

  if (isLoading) {
    return <div className="flex min-h-dvh items-center justify-center">Đang tải...</div>;
  }

  return (
    <div
      className="h-dvh overflow-y-scroll bg-gradient-to-br from-sky-50 via-white to-sky-100 px-4 py-8"
      style={{ scrollbarGutter: "stable both-edges" }}
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <header className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Intake</p>
              <h1 className="text-2xl font-semibold text-slate-900">Hồ sơ intake cho trẻ</h1>
              <p className="text-sm text-slate-600">
                Mỗi tab tương ứng một trẻ. Đặt lịch được thực hiện ở mục Đặt lịch.
              </p>
            </div>
            <Button variant="outline" onClick={() => router.push("/booking")}>
              Đi tới đặt lịch
            </Button>
          </div>
        </header>

        <section className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
          <div className="flex flex-wrap items-center gap-2">
            {children.map((child) => (
              <button
                key={child.id}
                type="button"
                onClick={() => setActiveChildId(child.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm transition",
                  activeChildId === child.id
                    ? "border-sky-600 bg-sky-600 text-white"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-400"
                )}
              >
                {child.full_name || "Trẻ chưa đặt tên"}
              </button>
            ))}
            {children.length === 0 && (
              <p className="text-sm text-slate-500">Chưa có hồ sơ trẻ.</p>
            )}
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-4">
            <div className="md:col-span-4">
              <h3 className="text-sm font-semibold text-slate-800">Thêm hồ sơ trẻ</h3>
            </div>
            <div>
              <Label htmlFor="new-child-name">Họ tên</Label>
              <Input
                id="new-child-name"
                value={newChild.full_name}
                onChange={(event) =>
                  setNewChild((prev) => ({ ...prev, full_name: event.target.value }))
                }
                placeholder="Nguyễn Văn A"
              />
            </div>
            <div>
              <Label htmlFor="new-child-birth">Ngày sinh</Label>
              <Input
                id="new-child-birth"
                value={newChild.birth_date || ""}
                onChange={(event) =>
                  setNewChild((prev) => ({ ...prev, birth_date: event.target.value }))
                }
                placeholder="YYYY-MM-DD"
              />
            </div>
            <div>
              <Label htmlFor="new-child-gender">Giới tính</Label>
              <Input
                id="new-child-gender"
                value={newChild.gender || ""}
                onChange={(event) =>
                  setNewChild((prev) => ({ ...prev, gender: event.target.value }))
                }
                placeholder="Nam / Nữ"
              />
            </div>
            <div>
              <Label htmlFor="new-child-address">Địa chỉ</Label>
              <Input
                id="new-child-address"
                value={newChild.address || ""}
                onChange={(event) =>
                  setNewChild((prev) => ({ ...prev, address: event.target.value }))
                }
                placeholder="Quận / Tỉnh"
              />
            </div>
            <div className="md:col-span-4">
              <Button onClick={handleAddChild}>Tạo hồ sơ trẻ</Button>
            </div>
          </div>
        </section>

        {activeChildId && childDraft ? (
          <section className="grid gap-6 lg:grid-cols-[1fr_1.4fr]">
            <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
              <h2 className="text-lg font-semibold text-slate-900">Thông tin trẻ</h2>
              <p className="mt-1 text-sm text-slate-500">Cập nhật thông tin hành chính.</p>
              <div className="mt-5 grid gap-4">
                <div>
                  <Label>Họ tên</Label>
                  <Input
                    value={childDraft.full_name}
                    onChange={(event) => updateChildField("full_name", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Ngày sinh</Label>
                  <Input
                    value={childDraft.birth_date || ""}
                    onChange={(event) => updateChildField("birth_date", event.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <div>
                  <Label>Giới tính</Label>
                  <Input
                    value={childDraft.gender || ""}
                    onChange={(event) => updateChildField("gender", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Địa chỉ</Label>
                  <Input
                    value={childDraft.address || ""}
                    onChange={(event) => updateChildField("address", event.target.value)}
                  />
                </div>
                <div>
                  <Label>Ngày nhập viện</Label>
                  <Input
                    value={intake.admission_date || ""}
                    onChange={(event) => updateIntakeField("admission_date", event.target.value)}
                    placeholder="YYYY-MM-DD"
                  />
                </div>
                <Button onClick={handleSave} disabled={isSaving}>
                  {isSaving ? "Đang lưu..." : "Lưu hồ sơ"}
                </Button>
              </div>
            </div>

            <div className="space-y-6">
              {intakeFields.map((field) => (
                <div
                  key={field.key}
                  className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100"
                >
                  <h3 className="text-base font-semibold text-slate-900">{field.label}</h3>
                  <p className="mt-1 text-xs text-slate-500">{field.hint}</p>
                  <Textarea
                    className="mt-4 min-h-[120px]"
                    value={(intake[field.key] || "") as string}
                    onChange={(event) => updateIntakeField(field.key, event.target.value)}
                    placeholder="Nhập nội dung..."
                  />
                </div>
              ))}
            </div>
          </section>
        ) : (
          <div className="rounded-3xl bg-white/90 p-6 shadow-xl ring-1 ring-sky-100">
            <p className="text-slate-600">Tạo hồ sơ trẻ trước khi nhập intake.</p>
          </div>
        )}
      </div>
    </div>
  );
}
