export const saldoRoleConfig = {
  siswa: {
    profileTable: "siswa",
    profileIdField: "nis",
    profileSelect: "nis,nama_siswa,kelas,saldo,total_hutang",
    historyTable: "saldo_log",
    historyFilterField: "nis_siswa",
    legacyHistoryTable: "topup_saldo",
    legacyHistorySelect: "id,created_at,tipe,metode,jumlah,keterangan,nis_siswa",
    metaLabel: "NIS",
    notFoundText: "Siswa tidak ditemukan.",
  },
  guru: {
    profileTable: "guru",
    profileIdField: "nip",
    profileSelect: "nip,nama_guru,bidang_studi,saldo,total_hutang",
    historyTable: "saldo_log",
    historyFilterField: "nip_guru",
    legacyHistoryTable: "topup_saldo_guru",
    legacyHistorySelect: "id,created_at,tipe,metode,jumlah,keterangan,nip_guru",
    metaLabel: "NIP",
    notFoundText: "Guru tidak ditemukan.",
  },
};

export function mapSaldoHistoryRow(item) {
  const amount = Number(item.amount ?? item.jumlah ?? 0);
  const isIncoming = amount > 0;
  return {
    id: `saldo_${item.__historySource || "unknown"}_${item.id}`,
    created_at: item.created_at,
    amount: amount,
    type: isIncoming ? "Saldo Masuk" : "Saldo Keluar",
    method: item.payment_method || item.metode,
    tipe: item.log_type || item.tipe,
    description: item.note || item.keterangan || "",
    balance_before: Number(item.balance_before ?? 0),
    balance_after: Number(item.balance_after ?? 0),
    transaksi_id: item.transaksi_id || null,
  };
}

export function formatHistoryDescription(item) {
  if (item.type === "Saldo Masuk") {
    if (item.tipe === "Refund") return "Refund - Saldo dikembalikan karena order ditolak";
    if (item.tipe === "Hutang_Payment") return "Pembayaran hutang masuk";
    const baseText = item.method ? `Top-up saldo via ${item.method}` : "Saldo masuk";
    return item.description && item.description.trim() ? `${baseText} • ${item.description}` : baseText;
  }

  if (item.type === "Saldo Keluar") {
    if (item.tipe === "Order_Saldo") return "Pembelian produk menggunakan saldo";
    if (item.tipe === "Hutang_Payment") return "Pelunasan hutang dari saldo";
    if (item.method === "Pembayaran Saldo") return "Pembayaran belanja menggunakan saldo";
    if (item.method === "Pembayaran Hutang") return "Pelunasan hutang dari saldo";
    return item.description || item.method || "Pengeluaran saldo";
  }

  return item.description || item.method || "-";
}
