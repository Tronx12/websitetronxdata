// components/auth/AuthButton.tsx
"use client";

type Props = {
  children: React.ReactNode;
  type?: "button" | "submit";
  loading?: boolean;
  variant?: "primary" | "ghost";
  onClick?: () => void;
  disabled?: boolean;
  fullWidth?: boolean;
};

export default function AuthButton({
  children,
  type = "button",
  loading,
  variant = "primary",
  onClick,
  disabled,
  fullWidth = true,
}: Props) {
  return (
    <button
      type={type}
      className={`button auth-btn ${variant === "ghost" ? "button-ghost" : ""} ${
        fullWidth ? "w-full" : ""
      }`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? (
        <span className="btn-spinner" aria-hidden="true" />
      ) : (
        children
      )}
    </button>
  );
}