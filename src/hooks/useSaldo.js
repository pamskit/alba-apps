import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/utils/supabase";
import { getRoleSession } from "@/utils/auth";
import { formatHistoryDescription, mapSaldoHistoryRow, saldoRoleConfig } from "@/utils/saldo";

export function useSaldo({ role, initialFetch = true } = {}) {
  const [profile, setProfile] = useState(null);
  const [historyItems, setHistoryItems] = useState([]);
  const [loading, setLoading] = useState(initialFetch);
  const [errorMessage, setErrorMessage] = useState("");

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
        ...(historyData ?? [])
          .filter((row) => !(row.log_type === "Hutang_Payment" && row.payment_method === "Hutang"))
          .map((row) => ({ ...row, __historySource: "saldo_log" })),
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
    refresh: fetchSaldo,
    config,
    formatHistoryDescription,
  };
}
