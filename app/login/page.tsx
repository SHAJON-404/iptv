import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import Image from "next/image"
import { prisma } from "@/app/lib/prisma"

export default async function LoginPage() {
  const sessionToken = (await cookies()).get('iptv_session')?.value

  if (sessionToken) {
    const session = await prisma.session.findUnique({
      where: { sessionToken }
    })

    if (session && session.expires > new Date()) {
      redirect("/")
    }
  }

  return (
    <div className="min-h-screen bg-[#070414] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] opacity-50 mix-blend-screen animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[150px] opacity-40 mix-blend-screen" />
      </div>

      <div className="glass-card relative z-10 w-full max-w-md p-8 sm:p-10 border border-white/10 rounded-3xl bg-white/[0.02] shadow-[0_0_50px_rgba(0,0,0,0.5)] backdrop-blur-2xl text-center">
        <div className="mb-8">
          <div className="relative w-16 h-16 rounded-2xl mx-auto mb-4 overflow-hidden border border-white/15 shadow-xl shadow-primary/20 bg-white/5 flex-shrink-0">
            <Image
              src="/logo.png"
              alt="IPTV Player Logo"
              fill
              className="object-cover"
              priority
            />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight mb-2">
            IPTV Player
          </h1>
          <p className="text-zinc-400 text-sm font-medium">
            Sign in to manage and upload your private playlists.
          </p>
        </div>

        <a href="/api/auth/google" className="block w-full">
          <button
            type="button"
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-zinc-100 text-zinc-900 font-bold py-4 px-6 rounded-2xl transition-all shadow-xl active:scale-[0.98] cursor-pointer"
          >
            <svg className="w-6 h-6" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
              <path d="M1 1h22v22H1z" fill="none" />
            </svg>
            Continue with Google
          </button>
        </a>

        <p className="mt-8 text-xs text-zinc-500">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  )
}
