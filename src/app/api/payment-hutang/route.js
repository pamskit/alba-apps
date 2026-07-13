import { createServerClient } from "@/utils/supabase-server";
import { jsonError, jsonSuccess } from "@/utils/api";

const supabase = createServerClient();

// POST - Payment hutang (by admin or by user using saldo)
export async function POST(req) {
  try {
    const {
      userType, // "siswa" atau "guru"
      userId, // nis atau nip
      amount,
      paymentMethod, // "Admin" untuk pembayaran oleh admin, "Saldo" untuk pembayaran dari saldo sendiri
    } = await req.json();

    const amountValue = Number(amount);
    if (!userType || !userId || !Number.isFinite(amountValue) || amountValue <= 0 || !paymentMethod) {
      return jsonError("Data tidak lengkap atau tidak valid", 400);
    }

    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";
    // unified saldo_log will be used for history

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from(tableUser)
      .select("total_hutang,saldo")
      .eq(userId_column, Number(userId))
      .single();

    if (userError || !userData) {
      return jsonError("User tidak ditemukan", 404);
    }

    // Check if amount exceeds hutang
    if (amountValue > userData.total_hutang) {
      return jsonError("Nominal pembayaran melebihi total hutang", 400);
    }

    // Check if user has enough balance for "Saldo" method
    if (paymentMethod === "Saldo") {
      if (Number(userData.saldo ?? 0) < amountValue) {
        return jsonError("Saldo tidak cukup untuk pembayaran hutang", 400);
      }
    }

    // Update hutang
    const newHutang = Number(userData.total_hutang ?? 0) - amountValue;
    let updateObj = { total_hutang: newHutang };

    // If payment method is "Saldo", also deduct from saldo
    if (paymentMethod === "Saldo") {
      updateObj.saldo = Number(userData.saldo ?? 0) - amountValue;
    }

    const { error: updateError } = await supabase
      .from(tableUser)
      .update(updateObj)
      .eq(userId_column, userId);

    if (updateError) {
      console.error("Hutang update error:", updateError);
      return jsonError("Gagal update hutang", 500);
    }

    // Create transaksi row for hutang payment
    const trxId = `trx_hutang_${Date.now()}`;
    await supabase.from("transaksi").insert({
      id: trxId,
      customer_type: userType,
      [userId_column === "nis" ? "nis_siswa" : "nip_guru"]: Number(userId),
      transaction_type: "hutang_payment",
      payment_method: paymentMethod,
      payment_status: newHutang === 0 ? "Lunas" : "Belum Lunas",
      amount_total: amountValue,
      amount_paid: amountValue,
      amount_due: 0,
      note: "Pembayaran hutang",
    });

    if (paymentMethod === "Saldo") {
      await supabase.from("saldo_log").insert({
        customer_type: userType,
        [userId_column === "nis" ? "nis_siswa" : "nip_guru"]: Number(userId),
        transaksi_id: trxId,
        log_type: "Hutang_Payment",
        amount: -amountValue,
        balance_before: Number(userData.saldo ?? 0),
        balance_after: updateObj.saldo,
        payment_method: paymentMethod,
        note: "Pelunasan hutang dari saldo",
      });
    }

    return jsonSuccess({
      newHutang: newHutang,
      newSaldo: updateObj.saldo ?? userData.saldo,
      message: `Hutang berkurang Rp ${amount.toLocaleString("id-ID")}`,
    }, 200);
  } catch (error) {
    console.error("API error:", error);
    return jsonError("Terjadi kesalahan server", 500);
  }
}
