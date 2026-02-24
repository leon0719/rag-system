import type { JSXElement } from "solid-js";

interface AuthLayoutProps {
  children: JSXElement;
}

export function AuthLayout(props: AuthLayoutProps) {
  return (
    <div class="auth-gradient-bg relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-8">
      <div class="auth-orb auth-orb-1" aria-hidden="true" />
      <div class="auth-orb auth-orb-2" aria-hidden="true" />
      <div class="auth-orb auth-orb-3" aria-hidden="true" />
      <div class="auth-orb auth-orb-4" aria-hidden="true" />
      <div class="auth-orb auth-orb-5" aria-hidden="true" />
      <div class="relative z-10 w-full max-w-md">{props.children}</div>
    </div>
  );
}
