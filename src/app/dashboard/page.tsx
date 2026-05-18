import { auth, signOut } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function DashboardPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  async function logout() {
    "use server";
    await signOut({ redirectTo: "/login" });
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-2xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <form action={logout}>
            <button
              type="submit"
              className="px-4 py-2 border rounded-md text-sm"
            >
              Sign out
            </button>
          </form>
        </div>
        <p className="text-gray-600">
          Signed in as <span className="font-medium">{session.user.email}</span>
        </p>
      </div>
    </div>
  );
}