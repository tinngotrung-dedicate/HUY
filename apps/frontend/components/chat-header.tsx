"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { memo, useEffect, useState } from "react";
import { useWindowSize } from "usehooks-ts";
import { SidebarToggle } from "@/components/sidebar-toggle";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PlusIcon } from "./icons";
import { useSidebar } from "./ui/sidebar";
import { VisibilitySelector, type VisibilityType } from "./visibility-selector";

const storageKey = "medgpt-intake";

type IntakeData = {
  fullName: string;
  birthDate: string;
  gender: string;
  address: string;
  admissionDate: string;
  admissionReason: string;
  historyOfPresentIllness: string;
  generalStatus: string;
  glasgowScore: string;
  gestationalWeeks: string;
  para: string;
  deliveryMethod: string;
  birthWeight: string;
  apgarScore: string;
  postBirthComplications: string;
};

const emptyIntake: IntakeData = {
  fullName: "",
  birthDate: "",
  gender: "",
  address: "",
  admissionDate: "",
  admissionReason: "",
  historyOfPresentIllness: "",
  generalStatus: "",
  glasgowScore: "",
  gestationalWeeks: "",
  para: "",
  deliveryMethod: "",
  birthWeight: "",
  apgarScore: "",
  postBirthComplications: "",
};

function PureChatHeader({
  chatId,
  selectedVisibilityType,
  isReadonly,
}: {
  chatId: string;
  selectedVisibilityType: VisibilityType;
  isReadonly: boolean;
}) {
  const router = useRouter();
  const { open } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();
  const [isUserInfoOpen, setIsUserInfoOpen] = useState(false);
  const [intake, setIntake] = useState<IntakeData>(emptyIntake);
  const [mounted, setMounted] = useState(false);

  const { width: windowWidth } = useWindowSize();
  const themeLabel = resolvedTheme === "dark" ? "Sang" : "Toi";

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isUserInfoOpen) return;
    const saved = localStorage.getItem(storageKey);
    if (!saved) {
      setIntake(emptyIntake);
      return;
    }
    try {
      const parsed = JSON.parse(saved) as IntakeData;
      setIntake({ ...emptyIntake, ...parsed });
    } catch (_) {
      setIntake(emptyIntake);
    }
  }, [isUserInfoOpen]);

  return (
    <header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
      <SidebarToggle />

      {(!open || windowWidth < 768) && (
        <Button
          className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
          onClick={() => {
            router.push("/");
            router.refresh();
          }}
          variant="outline"
        >
          <PlusIcon />
          <span className="md:sr-only">Ho so moi</span>
        </Button>
      )}

      {!isReadonly && (
        <VisibilitySelector
          chatId={chatId}
          className="order-1 md:order-2"
          selectedVisibilityType={selectedVisibilityType}
        />
      )}

      <div className="order-3 ml-auto flex flex-wrap items-center gap-2">
        <Dialog onOpenChange={setIsUserInfoOpen} open={isUserInfoOpen}>
          <DialogTrigger asChild>
            <Button variant="outline">Thong tin nguoi dung</Button>
          </DialogTrigger>
          <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Thong tin nguoi dung</DialogTitle>
              <DialogDescription>
                Du lieu duoc lay tu phan intake (mock, co the chinh sua).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4">
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ho ten benh nhi"
                  value={intake.fullName}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, fullName: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ngay sinh"
                  value={intake.birthDate}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, birthDate: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Gioi tinh"
                  value={intake.gender}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, gender: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Dia chi"
                  value={intake.address}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, address: event.target.value }))
                  }
                />
              </div>
              <textarea
                className="min-h-[90px] rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                placeholder="Benh su hien tai"
                value={intake.historyOfPresentIllness}
                onChange={(event) =>
                  setIntake((prev) => ({
                    ...prev,
                    historyOfPresentIllness: event.target.value,
                  }))
                }
              />
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ngay nhap vien"
                  value={intake.admissionDate}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, admissionDate: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Ly do nhap vien"
                  value={intake.admissionReason}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, admissionReason: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Tinh trang tong quat"
                  value={intake.generalStatus}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, generalStatus: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Glasgow score"
                  value={intake.glasgowScore}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, glasgowScore: event.target.value }))
                  }
                />
              </div>
              <div className="grid gap-3 md:grid-cols-2">
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Tuan thai"
                  value={intake.gestationalWeeks}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, gestationalWeeks: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Para"
                  value={intake.para}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, para: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Phuong phap sinh"
                  value={intake.deliveryMethod}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, deliveryMethod: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Can nang luc sinh"
                  value={intake.birthWeight}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, birthWeight: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Apgar score"
                  value={intake.apgarScore}
                  onChange={(event) =>
                    setIntake((prev) => ({ ...prev, apgarScore: event.target.value }))
                  }
                />
                <input
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                  placeholder="Bien chung sau sinh"
                  value={intake.postBirthComplications}
                  onChange={(event) =>
                    setIntake((prev) => ({
                      ...prev,
                      postBirthComplications: event.target.value,
                    }))
                  }
                />
              </div>
            </div>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={() => {
                  localStorage.setItem(storageKey, JSON.stringify(intake));
                }}
              >
                Luu thay doi
              </Button>
              <DialogClose asChild>
                <Button variant="outline">Dong</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          onClick={() =>
            setTheme(resolvedTheme === "dark" ? "light" : "dark")
          }
          variant="outline"
        >
          <span suppressHydrationWarning>{mounted ? themeLabel : "..."}</span>
        </Button>

        <Dialog>
          <DialogTrigger asChild>
            <Button className="bg-primary/80 px-2 text-primary-foreground hover:bg-primary">
              Checklist cap cuu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Checklist cap cuu co ban</DialogTitle>
              <DialogDescription>
                Danh sach kiem tra nhanh (mock UI).
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-3 text-sm text-muted-foreground">
              {[
                "Duong tho: thong thoang, co nghet?",
                "Ho hap: nhip tho, co kho tho, co tim tai?",
                "Tuan hoan: mach, huyet ap, da niem?",
                "Than nhiet: sot bao nhieu do, keo dai bao lau?",
                "Y thuc: tinh tao, lo du, co giat?",
                "Tien su: di ung, benh nen, thuoc dang dung?",
              ].map((item) => (
                <label
                  className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-background/60 px-4 py-3"
                  key={item}
                >
                  <span className="text-foreground">{item}</span>
                  <input type="checkbox" />
                </label>
              ))}
            </div>
            <DialogFooter className="gap-2 sm:gap-3">
              <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                Luu tam
              </Button>
              <DialogClose asChild>
                <Button variant="outline">Dong</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </header>
  );
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
  return (
    prevProps.chatId === nextProps.chatId &&
    prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
    prevProps.isReadonly === nextProps.isReadonly
  );
});
