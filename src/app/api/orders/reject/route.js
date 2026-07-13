import { createServerClient } from "@/utils/supabase-server";
import { jsonError, jsonSuccess } from "@/utils/api";

const supabase = createServerClient();

// POST - Reject order by admin
export async function POST(req) {
  try {
    const { orderId, userType } = await req.json(); // userType: "siswa" atau "guru"

    if (!orderId || !userType) {
      return jsonError("Data tidak lengkap", 400);
    }

    const orderTable = userType === "siswa" ? "order_siswa" : "order_guru";
    const detailTable =
      userType === "siswa" ? "detail_order_siswa" : "detail_order_guru";
    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";

    // Get order
    const { data: order, error: orderError } = await supabase
      .from(orderTable)
      .select("*")
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return jsonError("Order tidak ditemukan", 404);
    }

    if (order.status_order === "Ditolak") {
      return jsonError("Order sudah ditolak sebelumnya", 400);
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
      await supabase.from(tableUser).update({ saldo: newSaldo }).eq(userId_column, userId);

      // Log refund transaction in unified saldo_log
      await supabase.from("saldo_log").insert({
        customer_type: userType,
        [userId_column === "nis" ? "nis_siswa" : "nip_guru"]: userId,
        transaksi_id: null,
        log_type: "Refund",
        amount: order.total_harga,
        balance_before: userData?.saldo ?? 0,
        balance_after: newSaldo,
        payment_method: "Saldo",
        note: `Order ${orderId} - ditolak, saldo dikembalikan`,
      });
    }

    // Update order status
    const { error: updateError } = await supabase
      .from(orderTable)
      .update({ status_order: "Ditolak" })
      .eq("id", orderId);

    if (updateError) {
      console.error("Order update error:", updateError);
      return jsonError("Gagal update status order", 500);
    }

    return jsonSuccess({ message: "Order berhasil ditolak" }, 200);
  } catch (error) {
    console.error("API error:", error);
    return jsonError("Terjadi kesalahan server", 500);
  }
}
