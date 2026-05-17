"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { exportDriveLogs, exportFuelLogs } from "@/lib/excel";
import {
  defaultSettings,
  deleteDriveLog,
  deleteFuelLog,
  getSettings,
  listDriveLogs,
  listFuelLogs,
  saveDriveLog,
  saveFuelLog,
  syncLocalDataToSupabase,
} from "@/lib/storage";
import type { AppSettings, DriveLog, FuelLog } from "@/lib/types";

type DriveForm = {
  id: string;
  date: string;
  passengerName: string;
  passengerCount: string;
  destination: string;
  purpose: string;
  startTime: string;
  endTime: string;
  startOdometer: string;
  endOdometer: string;
  memo: string;
  createdAt: string;
};

type FuelForm = {
  id: string;
  date: string;
  fuelAmount: string;
  amount: string;
  odometer: string;
  memo: string;
  createdAt: string;
};

const purposeOptions = ["등원지도", "귀가지도", "급식장보기", "병원", "프로그램"];

const nowDate = () => {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
};

const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, "0")}:${String(
    date.getMinutes(),
  ).padStart(2, "0")}`;
};

const currentMonth = () => nowDate().slice(0, 7);

const createId = () => crypto.randomUUID();

const formatIntegerInput = (value: string) => {
  const digits = value.replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString() : "";
};

const formatDecimalInput = (value: string) => {
  const normalized = value.replace(/[^\d.]/g, "");
  const [integer = "", ...decimalParts] = normalized.split(".");
  const integerText = integer ? Number(integer).toLocaleString() : "";

  if (!normalized.includes(".")) {
    return integerText;
  }

  return `${integerText || "0"}.${decimalParts.join("")}`;
};

const emptyDriveForm = (lastOdometer = ""): DriveForm => ({
  id: createId(),
  date: nowDate(),
  passengerName: "어관선",
  passengerCount: "1",
  destination: "",
  purpose: "등원지도",
  startTime: nowTime(),
  endTime: "",
  startOdometer: formatIntegerInput(lastOdometer),
  endOdometer: "",
  memo: "",
  createdAt: new Date().toISOString(),
});

const emptyFuelForm = (): FuelForm => ({
  id: createId(),
  date: nowDate(),
  fuelAmount: "",
  amount: "",
  odometer: "",
  memo: "",
  createdAt: new Date().toISOString(),
});

const toNumber = (value: string) => Number(value.replaceAll(",", "")) || 0;

const formatKm = (value: number) => `${value.toLocaleString()} km`;

const formatMonth = (month: string) => {
  const [year, monthNumber] = month.split("-");
  return `${year}년 ${Number(monthNumber)}월`;
};

export default function Home() {
  const [driveLogs, setDriveLogs] = useState<DriveLog[]>([]);
  const [fuelLogs, setFuelLogs] = useState<FuelLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth());
  const [driveForm, setDriveForm] = useState<DriveForm>(() => emptyDriveForm());
  const [fuelForm, setFuelForm] = useState<FuelForm>(() => emptyFuelForm());
  const [activeTab, setActiveTab] = useState<"drive" | "fuel">("drive");
  const [screen, setScreen] = useState<"list" | "form">("list");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const refreshLogs = async () => {
    const [nextDriveLogs, nextFuelLogs] = await Promise.all([
      listDriveLogs(),
      listFuelLogs(),
    ]);
    setDriveLogs(nextDriveLogs);
    setFuelLogs(nextFuelLogs);
  };

  useEffect(() => {
    const load = async () => {
      setSettings(getSettings());
      await syncLocalDataToSupabase();
      await refreshLogs();
      setIsLoading(false);
    };

    load().catch((error: unknown) => {
      setStatus(error instanceof Error ? error.message : "데이터를 불러오지 못했습니다.");
      setIsLoading(false);
    });
  }, []);

  const monthlyDriveLogs = useMemo(
    () =>
      driveLogs
        .filter((log) => log.date.startsWith(selectedMonth))
        .sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)),
    [driveLogs, selectedMonth],
  );

  const monthlyFuelLogs = useMemo(
    () =>
      fuelLogs
        .filter((log) => log.date.startsWith(selectedMonth))
        .sort((a, b) => a.date.localeCompare(b.date)),
    [fuelLogs, selectedMonth],
  );

  const lastOdometer = useMemo(() => {
    const latest = [...driveLogs].sort((a, b) =>
      `${b.date} ${b.endTime}`.localeCompare(`${a.date} ${a.endTime}`),
    )[0];
    return latest?.endOdometer ? formatIntegerInput(String(latest.endOdometer)) : "";
  }, [driveLogs]);

  const driveDistance = Math.max(
    0,
    toNumber(driveForm.endOdometer) - toNumber(driveForm.startOdometer),
  );

  const openNewLogForm = () => {
    setActiveTab("drive");
    setDriveForm(emptyDriveForm(lastOdometer));
    setFuelForm(emptyFuelForm());
    setStatus("");
    setScreen("form");
  };

  const submitDriveLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const startOdometer = toNumber(driveForm.startOdometer);
    const endOdometer = toNumber(driveForm.endOdometer);

    if (endOdometer > 0 && startOdometer > 0 && endOdometer < startOdometer) {
      setStatus("도착 km는 출발 km보다 작을 수 없습니다.");
      return;
    }

    const log: DriveLog = {
      id: driveForm.id,
      date: driveForm.date,
      passengerName: driveForm.passengerName.trim(),
      passengerCount: toNumber(driveForm.passengerCount) || 1,
      destination: driveForm.destination.trim(),
      purpose: driveForm.purpose.trim(),
      startTime: driveForm.startTime,
      endTime: driveForm.endTime,
      startOdometer,
      endOdometer,
      distance: Math.max(0, endOdometer - startOdometer),
      memo: driveForm.memo.trim(),
      createdAt: driveForm.createdAt,
    };

    await saveDriveLog(log);
    await refreshLogs();
    setDriveForm(emptyDriveForm(String(endOdometer || toNumber(lastOdometer))));
    setStatus("운행 기록을 저장했습니다.");
    setScreen("list");
  };

  const submitFuelLog = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const log: FuelLog = {
      id: fuelForm.id,
      date: fuelForm.date,
      fuelAmount: toNumber(fuelForm.fuelAmount),
      amount: toNumber(fuelForm.amount),
      odometer: toNumber(fuelForm.odometer),
      memo: fuelForm.memo.trim(),
      createdAt: fuelForm.createdAt,
    };

    await saveFuelLog(log);
    await refreshLogs();
    setFuelForm(emptyFuelForm());
    setStatus("주유 기록을 저장했습니다.");
    setScreen("list");
  };

  const editDriveLog = (log: DriveLog) => {
    setActiveTab("drive");
    setScreen("form");
    setDriveForm({
      id: log.id,
      date: log.date,
      passengerName: log.passengerName,
      passengerCount: String(log.passengerCount),
      destination: log.destination,
      purpose: log.purpose,
      startTime: log.startTime,
      endTime: log.endTime,
      startOdometer: formatIntegerInput(String(log.startOdometer || "")),
      endOdometer: formatIntegerInput(String(log.endOdometer || "")),
      memo: log.memo,
      createdAt: log.createdAt,
    });
  };

  const editFuelLog = (log: FuelLog) => {
    setActiveTab("fuel");
    setScreen("form");
    setFuelForm({
      id: log.id,
      date: log.date,
      fuelAmount: formatDecimalInput(String(log.fuelAmount || "")),
      amount: formatIntegerInput(String(log.amount || "")),
      odometer: formatIntegerInput(String(log.odometer || "")),
      memo: log.memo,
      createdAt: log.createdAt,
    });
  };

  const removeDriveLog = async (id: string) => {
    await deleteDriveLog(id);
    await refreshLogs();
    setStatus("운행 기록을 삭제했습니다.");
  };

  const removeFuelLog = async (id: string) => {
    await deleteFuelLog(id);
    await refreshLogs();
    setStatus("주유 기록을 삭제했습니다.");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-[var(--background)] text-[rgba(0,0,0,0.87)]">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 pb-24 pt-5 sm:px-6 lg:px-10">
        <header className="app-card app-green-band flex items-end justify-between gap-3 p-6">
          <div>
            <p className="text-sm font-semibold text-white/70">{settings.centerName}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-[-0.01em] sm:text-3xl">
              {screen === "form" ? "기록 추가" : "차량운행일지"}
            </h1>
          </div>
          {screen === "form" ? (
            <button
              className="app-pill app-pill-on-dark shrink-0 text-sm"
              onClick={() => setScreen("list")}
              type="button"
            >
              목록
            </button>
          ) : null}
        </header>

        {screen === "list" ? (
          <>
            <section className="app-card grid min-w-0 items-end gap-4 p-4 lg:grid-cols-[minmax(0,1fr)_280px] sm:p-6">
              <div className="grid min-w-0 items-end gap-4 sm:grid-cols-[220px_minmax(0,1fr)]">
                <label className="app-label">
                  조회 월
                  <input
                    className="app-input h-14"
                    type="month"
                    value={selectedMonth}
                    onChange={(event) => setSelectedMonth(event.target.value)}
                  />
                </label>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <Metric label="운행" value={`${monthlyDriveLogs.length}건`} />
                  <Metric
                    label="주행"
                    value={formatKm(monthlyDriveLogs.reduce((sum, log) => sum + log.distance, 0))}
                  />
                  <Metric label="주유" value={`${monthlyFuelLogs.length}건`} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  className="app-pill app-pill-outline h-14 text-sm"
                  onClick={() => exportDriveLogs(monthlyDriveLogs, settings, selectedMonth)}
                  type="button"
                >
                  운행 엑셀
                </button>
                <button
                  className="app-pill app-pill-outline h-14 text-sm"
                  onClick={() => exportFuelLogs(monthlyFuelLogs, settings, selectedMonth)}
                  type="button"
                >
                  주유 엑셀
                </button>
              </div>
            </section>

            {status ? (
              <p className="rounded-xl border border-[var(--green-light)] bg-[var(--green-light)]/60 p-4 text-sm font-medium text-[var(--house-green)]">
                {status}
              </p>
            ) : null}

            <section className="grid min-w-0 gap-5 xl:grid-cols-2">
              <LogList
                emptyText={isLoading ? "불러오는 중입니다." : "운행 기록이 없습니다."}
                title={`${formatMonth(selectedMonth)} 운행 내역`}
              >
                {monthlyDriveLogs.map((log) => (
                  <article
                    className="app-card p-4 sm:p-5"
                    key={log.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[rgba(0,0,0,0.87)]">{log.date}</p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          {log.startTime || "--:--"} - {log.endTime || "--:--"} ·{" "}
                          {log.destination}
                        </p>
                      </div>
                      <p className="rounded-full bg-[var(--green-light)] px-3 py-1 text-sm font-semibold text-[var(--house-green)]">
                        {formatKm(log.distance)}
                      </p>
                    </div>
                    <p className="mt-3 text-sm text-[rgba(0,0,0,0.87)]">
                      {log.passengerName || "이용자 없음"} · {log.passengerCount}명 ·{" "}
                      {log.purpose}
                    </p>
                    <p className="mt-1 text-sm text-[var(--text-soft)]">
                      {formatKm(log.startOdometer)} → {formatKm(log.endOdometer)}
                    </p>
                    {log.memo ? (
                      <p className="mt-2 text-sm text-[var(--text-soft)]">{log.memo}</p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="app-pill app-pill-dark-outline min-h-10 text-sm"
                        onClick={() => editDriveLog(log)}
                        type="button"
                      >
                        수정
                      </button>
                      <button
                        className="app-pill app-danger-outline min-h-10 text-sm"
                        onClick={() => removeDriveLog(log.id)}
                        type="button"
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                ))}
              </LogList>

              <LogList
                emptyText={isLoading ? "불러오는 중입니다." : "주유 기록이 없습니다."}
                title={`${formatMonth(selectedMonth)} 주유 내역`}
              >
                {monthlyFuelLogs.map((log) => (
                  <article
                    className="app-card p-4 sm:p-5"
                    key={log.id}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-[rgba(0,0,0,0.87)]">{log.date}</p>
                        <p className="mt-1 text-sm text-[var(--text-soft)]">
                          {log.fuelAmount.toLocaleString()} 리터 ·{" "}
                          {formatKm(log.odometer)}
                        </p>
                      </div>
                      <p className="rounded-full bg-[var(--green-light)] px-3 py-1 text-sm font-semibold text-[var(--house-green)]">
                        {log.amount.toLocaleString()} 원
                      </p>
                    </div>
                    {log.memo ? (
                      <p className="mt-2 text-sm text-[var(--text-soft)]">{log.memo}</p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <button
                        className="app-pill app-pill-dark-outline min-h-10 text-sm"
                        onClick={() => editFuelLog(log)}
                        type="button"
                      >
                        수정
                      </button>
                      <button
                        className="app-pill app-danger-outline min-h-10 text-sm"
                        onClick={() => removeFuelLog(log.id)}
                        type="button"
                      >
                        삭제
                      </button>
                    </div>
                  </article>
                ))}
              </LogList>
            </section>

            <button
              className="app-fab fixed bottom-5 right-5 z-10 px-5 text-base font-bold"
              onClick={openNewLogForm}
              type="button"
            >
              기록 추가
            </button>
          </>
        ) : (
          <section className="app-card mx-auto w-full min-w-0 p-4 sm:p-6 lg:p-8">
            <div className="app-soft-surface mb-5 grid grid-cols-2 rounded-full p-1">
              <button
                className={`app-pill text-sm ${
                  activeTab === "drive"
                    ? "bg-white text-[var(--brand-green)] shadow-sm"
                    : "text-[var(--text-soft)]"
                }`}
                onClick={() => setActiveTab("drive")}
                type="button"
              >
                운행 기록
              </button>
              <button
                className={`app-pill text-sm ${
                  activeTab === "fuel"
                    ? "bg-white text-[var(--brand-green)] shadow-sm"
                    : "text-[var(--text-soft)]"
                }`}
                onClick={() => setActiveTab("fuel")}
                type="button"
              >
                주유 기록
              </button>
            </div>

            {activeTab === "drive" ? (
              <form className="grid gap-4" onSubmit={submitDriveLog}>
                <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                  <div className="grid min-w-0 content-start gap-4">
                    <h2 className="text-lg font-semibold text-[var(--brand-green)]">기본 정보</h2>
                    <div className="grid min-w-0 gap-3 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                      <Input
                        label="날짜"
                        type="date"
                        value={driveForm.date}
                        onChange={(value) => setDriveForm({ ...driveForm, date: value })}
                      />
                      <Input
                        label="출발 시간"
                        type="time"
                        value={driveForm.startTime}
                        onChange={(value) => setDriveForm({ ...driveForm, startTime: value })}
                      />
                      <Input
                        label="도착 시간"
                        type="time"
                        value={driveForm.endTime}
                        onChange={(value) => setDriveForm({ ...driveForm, endTime: value })}
                      />
                    </div>

                    <div className="grid min-w-0 gap-3 sm:grid-cols-[minmax(0,1fr)_110px]">
                      <Input
                        label="이용자"
                        value={driveForm.passengerName}
                        onChange={(value) =>
                          setDriveForm({ ...driveForm, passengerName: value })
                        }
                        placeholder="예: 어관선"
                      />
                      <Input
                        label="탑승 인원"
                        inputMode="numeric"
                        value={driveForm.passengerCount}
                        onChange={(value) =>
                          setDriveForm({
                            ...driveForm,
                            passengerCount: value.replace(/\D/g, ""),
                          })
                        }
                      />
                    </div>

                    <Input
                      label="행선지"
                      value={driveForm.destination}
                      onChange={(value) => setDriveForm({ ...driveForm, destination: value })}
                      placeholder="예: 동화휴먼시아"
                    />

                    <div className="grid gap-2">
                      <span className="text-sm font-semibold text-[rgba(0,0,0,0.87)]">목적</span>
                      <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
                        {purposeOptions.map((purpose) => (
                          <button
                            className={`app-pill min-h-10 px-2 text-sm ${
                              driveForm.purpose === purpose
                                ? "app-purpose-active"
                                : "border border-[#d6dbde] text-[var(--text-soft)]"
                            }`}
                            key={purpose}
                            onClick={() => setDriveForm({ ...driveForm, purpose })}
                            type="button"
                          >
                            {purpose}
                          </button>
                        ))}
                      </div>
                      <input
                        className="app-input"
                        value={driveForm.purpose}
                        onChange={(event) =>
                          setDriveForm({ ...driveForm, purpose: event.target.value })
                        }
                        placeholder="직접 입력"
                      />
                    </div>
                  </div>

                  <div className="grid min-w-0 content-start gap-4">
                    <h2 className="text-lg font-semibold text-[var(--brand-green)]">운행 정보</h2>
                    <div className="grid min-w-0 gap-3 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px] lg:grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_120px]">
                      <Input
                        label="출발 km"
                        inputMode="numeric"
                        suffix="km"
                        value={formatIntegerInput(driveForm.startOdometer)}
                        onChange={(value) =>
                          setDriveForm({
                            ...driveForm,
                            startOdometer: formatIntegerInput(value),
                          })
                        }
                      />
                      <Input
                        label="도착 km"
                        inputMode="numeric"
                        suffix="km"
                        value={formatIntegerInput(driveForm.endOdometer)}
                        onChange={(value) =>
                          setDriveForm({
                            ...driveForm,
                            endOdometer: formatIntegerInput(value),
                          })
                        }
                      />
                      <div className="rounded-xl border border-[var(--green-light)] bg-[var(--green-light)]/70 p-3">
                        <p className="text-xs font-semibold text-[var(--brand-green)]">주행거리</p>
                        <p className="mt-1 text-xl font-bold text-[var(--house-green)]">
                          {formatKm(driveDistance)}
                        </p>
                      </div>
                    </div>

                    <label className="app-label">
                      차량 정비/특이사항
                      <textarea
                        className="app-input min-h-[220px]"
                        value={driveForm.memo}
                        onChange={(event) =>
                          setDriveForm({ ...driveForm, memo: event.target.value })
                        }
                      />
                    </label>
                  </div>
                </div>

                <div className="grid min-w-0 gap-2">
                  <button className="app-pill app-pill-primary h-12 text-base" type="submit">
                    저장
                  </button>
                </div>
              </form>
            ) : (
              <form className="grid gap-4" onSubmit={submitFuelLog}>
                <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  <Input
                    label="주유일"
                    type="date"
                    value={fuelForm.date}
                    onChange={(value) => setFuelForm({ ...fuelForm, date: value })}
                  />
                  <Input
                    label="주유량"
                    inputMode="decimal"
                    suffix="리터"
                    value={formatDecimalInput(fuelForm.fuelAmount)}
                    onChange={(value) =>
                      setFuelForm({ ...fuelForm, fuelAmount: formatDecimalInput(value) })
                    }
                  />
                  <Input
                    label="금액"
                    inputMode="numeric"
                    suffix="원"
                    value={formatIntegerInput(fuelForm.amount)}
                    onChange={(value) =>
                      setFuelForm({ ...fuelForm, amount: formatIntegerInput(value) })
                    }
                  />
                  <Input
                    label="주행 총거리"
                    inputMode="numeric"
                    suffix="km"
                    value={formatIntegerInput(fuelForm.odometer)}
                    onChange={(value) =>
                      setFuelForm({ ...fuelForm, odometer: formatIntegerInput(value) })
                    }
                  />
                </div>
                <label className="app-label">
                  비고
                  <textarea
                    className="app-input min-h-[180px]"
                    value={fuelForm.memo}
                    onChange={(event) => setFuelForm({ ...fuelForm, memo: event.target.value })}
                  />
                </label>
                <div className="grid min-w-0 gap-2">
                  <button className="app-pill app-pill-primary h-12 text-base" type="submit">
                    저장
                  </button>
                </div>
              </form>
            )}
          </section>
        )}
      </div>
    </main>
  );
}

function Input({
  label,
  onChange,
  value,
  inputMode,
  placeholder,
  suffix,
  type = "text",
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
  inputMode?: "decimal" | "numeric";
  placeholder?: string;
  suffix?: string;
  type?: string;
}) {
  return (
    <label className="app-label">
      {label}
      <span className="relative block">
        <input
          className={`app-input ${suffix ? "pr-16" : ""}`}
          inputMode={inputMode}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type={type}
          value={value}
        />
        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-[var(--text-soft)]">
            {suffix}
          </span>
        ) : null}
      </span>
    </label>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex h-14 flex-col items-center justify-center rounded-xl bg-[var(--ceramic)] px-3 py-2">
      <dt className="text-xs font-semibold text-[var(--text-soft)]">{label}</dt>
      <dd className="mt-0.5 text-base font-bold leading-5 text-[var(--house-green)]">{value}</dd>
    </div>
  );
}

function LogList({
  children,
  emptyText,
  title,
}: {
  children: React.ReactNode;
  emptyText: string;
  title: string;
}) {
  return (
    <section>
      <h2 className="mb-3 text-xl font-semibold text-[var(--brand-green)]">{title}</h2>
      <div className="grid gap-3">
        {Array.isArray(children) && children.length === 0 ? (
          <p className="app-card p-4 text-sm text-[var(--text-soft)]">
            {emptyText}
          </p>
        ) : (
          children
        )}
      </div>
    </section>
  );
}
