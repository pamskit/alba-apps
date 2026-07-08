import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// POST - Confirm/Approve order by admin
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

    if (order.status_order === "Dikonfirmasi") {
      return Response.json(
        { error: "Order sudah dikonfirmasi sebelumnya" },
        { status: 400 }
      );
    }

    // Get order details
    const { data: details, error: detailError } = await supabase
      .from(detailTable)
      .select("*")
      .eq("order_id", orderId);

    if (detailError) {
      return Response.json(
        { error: "Gagal mengambil detail order" },
        { status: 500 }
      );
    }

    // Update stock for each product
    for (const detail of details) {
      const { data: produk } = await supabase
        .from("produk")
        .select("stok")
        .eq("id", detail.produk_id)
        .single();

      if (produk) {
        const newStok = produk.stok - detail.jumlah;
        await supabase
          .from("produk")
          .update({ stok: Math.max(0, newStok) })
          .eq("id", detail.produk_id);
      }
    }

    // Get user ID from order
    const userId = order[userId_column];

    // Update user data based on payment method
    if (order.metode_pembayaran === "Hutang") {
      // Add to total_hutang
      const { data: userData } = await supabase
        .from(tableUser)
        .select("total_hutang")
        .eq(userId_column, userId)
        .single();

      const newHutang =
        (userData?.total_hutang ?? 0) + order.total_harga;
      await supabase
        .from(tableUser)
        .update({ total_hutang: newHutang })
        .eq(userId_column, userId);

      // Log hutang transaction
      await supabase.from(saldoLogTable).insert({
        [userId_column]: userId,
        jumlah: order.total_harga,
        metode: "Order",
        tipe: "Hutang_Payment", // This will be used for tracking
        keterangan: `Order ${orderId} - hutang dikonfirmasi`,
      });
    }
    // For Saldo orders, saldo was already deducted when order was created
    // No additional saldo log update needed on confirm

    // Update order status
    const { error: updateError } = await supabase
      .from(orderTable)
      .update({ status_order: "Dikonfirmasi", status_pembayaran: "Lunas" })
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
        message: "Order berhasil dikonfirmasi",
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
