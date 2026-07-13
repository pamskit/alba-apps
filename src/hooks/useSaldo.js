import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";
import { formatHistoryDescription, mapSaldoHistoryRow, saldoRoleConfig } from "@/utils/saldo";

export function useSaldo({ role, initialFetch = true } = {}) {
  const [profile, setProfile] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(initialFetch);
  const [errorMessage, setErrorMessage] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const config = saldoRoleConfig[role];
  const supabase = createClient();

  const fetchSaldo = useCallback(async () => {
    setLoading(true);
    setErrorMessage("");

    try {
      if (!config) {
        throw new Error("Role saldo tidak valid");
      }

      const session = getRoleSession(role);
      const roleId = session?.[config.profileIdField] ?? null;
      if (!roleId) {
        setProfile(null);
        setHistoryItems([]);
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from(config.profileTable)
        .select(config.profileSelect)
        .eq(config.profileIdField, roleId)
        .maybeSingle();

      if (profileError) throw profileError;
      const activeProfile = profileData ?? null;
      if (!activeProfile) {
        setProfile(null);
        setHistoryItems([]);
        return;
      }

      setProfile(activeProfile);

      const [{ data: historyData, error: historyError }, legacyResult] = await Promise.all([
        supabase
          .from(config.historyTable)
          .select("id,created_at,log_type,amount,balance_before,balance_after,payment_method,transaksi_id,nis_siswa,nip_guru,note")
          .eq(config.historyFilterField, roleId)
          .order("created_at", { ascending: false }),
        config.legacyHistoryTable
          ? supabase
              .from(config.legacyHistoryTable)
              .select(config.legacyHistorySelect)
              .eq(config.historyFilterField, roleId)
              .order("created_at", { ascending: false })
          : Promise.resolve({ data: [], error: null }),
      ]);

      if (historyError) throw historyError;
      if (legacyResult?.error) throw legacyResult.error;

      const mergedHistory = [
        ...(historyData ?? []).map((row) => ({ ...row, __historySource: "saldo_log" })),
        ...(legacyResult?.data ?? []).map((row) => ({ ...row, __historySource: "legacy" })),
      ];

      const normalizedHistory = mergedHistory.map(mapSaldoHistoryRow);
      const seen = new Set();
      const uniqueHistory = normalizedHistory.filter((item) => {
        const fingerprint = [
          item.created_at,
          item.amount,
          item.type,
          item.method,
          item.tipe,
          item.description,
          item.balance_before,
          item.balance_after,
          item.transaksi_id,
        ].join("|");
        if (seen.has(fingerprint)) return false;
        seen.add(fingerprint);
        return true;
      });

      setHistoryItems(uniqueHistory.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
    } catch (error) {
      console.error(error);
      setErrorMessage("Gagal memuat data saldo.");
      setProfile(null);
      setHistoryItems([]);
    } finally {
      setLoading(false);
    }
  }, [config, role, supabase]);

  const handlePaymentHutang = useCallback(async () => {
    setPaymentError("");
    setPaymentSuccess("");

    if (!profile) return;
    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Masukkan nominal pembayaran yang valid");
      return;
    }

    if (amount > profile.total_hutang) {
      setPaymentError("Nominal pembayaran melebihi total hutang");
      return;
    }

    if (amount > profile.saldo) {
      setPaymentError("Saldo tidak cukup untuk pembayaran");
      return;
    }

    setProcessingPayment(true);

    try {
      const response = await fetch("/api/payment-hutang", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userType: role,
          userId: profile[config.profileIdField],
          amount,
          paymentMethod: "Saldo",
        }),
      });

      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.error || "Gagal melakukan pembayaran");
      }

      setPaymentSuccess("Pembayaran hutang berhasil!");
      setPaymentAmount("");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              saldo: result.newSaldo,
              total_hutang: result.newHutang,
            }
          : prev
      );

      await fetchSaldo();
    } catch (error) {
      console.error(error);
      setPaymentError(error.message || "Gagal melakukan pembayaran");
    } finally {
      setProcessingPayment(false);
    }
  }, [config.profileIdField, fetchSaldo, paymentAmount, profile, role]);

  useEffect(() => {
    if (!initialFetch) return;

    async function loadSaldo() {
      await fetchSaldo();
    }

    void loadSaldo();
  }, [fetchSaldo, initialFetch]);

  return {
    profile,
    historyItems,
    loading,
    errorMessage,
    paymentAmount,
    setPaymentAmount,
    processingPayment,
    paymentSuccess,
    paymentError,
    handlePaymentHutang,
    refresh: fetchSaldo,
    config,
    formatHistoryDescription,
  };
}
