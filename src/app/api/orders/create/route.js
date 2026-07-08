import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

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
      return Response.json(
        { error: "Data tidak lengkap" },
        { status: 400 }
      );
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
      return Response.json(
        { error: "User tidak ditemukan" },
        { status: 404 }
      );
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
        return Response.json(
          { error: `Produk ${item.produk_id} tidak ditemukan` },
          { status: 404 }
        );
      }

      if (produk.stok < item.jumlah) {
        return Response.json(
          { error: `Stok ${produk.nama_produk} tidak cukup` },
          { status: 400 }
        );
      }

      totalHarga += produk.harga * item.jumlah;
      detailData.push({
        produk_id: item.produk_id,
        jumlah: item.jumlah,
        harga_satuan: produk.harga,
      });
    }

    // Check if user has enough balance for "Saldo" method
    if (metode_pembayaran === "Saldo") {
      if (userData.saldo < totalHarga) {
        return Response.json(
          { error: "Saldo tidak cukup" },
          { status: 400 }
        );
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
      return Response.json(
        { error: "Gagal membuat order" },
        { status: 500 }
      );
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
      return Response.json(
        { error: "Gagal menambah detail order" },
        { status: 500 }
      );
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
        return Response.json(
          { error: "Gagal update saldo" },
          { status: 500 }
        );
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

    return Response.json(
      {
        success: true,
        orderId: orderId,
        totalHarga: totalHarga,
        message: "Order berhasil dibuat, menunggu konfirmasi admin",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("API error:", error);
    return Response.json(
      { error: "Terjadi kesalahan server" },
      { status: 500 }
    );
  }
}
