import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// POST - Reject order by admin
export async function POST(req) {
  try {
    const { orderId, userType } = await req.json(); // userType: "siswa" atau "guru"

    if (!orderId || !userType) {
      return Response.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
    }

    const orderTable = userType === "siswa" ? "order_siswa" : "order_guru";
    const detailTable =
      userType === "siswa" ? "detail_order_siswa" : "detail_order_guru";
    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";
    const saldoLogTable =
      userType === "siswa" ? "topup_saldo" : "topup_saldo_guru";

    // Get order
    const { data: order, error: orderError } = await supabase
      .from(orderTable)
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return Response.json(
        { error: "Order tidak ditemukan" },
        { status: 404 }
      );
    }

    if (order.status_order === "Ditolak") {
      return Response.json(
        { error: "Order sudah ditolak sebelumnya" },
        { status: 400 }
      );
    }

    const userId = order[userId_column];

    // If payment method was "Saldo", refund the balance
    if (order.metode_pembayaran === "Saldo") {
      const { data: userData } = await supabase
        .from(tableUser)
        .select("saldo")
        .eq(userId_column, userId)
        .single();

      const newSaldo = (userData?.saldo ?? 0) + order.total_harga;
      await supabase
        .from(tableUser)
        .update({ saldo: newSaldo })
        .eq(userId_column, userId);

      // Log refund transaction
      await supabase.from(saldoLogTable).insert({
        [userId_column]: userId,
        jumlah: order.total_harga,
        metode: "Order",
        tipe: "Refund",
        keterangan: `Order ${orderId} - ditolak, saldo dikembalikan`,
      });
    }

    // Update order status
    const { error: updateError } = await supabase
      .from(orderTable)
      .update({ status_order: "Ditolak" })
      .eq("id", orderId);

    if (updateError) {
      console.error("Order update error:", updateError);
      return Response.json(
        { error: "Gagal update status order" },
        { status: 500 }
      );
    }

    return Response.json(
      {
        success: true,
        message: "Order berhasil ditolak",
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
