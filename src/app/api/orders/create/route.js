import { createServerClient } from "@/utils/supabase-server";
import { jsonError, jsonSuccess } from "@/utils/api";

const supabase = createServerClient();

// POST - Create order (self-service: siswa atau guru membeli dengan saldo/hutang)
export async function POST(req) {
  try {
    const {
      userType, // "siswa" atau "guru"
      userId, // nis atau nip
      items, // [{ produk_id, jumlah }]
      metode_pembayaran, // "Saldo" atau "Hutang"
    } = await req.json();

    if (
      !userType ||
      !userId ||
      !items ||
      items.length === 0 ||
      !metode_pembayaran
    ) {
      return jsonError("Data tidak lengkap", 400);
    }

    const tableUser = userType === "siswa" ? "siswa" : "guru";
    const userId_column = userType === "siswa" ? "nis" : "nip";
    const orderTable = userType === "siswa" ? "order_siswa" : "order_guru";
    const detailTable =
      userType === "siswa" ? "detail_order_siswa" : "detail_order_guru";

    // Get user data
    const { data: userData, error: userError } = await supabase
      .from(tableUser)
      .select("*")
      .eq(userId_column, userId)
      .single();

    if (userError || !userData) {
      return jsonError("User tidak ditemukan", 404);
    }

    // Get product data and calculate total
    let totalHarga = 0;
    const detailData = [];

    for (const item of items) {
      const { data: produk, error: prodError } = await supabase
        .from("produk")
        .select("*")
        .eq("id", item.produk_id)
        .single();

      if (prodError || !produk) {
        return jsonError(`Produk ${item.produk_id} tidak ditemukan`, 404);
      }

      if (produk.stok < item.jumlah) {
        return jsonError(`Stok ${produk.nama_produk} tidak cukup`, 400);
      }

      const hargaJual = Number(produk.harga_jual ?? produk.harga_beli ?? 0);
      totalHarga += hargaJual * item.jumlah;
      detailData.push({
        produk_id: item.produk_id,
        jumlah: item.jumlah,
        harga_satuan: hargaJual,
      });
    }

    // Check if user has enough balance for "Saldo" method
    if (metode_pembayaran === "Saldo") {
      if (userData.saldo < totalHarga) {
        return jsonError("Saldo tidak cukup", 400);
      }
    }

    // Create order
    const orderId = `order_${userType}_${Date.now()}`;
    const { error: orderError } = await supabase.from(orderTable).insert({
      id: orderId,
      [userId_column]: userId,
      total_harga: totalHarga,
      metode_pembayaran: metode_pembayaran,
      status_order: "Menunggu",
      status_pembayaran: "Belum Lunas",
    });

    if (orderError) {
      console.error("Order creation error:", orderError);
      return jsonError("Gagal membuat order", 500);
    }

    // Insert order details
    const detailsToInsert = detailData.map((d) => ({
      order_id: orderId,
      ...d,
    }));

    const { error: detailError } = await supabase
      .from(detailTable)
      .insert(detailsToInsert);

    if (detailError) {
      console.error("Detail insertion error:", detailError);
      return jsonError("Gagal menambah detail order", 500);
    }

    // Deduct balance if payment method is "Saldo"
    if (metode_pembayaran === "Saldo") {
      const newSaldo = userData.saldo - totalHarga;
      const { error: updateError } = await supabase
        .from(tableUser)
        .update({ saldo: newSaldo })
        .eq(userId_column, userId);

      if (updateError) {
        console.error("Balance update error:", updateError);
        return jsonError("Gagal update saldo", 500);
      }

      // Log saldo transaction
      const saldoLogTable = userType === "siswa" ? "topup_saldo" : "topup_saldo_guru";
      await supabase.from(saldoLogTable).insert({
        [userId_column]: userId,
        jumlah: totalHarga,
        metode: "Order",
        tipe: "Order_Saldo",
        keterangan: `Order ${orderId} - menunggu konfirmasi`,
      });
    } else if (metode_pembayaran === "Hutang") {
      // Add to pending hutang (will be updated after admin confirmation)
      // We don't update total_hutang yet, just log the pending order
    }

    return jsonSuccess({
      orderId: orderId,
      totalHarga: totalHarga,
      message: "Order berhasil dibuat, menunggu konfirmasi admin",
    }, 201);
  } catch (error) {
    console.error("API error:", error);
    return jsonError("Terjadi kesalahan server", 500);
  }
}
