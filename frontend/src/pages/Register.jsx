import React, { useState } from "react";
import { Eye, EyeOff, Loader2, XCircle } from "lucide-react";

import { COLORS } from "../styles/tokens.js";
import { Card } from "../components/shared/Card.jsx";
import { Logo, Vitals } from "../components/shared/Brand.jsx";
import { registerUser, registerAdmin } from "../services/authService.js";
import { DEPARTMENTS, EMAIL_DOMAINS, userTypeForEmail } from "../data/config.js";

const XIE_DOMAINS_TEXT = Object.keys(EMAIL_DOMAINS).map((d) => `@${d}`).join(" or ");

export function Register({ role: initialRole, onLogin, onBackToLogin }) {
    const [role, setRole] = useState(initialRole || "user");

    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [department, setDepartment] = useState("");

    const [showPw, setShowPw] = useState(false);
    const [showConfirmPw, setShowConfirmPw] = useState(false);

    const [errors, setErrors] = useState({});

    // Student / Teacher comes from the email domain (null until it's an XIE address)
    const userType = userTypeForEmail(email);
    const [loading, setLoading] = useState(false);
    const [authError, setAuthError] = useState("");

    const validate = () => {
        const errs = {};

        if (!name.trim()) {
            errs.name = "Name is required.";
        }

        if (!email.trim()) {
            errs.email = "Email is required.";
        } else if (!/^\S+@\S+\.\S+$/.test(email)) {
            errs.email = "Enter a valid email address.";
        } else if (role === "user" && !userTypeForEmail(email)) {
            errs.email = `Use your XIE email (${XIE_DOMAINS_TEXT}).`;
        }

        if (!password) {
            errs.password = "Password is required.";
        } else if (password.length < 6) {
            errs.password = "Password must be at least 6 characters.";
        }

        if (!confirmPassword) {
            errs.confirmPassword = "Please confirm your password.";
        } else if (password !== confirmPassword) {
            errs.confirmPassword = "Passwords do not match.";
        }

        if (role === "user" && !department) {
            errs.department = "Select your department.";
        }

        setErrors(errs);

        return Object.keys(errs).length === 0;
    };

    const handleRoleChange = (newRole) => {
        setRole(newRole);
        setAuthError("");
        setErrors({});
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setAuthError("");

        if (!validate()) {
            return;
        }

        setLoading(true);

try {
    let data;

    if (role === "admin") {
        data = await registerAdmin(name, email, password);

        onLogin({
            ...data.admin,
            role: "admin",
        });
    } else {
        data = await registerUser(name, email, password, { department });

        onLogin({
            ...data.user,
            role: "user",
        });
    }
} catch (error) {
    console.error("Registration error:", error);

    setAuthError(
        error.message || "Registration failed. Please try again."
    );
}
    };

    return (
        <div
            className="min-h-screen w-full flex items-center justify-center px-4 py-8"
        >
            <div className="w-full max-w-md">

                {/* Logo */}
                <div className="flex flex-col items-center mb-8">
                    <Logo size="lg" />

                    <div className="mt-4">
                        <Vitals w={140} h={24} />
                    </div>
                </div>

                <Card className="p-7 sm:p-8" style={{ boxShadow: "0 0 0 1px rgba(124,108,242,0.18), 0 30px 80px -24px rgba(124,108,242,0.45)" }}>

                    {/* Role Selector */}
                    <div
                        className="flex mb-6 rounded-md p-1"
                        style={{ backgroundColor: COLORS.bg }}
                    >
                        <button
                            type="button"
                            onClick={() => handleRoleChange("user")}
                            className="flex-1 rounded-lg py-2 text-sm font-medium transition"
                            style={{
                                backgroundColor:
                                    role === "user"
                                        ? COLORS.primary
                                        : "transparent",
                                color:
                                    role === "user"
                                        ? "white"
                                        : COLORS.slate,
                            }}
                        >
                            Student / Teacher
                        </button>

                        <button
                            type="button"
                            onClick={() => handleRoleChange("admin")}
                            className="flex-1 rounded-lg py-2 text-sm font-medium transition"
                            style={{
                                backgroundColor:
                                    role === "admin"
                                        ? COLORS.primary
                                        : "transparent",
                                color:
                                    role === "admin"
                                        ? "white"
                                        : COLORS.slate,
                            }}
                        >
                            Maintenance Admin
                        </button>
                    </div>

                    {/* Heading */}
                    <h1
                        className="text-xl font-semibold mb-1"
                        style={{ color: COLORS.ink }}
                    >
                        {role === "admin"
                            ? "Create admin account"
                            : "Create your account"}
                    </h1>

                    <p
                        className="text-sm mb-6"
                        style={{ color: COLORS.slate }}
                    >
                        {role === "admin"
                            ? "Register an XIE maintenance admin account."
                            : "Students and faculty: report campus issues in under a minute."}
                    </p>

                    {/* Error */}
                    {authError && (
                        <div
                            role="alert"
                            className="mb-5 flex items-start gap-2 rounded-md px-3.5 py-3 text-sm"
                            style={{
                                backgroundColor: COLORS.criticalSoft,
                                color: COLORS.critical,
                            }}
                        >
                            <XCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            <span>{authError}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} noValidate>

                        {/* Name */}
                        <div className="mb-4">
                            <label
                                htmlFor="name"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: COLORS.ink }}
                            >
                                Full name
                            </label>

                            <input
                                id="name"
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="John Doe"
                                aria-invalid={!!errors.name}
                                className="w-full rounded-md border px-3.5 py-2.5 text-sm outline-none focus:ring-2 transition"
                                style={{
                                    borderColor: errors.name
                                        ? COLORS.critical
                                        : COLORS.line,
                                    "--tw-ring-color": COLORS.primary,
                                }}
                            />

                            {errors.name && (
                                <p
                                    className="mt-1.5 text-xs"
                                    style={{ color: COLORS.critical }}
                                >
                                    {errors.name}
                                </p>
                            )}
                        </div>

                        {/* Student / Teacher + department (user accounts only) */}
                        {role === "user" && (
                            <div className="mb-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div>
                                    <span
                                        className="block text-sm font-medium mb-1.5"
                                        style={{ color: COLORS.ink }}
                                    >
                                        Account type
                                    </span>
                                    {/* Decided by the email domain, not chosen */}
                                    <div
                                        className="flex items-center h-[42px] rounded-md px-3 border text-sm"
                                        style={{
                                            borderColor: COLORS.line,
                                            color: userType ? COLORS.ink : COLORS.muted,
                                        }}
                                        aria-live="polite"
                                    >
                                        {userType ? `${userType} (from your XIE email)` : "Detected from your XIE email"}
                                    </div>
                                </div>

                                <div>
                                    <label
                                        htmlFor="department"
                                        className="block text-sm font-medium mb-1.5"
                                        style={{ color: COLORS.ink }}
                                    >
                                        Department
                                    </label>
                                    <select
                                        id="department"
                                        value={department}
                                        onChange={(e) => setDepartment(e.target.value)}
                                        aria-invalid={!!errors.department}
                                        className="w-full rounded-md border px-3 py-2.5 text-sm outline-none focus:ring-2 transition bg-transparent"
                                        style={{
                                            borderColor: errors.department ? COLORS.critical : COLORS.line,
                                            "--tw-ring-color": COLORS.primary,
                                        }}
                                    >
                                        <option value="">Select department</option>
                                        {DEPARTMENTS.map((d) => (
                                            <option key={d.id} value={d.id}>{d.label}</option>
                                        ))}
                                    </select>
                                    {errors.department && (
                                        <p className="mt-1.5 text-xs" style={{ color: COLORS.critical }}>
                                            {errors.department}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Email */}
                        <div className="mb-4">
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: COLORS.ink }}
                            >
                                Email
                            </label>

                            <input
                                id="email"
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder={role === "user" ? "202301099.name@student.xavier.ac.in" : "you@xavier.ac.in"}
                                aria-invalid={!!errors.email}
                                className="w-full rounded-md border px-3.5 py-2.5 text-sm outline-none focus:ring-2 transition"
                                style={{
                                    borderColor: errors.email
                                        ? COLORS.critical
                                        : COLORS.line,
                                    "--tw-ring-color": COLORS.primary,
                                }}
                            />

                            {errors.email && (
                                <p
                                    className="mt-1.5 text-xs"
                                    style={{ color: COLORS.critical }}
                                >
                                    {errors.email}
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div className="mb-4">
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: COLORS.ink }}
                            >
                                Password
                            </label>

                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPw ? "text" : "password"}
                                    value={password}
                                    onChange={(e) =>
                                        setPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    aria-invalid={!!errors.password}
                                    className="w-full rounded-md border px-3.5 py-2.5 pr-10 text-sm outline-none focus:ring-2 transition"
                                    style={{
                                        borderColor: errors.password
                                            ? COLORS.critical
                                            : COLORS.line,
                                        "--tw-ring-color": COLORS.primary,
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowPw((v) => !v)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                    aria-label={
                                        showPw
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showPw ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {errors.password && (
                                <p
                                    className="mt-1.5 text-xs"
                                    style={{ color: COLORS.critical }}
                                >
                                    {errors.password}
                                </p>
                            )}
                        </div>

                        {/* Confirm Password */}
                        <div className="mb-6">
                            <label
                                htmlFor="confirmPassword"
                                className="block text-sm font-medium mb-1.5"
                                style={{ color: COLORS.ink }}
                            >
                                Confirm password
                            </label>

                            <div className="relative">
                                <input
                                    id="confirmPassword"
                                    type={
                                        showConfirmPw
                                            ? "text"
                                            : "password"
                                    }
                                    value={confirmPassword}
                                    onChange={(e) =>
                                        setConfirmPassword(e.target.value)
                                    }
                                    placeholder="••••••••"
                                    aria-invalid={
                                        !!errors.confirmPassword
                                    }
                                    className="w-full rounded-md border px-3.5 py-2.5 pr-10 text-sm outline-none focus:ring-2 transition"
                                    style={{
                                        borderColor:
                                            errors.confirmPassword
                                                ? COLORS.critical
                                                : COLORS.line,
                                        "--tw-ring-color": COLORS.primary,
                                    }}
                                />

                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowConfirmPw((v) => !v)
                                    }
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
                                    aria-label={
                                        showConfirmPw
                                            ? "Hide password"
                                            : "Show password"
                                    }
                                >
                                    {showConfirmPw ? (
                                        <EyeOff className="w-4 h-4" />
                                    ) : (
                                        <Eye className="w-4 h-4" />
                                    )}
                                </button>
                            </div>

                            {errors.confirmPassword && (
                                <p
                                    className="mt-1.5 text-xs"
                                    style={{ color: COLORS.critical }}
                                >
                                    {errors.confirmPassword}
                                </p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 rounded-md py-2.5 text-sm font-semibold text-white transition disabled:opacity-70"
                            style={{
                                backgroundColor: COLORS.primary,
                            }}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Creating account…
                                </>
                            ) : (
                                "Create account"
                            )}
                        </button>
                    </form>

                    {/* Login link */}
                    <div className="mt-5 text-center">
                        <span
                            className="text-xs"
                            style={{ color: COLORS.slate }}
                        >
                            Already have an account?{" "}
                        </span>

                        <button
                            type="button"
                            onClick={onBackToLogin}
                            className="text-xs font-medium hover:underline"
                            style={{ color: COLORS.primary }}
                        >
                            Sign in
                        </button>
                    </div>

                </Card>

                {/* Disclaimer */}
                <p
                    className="text-xs text-center mt-6"
                    style={{ color: COLORS.slate }}
                >
                    For electrical, fire or other safety emergencies, leave the area and
                    contact campus security immediately.
                </p>

            </div>
        </div>
    );
}

export default Register;
