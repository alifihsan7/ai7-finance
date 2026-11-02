export function getPocketStatus(target: number, spent: number, remaining: number) {
  const percentage = target > 0 ? Math.max(0, spent / target * 100) : null;
  if (remaining < 0 || (target > 0 && spent > target)) {
    return { label: target > 0 ? "Melebihi plafon" : "Saldo negatif", tone: "danger", percentage } as const;
  }
  if (target <= 0) return { label: "Tanpa plafon", tone: "neutral", percentage } as const;
  if (spent >= target) return { label: "Batas tercapai", tone: "warning", percentage } as const;
  if (percentage !== null && percentage >= 80) {
    return { label: "Mendekati batas", tone: "warning", percentage } as const;
  }
  return { label: "Dalam batas", tone: "safe", percentage } as const;
}
