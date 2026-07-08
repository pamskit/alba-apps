import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
      return Response.json(
        { error: "Data tidak lengkap atau tidak valid" },
        { status: 400 }
      );
    }

    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";
    const saldoLogTable =
      userType === "siswa" ? "topup_saldo" : "topup_saldo_guru";

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from(tableUser)
      .select("total_hutang,saldo")
      .eq(userId_column, userId)
      .single();

    if (userError || !userData) {
      return Response.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Check if amount exceeds hutang
    if (amount > userData.total_hutang) {
      return Response.json(
        { error: "Nominal pembayaran melebihi total hutang" },
        { status: 400 }
      );
    }

    // Check if user has enough balance for "Saldo" method
    if (paymentMethod === "Saldo") {
      if (userData.saldo < amount) {
        return Response.json(
          { error: "Saldo tidak cukup untuk pembayaran hutang" },
          { status: 400 }
        );
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
      return Response.json(
        { error: "Gagal update hutang" },
        { status: 500 }
      );
    }

    // Log transaction
    const { error: logError } = await supabase.from(saldoLogTable).insert({
      [userId_column]: userId,
      jumlah: amount,
      metode: paymentMethod,
      tipe: "Hutang_Payment",
      keterangan: `Pembayaran hutang - ${paymentMethod === "Saldo" ? "dari saldo" : "oleh admin"}`,
    });

    if (logError) {
      console.error("Log insertion error:", logError);
      // Don't fail if logging fails, as the transaction was already processed
    }

    return Response.json(
      {
        success: true,
        newHutang: newHutang,
        newSaldo: updateObj.saldo ?? userData.saldo,
        message: `Hutang berkurang Rp ${amount.toLocaleString("id-ID")}`,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
