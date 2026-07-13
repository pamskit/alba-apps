export function getHutangLabel(item) {
  if (item.source === "order") {
    if (item.status_order === "Menunggu") return "Hutang Pending";
    if (item.status_order === "Dikonfirmasi") return "Hutang Dikonfirmasi";
    if (item.status_order === "Ditolak") return "Hutang Ditolak";
    return "Ajukan Hutang";
  }
  // normalize for unified transaksi fields
  const method = item.payment_method ?? item.metode_pembayaran;
  const status = item.payment_status ?? item.status_pembayaran;
  const txType = item.transaction_type ?? item.tipe;

  if (method === "Hutang" || txType === "order") {
    return status === "Ditolak" ? "Hutang Ditolak" : "Hutang Dikonfirmasi";
  }

  if (method === "Pelunasan" || txType === "hutang_payment") {
    return "Bayar Hutang";
  }

  return method ?? "-";
}

export function getHutangStatusClass(item) {
  if (item.source === "order") {
    if (item.status_order === "Menunggu") return "status-pending";
    if (item.status_order === "Dikonfirmasi") return "status-confirmed";
    if (item.status_order === "Ditolak") return "status-rejected";
  } else {
    const status = item.payment_status ?? item.status_pembayaran ?? item.status_order;
    if (status === "Ditolak") return "status-rejected";
    if (status === "Belum Lunas") return "status-unpaid";
    return "status-confirmed";
  }

  return "";
}
