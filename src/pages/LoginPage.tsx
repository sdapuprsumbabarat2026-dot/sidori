import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../hooks/useTheme";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { AlertCircle, Loader2, Sun, Moon } from "lucide-react";

export default function LoginPage() {
  const [nip, setNip] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { login, user } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  if (user) {
    navigate("/", { replace: true });
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    const err = await login(nip, password);
    setSubmitting(false);
    if (err) setError(err);
    else navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 md:p-8 bg-background">
      <div className="w-full max-w-6xl min-h-[640px] rounded-2xl overflow-hidden shadow-2xl grid md:grid-cols-2 bg-card">
        {/* Panel kiri: identitas instansi dengan foto latar */}
        <div className="relative hidden md:flex flex-col justify-between p-10 text-white overflow-hidden">
          <img
            src="/login-bg.jpeg"
            alt="Irigasi Sumba Barat"
            className="absolute inset-0 w-full h-full object-cover"
          />
          {/* overlay gradasi supaya teks tetap terbaca */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-950/80 via-blue-950/50 to-blue-950/85" />

          <div className="relative flex items-center gap-3">
            <img src="/logo-kabupaten.png" alt="Logo Kabupaten Sumba Barat" className="h-14 w-auto drop-shadow" />
            <img src="/logo-pupr.png" alt="Logo PUPR" className="h-14 w-auto drop-shadow" />
          </div>

          <div className="relative space-y-3 mt-10">
            <p className="text-xs font-medium tracking-wide text-blue-100">
              Kabupaten Sumba Barat
              <br />
              Dinas Pekerjaan Umum dan Penataan Ruang
              <br />
              Bidang Sumber Daya Air
            </p>
            <h1 className="text-4xl font-bold tracking-tight pt-2">SIDORI</h1>
            <p className="text-blue-100 leading-relaxed max-w-sm">
              Sistem Informasi Dokumen Perencanaan Irigasi — mengawal proses pengusulan dan
              perencanaan konstruksi jaringan irigasi.
            </p>
          </div>

          <div className="relative text-[11px] text-blue-200/80">
            &copy; {new Date().getFullYear()} Bidang Sumber Daya Air, DPUPR Kabupaten Sumba Barat
          </div>
        </div>

        {/* Panel kanan: form login */}
        <div className="p-8 md:p-14 flex flex-col justify-center bg-card relative">
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-4 right-4"
            onClick={() => toggle()}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </Button>
          <div className="flex md:hidden items-center justify-center gap-4 mb-6">
            <img src="/logo-kabupaten.png" alt="Logo Kabupaten Sumba Barat" className="h-12 w-auto" />
            <img src="/logo-pupr.png" alt="Logo PUPR" className="h-12 w-auto" />
          </div>

          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold text-foreground">Selamat Datang</h2>
            <p className="text-sm text-muted-foreground mt-1">Silakan masuk ke akun SIDORI Anda</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 max-w-sm mx-auto md:mx-0 w-full">
            <div className="space-y-2">
              <Label htmlFor="nip" className="text-foreground">NIP</Label>
              <Input
                id="nip"
                type="text"
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                required
                placeholder="Nomor Induk Pegawai"
                className="h-11 bg-background text-foreground placeholder:text-muted-foreground border-border"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-foreground">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="h-11 bg-background text-foreground placeholder:text-muted-foreground border-border"
              />
            </div>
            {error && (
              <div className="flex items-center gap-2 text-sm text-destructive">
                <AlertCircle className="h-4 w-4" /> {error}
              </div>
            )}
            <Button type="submit" className="w-full h-11" disabled={submitting}>
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitting ? "Memuat..." : "Masuk"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
