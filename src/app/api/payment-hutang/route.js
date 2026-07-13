import { createServerClient } from "@/utils/supabase-server";
import { jsonError, jsonSuccess } from "@/utils/api";

const supabase = createServerClient();

// POST - Payment hutang (by admin or by user using saldo)
export async function POST(req) {
  try {
    const {
      userType, // "siswa" atau "guru"
      userId, // nis atau nip
      amount, // nominal pembayaran
      paymentMethod, // "Admin" untuk pembayaran oleh admin, "Saldo" untuk pembayaran dari saldo sendiri
    } = await req.json();

    if (!userType || !userId || !amount || amount <= 0 || !paymentMethod) {
      return jsonError("Data tidak lengkap atau tidak valid", 400);
    }

    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";
    // unified saldo_log will be used for history

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from(tableUser)
      .select("total_hutang,saldo")
      .eq(userId_column, userId)
      .single();

    if (userError || !userData) {
      return jsonError("User tidak ditemukan", 404);
    }

    // Check if amount exceeds hutang
    if (amount > userData.total_hutang) {
      return jsonError("Nominal pembayaran melebihi total hutang", 400);
    }

    // Check if user has enough balance for "Saldo" method
    if (paymentMethod === "Saldo") {
      if (userData.saldo < amount) {
        return jsonError("Saldo tidak cukup untuk pembayaran hutang", 400);
      }
    }

    // Update hutang
    const newHutang = userData.total_hutang - amount;
    let updateObj = { total_hutang: newHutang };

    // If payment method is "Saldo", also deduct from saldo
    if (paymentMethod === "Saldo") {
      updateObj.saldo = userData.saldo - amount;
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
      [userId_column === "nis" ? "nis_siswa" : "nip_guru"]: userId,
      transaction_type: "hutang_payment",
      payment_method: paymentMethod,
      payment_status: "Lunas",
      amount_total: amount,
      amount_paid: amount,
      amount_due: 0,
      note: "Pembayaran hutang",
    });

    // Log to unified saldo_log
    await supabase.from("saldo_log").insert({
      customer_type: userType,
      [userId_column === "nis" ? "nis_siswa" : "nip_guru"]: userId,
      transaksi_id: trxId,
      log_type: "Hutang_Payment",
      amount: amount,
      balance_before: userData.saldo,
      balance_after: updateObj.saldo ?? userData.saldo,
      payment_method: paymentMethod,
      note: `Pembayaran hutang - ${paymentMethod === "Saldo" ? "dari saldo" : "oleh admin"}`,
    });

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
