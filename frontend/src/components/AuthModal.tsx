"use client";

import React, { useState } from "react";
import { useCast } from "../context/CastContext";
import {
  X,
  Lock,
  Mail,
  Phone,
  User as UserIcon,
  Car,
  ShieldCheck,
  ArrowRight,
} from "lucide-react";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: "login" | "register";
  defaultRole?: "PASSENGER" | "DRIVER";
}

export function AuthModal({
  isOpen,
  onClose,
  defaultTab = "login",
  defaultRole = "PASSENGER",
}: AuthModalProps) {
  const { login, register, quickLogin, cast } = useCast();
  const [tab, setTab] = useState<"login" | "register">(defaultTab);

  // Login form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  // Register form state
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [role, setRole] = useState<"PASSENGER" | "DRIVER">(defaultRole);
  const [vehicleName, setVehicleName] = useState("Tesla Bullet");
  const [vehicleModel, setVehicleModel] = useState("Electric 3-Wheeler");
  const [licensePlate, setLicensePlate] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setTab(defaultTab);
      if (defaultRole) setRole(defaultRole);
    }
  }, [isOpen, defaultTab, defaultRole]);

  if (!isOpen) return null;

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(identifier, password);
      onClose();
    } catch (err: any) {
      setError(err.message || "Login failed. Please check credentials.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await register({
        name,
        phone,
        email: email || undefined,
        password: regPassword,
        role,
        ...(role === "DRIVER"
          ? {
              vehicleName,
              vehicleModel,
              licensePlate:
                licensePlate ||
                `DHAKA-METRO-${Date.now().toString().slice(-4)}`,
            }
          : {}),
      });
      onClose();
    } catch (err: any) {
      setError(err.message || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCastLogin = async (castUser: any) => {
    setError(null);
    setLoading(true);
    try {
      await quickLogin(castUser);
      onClose();
    } catch (err: any) {
      setError(err.message || "Quick login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 text-white shadow-2xl relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-all"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Tabs */}
        <div className="flex border-b border-slate-800 mb-6">
          <button
            onClick={() => {
              setTab("login");
              setError(null);
            }}
            className={`pb-3 px-4 text-sm font-bold transition-all relative ${
              tab === "login"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Sign In (JWT)
            {tab === "login" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>

          <button
            onClick={() => {
              setTab("register");
              setError(null);
            }}
            className={`pb-3 px-4 text-sm font-bold transition-all relative ${
              tab === "register"
                ? "text-emerald-400"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Create Account
            {tab === "register" && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400 rounded-full" />
            )}
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
            {error}
          </div>
        )}

        {/* TAB 1: LOGIN */}
        {tab === "login" ? (
          <div>
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Phone Number or Email
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="text"
                    required
                    placeholder="+8801700000000 or user@example.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
              >
                {loading ? "Authenticating..." : "Sign In with JWT"}
              </button>
            </form>
          </div>
        ) : (
          /* TAB 2: REGISTER */
          <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Full Name
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Tanvir Ahmed"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Phone Number
                </label>
                <input
                  type="text"
                  required
                  placeholder="+8801700000000"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  placeholder="tanvir@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                minLength={6}
                placeholder="At least 6 characters"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl py-2 px-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Role
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setRole("PASSENGER")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                    role === "PASSENGER"
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400"
                      : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                  }`}
                >
                  <UserIcon className="w-3.5 h-3.5" />
                  <span>Passenger (Rider)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setRole("DRIVER")}
                  className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all flex items-center justify-center space-x-1.5 ${
                    role === "DRIVER"
                      ? "bg-amber-500/10 border-amber-500 text-amber-400"
                      : "border-slate-800 text-slate-400 hover:bg-slate-800/40"
                  }`}
                >
                  <Car className="w-3.5 h-3.5" />
                  <span>Driver (Tesla Pilot)</span>
                </button>
              </div>
            </div>

            {role === "DRIVER" && (
              <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl space-y-2">
                <span className="text-[11px] font-semibold text-amber-400">
                  Driver Vehicle Details
                </span>
                <input
                  type="text"
                  placeholder="Vehicle Name (e.g. Red Lightning)"
                  value={vehicleName}
                  onChange={(e) => setVehicleName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white"
                />
                <input
                  type="text"
                  placeholder="License Plate (e.g. DHAKA-METRO-KA-99)"
                  value={licensePlate}
                  onChange={(e) => setLicensePlate(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50 mt-2"
            >
              {loading ? "Creating Account..." : "Register & Log In"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
