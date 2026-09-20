import Link from "next/link";
import Image from "next/image";
import { PaisajeFondo } from "@/components/paisaje-fondo";
import { ThemeToggleButton } from "@/components/theme-toggle-button";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center gap-6 px-6 py-16">
      <PaisajeFondo />

      <div className="fixed right-5 top-5 z-10">
        <ThemeToggleButton />
      </div>

      <div className="relative flex flex-col items-center">
        <Link href="/">
          <Image
            src="/logo-stacked.png"
            alt="preparatorIA"
            width={700}
            height={667}
            className="h-28 w-auto drop-shadow-lg"
            priority
          />
        </Link>
        <Image
          src="/mascota/mascota-neutral.png"
          alt=""
          width={320}
          height={315}
          className="absolute -right-16 top-2 hidden h-20 w-auto rotate-6 drop-shadow-lg sm:block"
        />
      </div>

      {children}
    </main>
  );
}
