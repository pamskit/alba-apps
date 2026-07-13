import "./globals.css";
import "./auth.css";
import "./(admin)/admin-layout.css";
import "./(admin)/kasir/kasir.css";
import "./(admin)/hutang/hutang.css";
import "./(admin)/laporan/laporan.css";
import "@/app/shared/dashboard.css";
import "@/app/shared/saldo.css";
import "@/app/shared/hutang.css";
import { Toaster } from "react-hot-toast";

export const metadata = {
  title: "Koperasi Sekolah Digital",
  description: "Aplikasi Pencatatan Transaksi Koperasi Sekolah",
};

export default function RootLayout({ children }) {
  return (
    <html lang="id">
      <body>
        {children}
        <Toaster />
      </body>
    </html>
  );
}