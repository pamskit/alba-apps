import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// POST - Top-up balance by admin
export async function POST(req) {
  try {
    const { userType, userId, amount, metode } = await req.json();
    // userType: "siswa" atau "guru"
    // amount: nominal topup (dalam rupiah)
    // metode: "Transfer", "Cash", dll

    if (!userType || !userId || !amount || amount <= 0) {
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
      .select("saldo")
      .eq(userId_column, userId)
      .single();

    if (userError || !userData) {
      return Response.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
    }

    // Update saldo
    const newSaldo = userData.saldo + amount;
    const { error: updateError } = await supabase
      .from(tableUser)
      .update({ saldo: newSaldo })
      .eq(userId_column, userId);

    if (updateError) {
      console.error("Saldo update error:", updateError);
      return Response.json(
        { error: "Gagal update saldo" },
        { status: 500 }
      );
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
      return Response.json(
        { error: "Gagal mencatat transaksi" },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        newSaldo: newSaldo,
        message: `Saldo berhasil ditambah Rp ${amount.toLocaleString("id-ID")}`,
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
