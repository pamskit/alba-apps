import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";

const configByRole = {
  siswa: {
    profileTable: "siswa",
    profileKey: "nis",
    profileSelect: "nis,nama_siswa,kelas,saldo,total_hutang",
    orderTable: "order_siswa",
    orderSelect: "id,created_at,total_harga,metode_pembayaran,status_order,status_pembayaran",
    orderFilterField: "nis_siswa",
    historyFilterField: "nis_siswa",
    transactionOwnerField: "nis_siswa",
    topupOwnerField: "nis_siswa",
    customerType: "siswa",
  },
  guru: {
    profileTable: "guru",
    profileKey: "nip",
    profileSelect: "nip,nama_guru,bidang_studi,saldo,total_hutang",
    orderTable: "order_guru",
    orderSelect: "id,created_at,total_harga,metode_pembayaran,status_order,status_pembayaran",
    orderFilterField: "nip_guru",
    historyFilterField: "nip_guru",
    transactionOwnerField: "nip_guru",
    topupOwnerField: "nip_guru",
    customerType: "guru",
  },
};

export function useHutang({ role, initialFetch = true } = {}) {
  const [profile, setProfile] = useState(null);
  const [history, setHistory] = useState([]);
  const [paymentAmount, setPaymentAmount] = useState("");
  const [loading, setLoading] = useState(initialFetch);
  const [error, setError] = useState(null);
  const [processingPayment, setProcessingPayment] = useState(false);
  const [paymentError, setPaymentError] = useState("");
  const [paymentSuccess, setPaymentSuccess] = useState("");

  const config = configByRole[role];
  const supabase = createClient();

  const fetchHutang = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!config) {
        throw new Error(`Invalid role for hutang hook: ${role}`);
      }

      const session = getRoleSession(role);
      const roleId = session?.[config.profileKey] ?? null;
      if (!roleId) {
        setProfile(null);
        setHistory([]);
        setPaymentAmount("");
        return;
      }

      const { data: profileData, error: profileError } = await supabase
        .from(config.profileTable)
        .select(config.profileSelect)
        .eq(config.profileKey, roleId)
        .maybeSingle();

      if (profileError) throw profileError;
      const activeProfile = profileData ?? null;
      setProfile(activeProfile);
      setPaymentAmount(activeProfile?.total_hutang ?? "");

      if (!activeProfile) {
        setHistory([]);
        return;
      }

      const [historyResult, pendingOrdersResult] = await Promise.all([
        // Read unified transaksi schema. Only debt-related records should appear in hutang history.
        supabase
          .from("transaksi")
          .select("id,created_at,transaction_type,payment_method,payment_status,order_status,amount_total,amount_paid,amount_due,customer_type")
          .eq(config.historyFilterField, roleId)
          .or("transaction_type.eq.hutang_payment,payment_method.eq.Hutang")
          .order("created_at", { ascending: false }),
        // Keep fetching legacy order table to preserve order flow until backend is fully migrated
        supabase
          .from(config.orderTable)
          .select(config.orderSelect)
          .eq(config.orderFilterField, roleId)
          .eq("metode_pembayaran", "Hutang")
          .order("created_at", { ascending: false }),
      ]);

      if (historyResult.error) throw historyResult.error;
      if (pendingOrdersResult.error) throw pendingOrdersResult.error;

      const combined = [
        ...(historyResult.data ?? []).map((item) => ({
          id: item.id,
          created_at: item.created_at,
          transaction_type: item.transaction_type,
          metode_pembayaran: item.payment_method,
          payment_method: item.payment_method,
          payment_status: item.payment_status,
          status_pembayaran: item.payment_status ?? item.status_pembayaran,
          status_order: item.order_status,
          total_harga: item.amount_total ?? item.total_harga ?? 0,
          amount_total: item.amount_total ?? item.total_harga ?? 0,
          source: "transaksi",
        })),
        ...(pendingOrdersResult.data ?? []).map((item) => ({
          ...item,
          status_pembayaran: item.status_pembayaran ?? item.status_order,
          status_order: item.status_order,
          source: "order",
        })),
      ]
        .filter((item) =>
          item.source === "order" ||
          item.transaction_type === "hutang_payment" ||
          item.metode_pembayaran === "Hutang"
        );

      const deduped = [];
      const seenIds = new Set();
      const sorted = combined.sort((a, b) => {
        if (a.id === b.id && a.source !== b.source) {
          return a.source === "order" ? -1 : 1;
        }
        return new Date(b.created_at) - new Date(a.created_at);
      });

      for (const item of sorted) {
        if (seenIds.has(item.id)) continue;
        seenIds.add(item.id);
        deduped.push(item);
      }

      setHistory(deduped);
    } catch (err) {
      console.error(err);
      setError(err);
      setProfile(null);
      setHistory([]);
      setPaymentAmount("");
    } finally {
      setLoading(false);
    }
  }, [config, role, supabase]);

  const handlePayHutang = useCallback(async () => {
    setPaymentError("");
    setPaymentSuccess("");

    if (!config || !profile) return;

    const amount = Number(paymentAmount);
    if (!amount || amount <= 0) {
      setPaymentError("Masukkan nominal pembayaran yang valid.");
      return;
    }

    if (amount > Number(profile.total_hutang ?? 0)) {
      setPaymentError("Nominal pembayaran melebihi total hutang.");
      return;
    }

    if (amount > Number(profile.saldo ?? 0)) {
      setPaymentError("Saldo tidak cukup untuk pembayaran.");
      return;
    }

    setProcessingPayment(true);
    try {
      const newSaldo = Number(profile.saldo ?? 0) - amount;
      const newHutang = Math.max(0, Number(profile.total_hutang ?? 0) - amount);

      const { error: updateError } = await supabase
        .from(config.profileTable)
        .update({ saldo: newSaldo, total_hutang: newHutang })
        .eq(config.profileKey, profile[config.profileKey]);

      if (updateError) throw updateError;

      const trxId = `trx_${Date.now()}`;
      const transactionRow = {
        id: trxId,
        customer_type: config.customerType,
        [config.transactionOwnerField]: profile[config.profileKey],
        transaction_type: "hutang_payment",
        payment_method: "Saldo",
        payment_status: newHutang === 0 ? "Lunas" : "Belum Lunas",
        amount_total: amount,
        amount_paid: amount,
        amount_due: 0,
        note: "Pelunasan hutang dari saldo",
      };

      const { error: insertError } = await supabase.from("transaksi").insert(transactionRow);
      if (insertError) throw insertError;

      const { error: logError } = await supabase.from("saldo_log").insert({
        customer_type: config.customerType,
        [config.transactionOwnerField]: profile[config.profileKey],
        transaksi_id: trxId,
        log_type: "Hutang_Payment",
        amount: -amount,
        balance_before: Number(profile.saldo ?? 0),
        balance_after: newSaldo,
        payment_method: "Saldo",
        note: "Pelunasan hutang dari saldo",
      });
      if (logError) throw logError;

      setPaymentSuccess("Pembayaran hutang berhasil.");
      setPaymentAmount("");
      setProfile((prev) =>
        prev
          ? {
              ...prev,
              saldo: newSaldo,
              total_hutang: newHutang,
            }
          : prev
      );
      await fetchHutang();
    } catch (err) {
      console.error(err);
      setPaymentError(err?.message ?? "Gagal memproses pembayaran hutang.");
    } finally {
      setProcessingPayment(false);
    }
  }, [config, fetchHutang, paymentAmount, profile, supabase]);

  useEffect(() => {
    if (!initialFetch) return;

    async function loadHutang() {
      await fetchHutang();
    }

    void loadHutang();
  }, [fetchHutang, initialFetch]);

  return {
    profile,
    history,
    paymentAmount,
    setPaymentAmount,
    loading,
    error,
    refresh: fetchHutang,
    processingPayment,
    paymentError,
    paymentSuccess,
    handlePayHutang,
    setProfile,
  };
}
