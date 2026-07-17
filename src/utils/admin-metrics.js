export const DATE_FILTER_OPTIONS = {
   today: { key: "today", label: "Hari Ini" },
   week: { key: "week", label: "1 Minggu Terakhir" },
   month: { key: "month", label: "30 Hari Terakhir" },
   "1_week": { key: "1_week", label: "1 Minggu Terakhir" },
   "1_month": { key: "1_month", label: "30 Hari Terakhir" },
   "1_year": { key: "1_year", label: "1 Tahun Terakhir" },
};

export function getDateRangeByFilter(filterKey) {
   const now = new Date();
   const start = new Date(now);

   if (filterKey === "today") {
      start.setHours(0, 0, 0, 0);
   } else if (filterKey === "week" || filterKey === "1_week") {
      start.setDate(now.getDate() - 6);
      start.setHours(0, 0, 0, 0);
   } else if (filterKey === "month" || filterKey === "1_month") {
      start.setDate(now.getDate() - 29);
      start.setHours(0, 0, 0, 0);
   } else if (filterKey === "1_year") {
      start.setDate(now.getDate() - 364);
      start.setHours(0, 0, 0, 0);
   } else {
      start.setHours(0, 0, 0, 0);
   }

   return {
      start,
      end: now,
      startISO: start.toISOString(),
      endISO: now.toISOString(),
   };
}

export function calculateAdminMetrics({
   products = [],
   transactions = [],
   detailTransactions = [],
   ordersSiswa = [],
   detailOrdersSiswa = [],
   ordersGuru = [],
   detailOrdersGuru = [],
}) {
   const validTransactions = transactions.filter(
      (item) => item.payment_status === "Lunas" && item.transaction_type !== "hutang_payment"
   );
   const validOrdersSiswa = ordersSiswa.filter((item) => item.status_order === "Dikonfirmasi");
   const validOrdersGuru = ordersGuru.filter((item) => item.status_order === "Dikonfirmasi");

   const txIds = new Set(validTransactions.map((item) => item.id));
   const orderSiswaIds = new Set(validOrdersSiswa.map((item) => item.id));
   const orderGuruIds = new Set(validOrdersGuru.map((item) => item.id));

   const validDetailTransactions = detailTransactions.filter((item) => txIds.has(item.transaksi_id));
   const validDetailOrdersSiswa = detailOrdersSiswa.filter((item) => orderSiswaIds.has(item.order_id));
   const validDetailOrdersGuru = detailOrdersGuru.filter((item) => orderGuruIds.has(item.order_id));

   const productMap = new Map(products.map((item) => [item.id, item]));

   const salesRows = [
      ...validTransactions.map((item) => ({
         id: item.id,
         type: "Transaksi Kasir",
         created_at: item.created_at,
         pelanggan: item.nis_siswa || item.nip_guru || "-",
         metode: item.payment_method,
         status: item.payment_status,
         total: Number(item.amount_total || 0),
         source: "transaksi",
      })),
      ...validOrdersSiswa.map((item) => ({
         id: item.id,
         type: "Order Siswa",
         created_at: item.created_at,
         pelanggan: item.nis_siswa || "-",
         metode: item.metode_pembayaran,
         status: item.status_order,
         total: Number(item.total_harga || 0),
         source: "order_siswa",
      })),
      ...validOrdersGuru.map((item) => ({
         id: item.id,
         type: "Order Guru",
         created_at: item.created_at,
         pelanggan: item.nip_guru || "-",
         metode: item.metode_pembayaran,
         status: item.status_order,
         total: Number(item.total_harga || 0),
         source: "order_guru",
      })),
   ].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

   const productSalesMap = new Map();

   const addProductLine = (produkId, qtyRaw, revenueRaw) => {
      const product = productMap.get(produkId);
      if (!product) return;

      const qty = Number(qtyRaw || 0);
      if (!qty) return;

      const revenue = Number(revenueRaw || 0);
      const modal = qty * Number(product.harga_beli || 0);
      const laba = revenue - modal;

      const current = productSalesMap.get(produkId) ?? {
         id: product.id,
         name: product.nama_produk,
         qty: 0,
         revenue: 0,
         modal: 0,
         laba: 0,
         stock: Number(product.stok || 0),
      };

      current.qty += qty;
      current.revenue += revenue;
      current.modal += modal;
      current.laba += laba;
      productSalesMap.set(produkId, current);
   };

   validDetailTransactions.forEach((item) => {
      const product = productMap.get(item.produk_id);
      const qty = Number(item.jumlah || 0);
      const revenue = Number(item.sub_total || Number(item.harga_satuan || product?.harga_jual || 0) * qty);
      addProductLine(item.produk_id, qty, revenue);
   });

   validDetailOrdersSiswa.forEach((item) => {
      const product = productMap.get(item.produk_id);
      const qty = Number(item.jumlah || 0);
      const revenue = Number(item.harga_satuan || product?.harga_jual || 0) * qty;
      addProductLine(item.produk_id, qty, revenue);
   });

   validDetailOrdersGuru.forEach((item) => {
      const product = productMap.get(item.produk_id);
      const qty = Number(item.jumlah || 0);
      const revenue = Number(item.harga_satuan || product?.harga_jual || 0) * qty;
      addProductLine(item.produk_id, qty, revenue);
   });

   const productSalesRows = Array.from(productSalesMap.values()).sort((a, b) => b.qty - a.qty);

   const omzet = salesRows.reduce((sum, item) => sum + Number(item.total || 0), 0);
   const totalModal = productSalesRows.reduce((sum, item) => sum + Number(item.modal || 0), 0);
   const labaKotor = Math.max(0, productSalesRows.reduce((sum, item) => sum + Number(item.laba || 0), 0));
   const itemTerjual = productSalesRows.reduce((sum, item) => sum + Number(item.qty || 0), 0);
   const totalTransaksi = salesRows.length;

   const totalStok = products.reduce((sum, item) => sum + Number(item.stok || 0), 0);
   const stockValue = products.reduce(
      (sum, item) => sum + Number(item.stok || 0) * Number(item.harga_beli || 0),
      0
   );
   const outOfStockProducts = products.filter((item) => Number(item.stok || 0) <= 0);
   const lowStockProducts = products
      .filter((item) => Number(item.stok || 0) > 0 && Number(item.stok || 0) <= 5)
      .sort((a, b) => Number(a.stok || 0) - Number(b.stok || 0));

   const topProducts = productSalesRows.slice(0, 7);

   const latestActivity = salesRows.slice(0, 7).map((item) => ({
      id: item.id,
      type: item.type,
      label: `${item.type} • ${item.metode || "-"}`,
      created_at: item.created_at,
      amount: item.total,
      status: item.status,
   }));

   return {
      validTransactions,
      validOrdersSiswa,
      validOrdersGuru,
      validDetailTransactions,
      validDetailOrdersSiswa,
      validDetailOrdersGuru,
      salesRows,
      productSalesRows,
      omzet,
      itemTerjual,
      totalTransaksi,
      totalModal,
      labaKotor,
      totalStok,
      stockValue,
      outOfStockProducts,
      lowStockProducts,
      topProducts,
      latestActivity,
   };
}

export function buildSalesChartData(salesRows = [], period = "1_week") {
   const range = getDateRangeByFilter(period);
   const map = new Map();

   const toKey = (d) => {
      const date = new Date(d);
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, "0");
      const dd = String(date.getDate()).padStart(2, "0");
      if (period === "1_year") return `${y}-${m}`;
      return `${y}-${m}-${dd}`;
   };

   const toLabel = (key) => {
      if (period === "1_year") {
         const [y, m] = key.split("-");
         const date = new Date(Number(y), Number(m) - 1, 1);
         return date.toLocaleString("id-ID", { month: "short", year: "numeric" });
      }
      const date = new Date(key);
      return date.toLocaleDateString("id-ID", { day: "numeric", month: "short" });
   };

   const keys = [];
   if (period === "1_year") {
      const s = new Date(range.start.getFullYear(), range.start.getMonth(), 1);
      const e = new Date(range.end.getFullYear(), range.end.getMonth(), 1);
      while (s <= e) {
         keys.push(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}`);
         s.setMonth(s.getMonth() + 1);
      }
   } else {
      const s = new Date(range.start);
      const e = new Date(range.end);
      while (s <= e) {
         keys.push(`${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(s.getDate()).padStart(2, "0")}`);
         s.setDate(s.getDate() + 1);
      }
   }

   keys.forEach((key) => map.set(key, { key, label: toLabel(key), revenue: 0, count: 0 }));

   salesRows.forEach((entry) => {
      const createdAt = new Date(entry.created_at);
      if (createdAt < range.start || createdAt > range.end) return;
      const key = toKey(createdAt);
      const row = map.get(key);
      if (!row) return;
      row.revenue += Number(entry.total || 0);
      row.count += 1;
   });

   const data = Array.from(map.values());
   const windowSize = 7;
   for (let i = 0; i < data.length; i += 1) {
      const start = Math.max(0, i - (windowSize - 1));
      const slice = data.slice(start, i + 1);
      const sum = slice.reduce((acc, row) => acc + Number(row.revenue || 0), 0);
      data[i].ma = Math.round(sum / slice.length);
   }

   return data;
}
