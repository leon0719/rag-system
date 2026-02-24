import { createForm } from "@tanstack/solid-form";
import { createFileRoute, Link, useNavigate } from "@tanstack/solid-router";
import { createSignal, Show } from "solid-js";
import { Button } from "~/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import {
  TextFieldErrorMessage,
  TextFieldInput,
  TextFieldLabel,
  TextFieldRoot,
} from "~/components/ui/text-field";
import { useAuth } from "~/contexts/auth";
import { ApiClientError } from "~/lib/api";
import { registerSchema } from "~/lib/schemas";

export const Route = createFileRoute("/register")({
  component: RegisterPage,
});

function RegisterPage() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [serverError, setServerError] = createSignal("");

  if (auth.state.isAuthenticated) {
    navigate({ to: "/chat" });
  }

  const form = createForm(() => ({
    defaultValues: { email: "", username: "", password: "", confirmPassword: "" },
    validators: {
      onChange: registerSchema,
    },
    onSubmit: async ({ value }) => {
      setServerError("");
      try {
        await auth.register({
          email: value.email,
          username: value.username,
          password: value.password,
        });
        navigate({ to: "/login" });
      } catch (err) {
        if (err instanceof ApiClientError) {
          setServerError(err.detail);
        } else {
          setServerError("An unexpected error occurred");
        }
      }
    },
  }));

  return (
    <div class="flex min-h-screen items-center justify-center px-4 py-8">
      <Card class="w-full max-w-md">
        <CardHeader class="text-center">
          <CardTitle class="text-2xl">Create Account</CardTitle>
          <CardDescription>Sign up to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              form.handleSubmit();
            }}
            class="space-y-4"
          >
            <Show when={serverError()}>
              <div class="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
                {serverError()}
              </div>
            </Show>

            <form.Field name="email">
              {(field) => (
                <TextFieldRoot>
                  <TextFieldLabel>Email</TextFieldLabel>
                  <TextFieldInput
                    type="email"
                    placeholder="you@example.com"
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                    onBlur={() => field().handleBlur()}
                  />
                  <Show when={field().state.meta.errors.length > 0}>
                    <TextFieldErrorMessage>
                      {field().state.meta.errors[0]?.message}
                    </TextFieldErrorMessage>
                  </Show>
                </TextFieldRoot>
              )}
            </form.Field>

            <form.Field name="username">
              {(field) => (
                <TextFieldRoot>
                  <TextFieldLabel>Username</TextFieldLabel>
                  <TextFieldInput
                    type="text"
                    placeholder="Choose a username"
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                    onBlur={() => field().handleBlur()}
                  />
                  <Show when={field().state.meta.errors.length > 0}>
                    <TextFieldErrorMessage>
                      {field().state.meta.errors[0]?.message}
                    </TextFieldErrorMessage>
                  </Show>
                </TextFieldRoot>
              )}
            </form.Field>

            <form.Field name="password">
              {(field) => (
                <TextFieldRoot>
                  <TextFieldLabel>Password</TextFieldLabel>
                  <TextFieldInput
                    type="password"
                    placeholder="Create a password"
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                    onBlur={() => field().handleBlur()}
                  />
                  <Show when={field().state.meta.errors.length > 0}>
                    <TextFieldErrorMessage>
                      {field().state.meta.errors[0]?.message}
                    </TextFieldErrorMessage>
                  </Show>
                  <p class="text-xs text-muted-foreground">
                    Min 12 chars, with uppercase, lowercase, number, and special character
                  </p>
                </TextFieldRoot>
              )}
            </form.Field>

            <form.Field name="confirmPassword">
              {(field) => (
                <TextFieldRoot>
                  <TextFieldLabel>Confirm Password</TextFieldLabel>
                  <TextFieldInput
                    type="password"
                    placeholder="Confirm your password"
                    value={field().state.value}
                    onInput={(e) => field().handleChange(e.currentTarget.value)}
                    onBlur={() => field().handleBlur()}
                  />
                  <Show when={field().state.meta.errors.length > 0}>
                    <TextFieldErrorMessage>
                      {field().state.meta.errors[0]?.message}
                    </TextFieldErrorMessage>
                  </Show>
                </TextFieldRoot>
              )}
            </form.Field>

            <form.Subscribe selector={(s) => [s.isSubmitting, s.canSubmit]}>
              {(state) => (
                <Button type="submit" class="w-full" disabled={state()[0] || !state()[1]}>
                  {state()[0] ? "Creating account..." : "Create Account"}
                </Button>
              )}
            </form.Subscribe>

            <p class="text-center text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link to="/login" class="font-medium text-primary hover:underline">
                Sign in
              </Link>
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
