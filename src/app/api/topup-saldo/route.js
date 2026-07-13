import { createServerClient } from "@/utils/supabase-server";
import { jsonError, jsonSuccess } from "@/utils/api";

const supabase = createServerClient();

// POST - Top-up balance by admin
export async function POST(req) {
  try {
    const { userType, userId, amount, metode, note } = await req.json();
    // userType: "siswa" atau "guru"
    // amount: nominal topup (dalam rupiah)
    // metode: "Transfer", "Cash", dll

    if (!userType || !userId || !amount || amount <= 0) {
      return jsonError("Data tidak lengkap atau tidak valid", 400);
    }

    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";
    const amountValue = Number(amount);

    if (!Number.isFinite(amountValue) || amountValue <= 0) {
      return jsonError("Nominal top-up tidak valid", 400);
    }

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from(tableUser)
      .select("saldo")
      .eq(userId_column, Number(userId))
      .single();

    if (userError || !userData) {
      return jsonError("User tidak ditemukan", 404);
    }

    // Update saldo
    const currentSaldo = Number(userData.saldo ?? 0);
    const newSaldo = currentSaldo + amountValue;
    const { error: updateError } = await supabase
      .from(tableUser)
      .update({ saldo: newSaldo })
      .eq(userId_column, Number(userId));

    if (updateError) {
      console.error("Saldo update error:", updateError);
      return jsonError("Gagal update saldo", 500);
    }

    // Log transaction in unified saldo_log
    const { error: logError } = await supabase.from("saldo_log").insert({
      customer_type: userType,
      [userId_column === "nis" ? "nis_siswa" : "nip_guru"]: Number(userId),
      transaksi_id: null,
      log_type: "Top-up",
      amount: amountValue,
      balance_before: currentSaldo,
      balance_after: newSaldo,
      payment_method: metode || "Admin",
      note: note || `Top-up saldo - admin`,
    });

    if (logError) {
      console.error("Log insertion error:", logError);
      return jsonError("Gagal mencatat transaksi", 500);
    }

    return jsonSuccess({
      newSaldo: newSaldo,
      message: `Saldo berhasil ditambah Rp ${amount.toLocaleString("id-ID")}`,
    }, 200);
  } catch (error) {
    console.error("API error:", error);
    return jsonError("Terjadi kesalahan server", 500);
  }
}
