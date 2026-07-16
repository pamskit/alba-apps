"use client";

import { Toaster } from "react-hot-toast";

export default function ToastProvider() {
   return (
      <Toaster
         position="top-right"
         gutter={10}
         containerStyle={{ top: 20, right: 20 }}
         toastOptions={{
            duration: 2600,
            style: {
               background: "#ffffff",
               color: "#0f172a",
               border: "1px solid #dbe3ee",
               borderRadius: "12px",
               boxShadow: "0 12px 28px rgba(15, 23, 42, 0.12)",
               padding: "10px 12px",
               fontSize: "0.92rem",
               fontWeight: 600,
            },
            success: {
               duration: 2200,
               iconTheme: {
                  primary: "#0f9f8d",
                  secondary: "#ffffff",
               },
            },
            error: {
               duration: 3200,
               iconTheme: {
                  primary: "#dc2626",
                  secondary: "#ffffff",
               },
            },
         }}
      />
   );
}
