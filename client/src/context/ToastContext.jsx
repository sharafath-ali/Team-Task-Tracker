import toast, { Toaster } from "react-hot-toast";

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        position="top-right"
        reverseOrder={false}
        toastOptions={{
          style: {
            background: "#ffffff",
            color: "#0f172a",
            boxShadow: "0 10px 25px -5px rgba(0,0,0,0.08), 0 8px 16px -6px rgba(0,0,0,0.05), 0 0 1px 0 rgba(0,0,0,0.1)",
            borderRadius: "6px",
            fontSize: "0.875rem",
            fontWeight: "500",
            border: "1px solid #e2e8f0",
            padding: "12px 16px",
          },
          success: {
            iconTheme: {
              primary: "var(--success)",
              secondary: "#ffffff",
            },
          },
          error: {
            iconTheme: {
              primary: "var(--danger)",
              secondary: "#ffffff",
            },
          },
        }}
      />
    </>
  );
}

export function useToast() {
  return {
    success: (msg) => toast.success(msg),
    error: (msg) => toast.error(msg),
    info: (msg) => toast(msg),
    warning: (msg) => toast(msg, { icon: "⚠️" }),
  };
}
