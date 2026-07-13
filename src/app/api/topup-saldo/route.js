import { createServerClient } from "@/utils/supabase-server";
import { jsonError, jsonSuccess } from "@/utils/api";

const supabase = createServerClient();

// POST - Top-up balance by admin
export async function POST(req) {
  try {
    const { userType, userId, amount, metode } = await req.json();
    // userType: "siswa" atau "guru"
    // amount: nominal topup (dalam rupiah)
    // metode: "Transfer", "Cash", dll

    if (!userType || !userId || !amount || amount <= 0) {
      return jsonError("Data tidak lengkap atau tidak valid", 400);
    }

    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";
    const saldoLogTable =
      userType === "siswa" ? "topup_saldo" : "topup_saldo_guru";

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from(tableUser)
      .select("saldo")
      .eq(userId_column, userId)
      .single();

    if (userError || !userData) {
      return jsonError("User tidak ditemukan", 404);
    }

    // Update saldo
    const newSaldo = userData.saldo + amount;
    const { error: updateError } = await supabase
      .from(tableUser)
      .update({ saldo: newSaldo })
      .eq(userId_column, userId);

    if (updateError) {
      console.error("Saldo update error:", updateError);
      return jsonError("Gagal update saldo", 500);
    }

    // Log transaction
    const { error: logError } = await supabase.from(saldoLogTable).insert({
      [userId_column]: userId,
      jumlah: amount,
      metode: metode || "Admin",
      tipe: "Top-up",
      keterangan: `Top-up saldo - admin`,
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
