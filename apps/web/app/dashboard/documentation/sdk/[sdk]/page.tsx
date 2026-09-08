import { cookies, headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { ControlPlaneShell } from "@/components/control-plane-shell"
import { DeveloperSdkHub } from "@/components/developer-sdk-hub"
import { auth } from "@/lib/auth"
import { SDK_DOCS } from "@/lib/sdk-registry"

export function generateStaticParams() {
  return [{ sdk: "typescript" }, { sdk: "php" }, { sdk: "dotnet" }]
}

export async function generateMetadata(props: { params: Promise<{ sdk: string }> }) {
  const { sdk } = await props.params
  const doc = SDK_DOCS[sdk as keyof typeof SDK_DOCS]
  if (!doc) {
    return {
      title: "SDK Documentation — OpenWrapper",
    }
  }

  return {
    title: `${doc.name} — OpenWrapper Documentation`,
    description: doc.description,
  }
}

export default async function SdkDocPage(props: { params: Promise<{ sdk: string }> }) {
  const { sdk } = await props.params
  if (sdk !== "typescript" && sdk !== "php" && sdk !== "dotnet") {
    notFound()
  }

  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user) redirect("/login")

  const cookieStore = await cookies()
  const rawMode = cookieStore.get("openwrapper_dashboard_mode")?.value
  const env: "live" | "test" = rawMode === "live" ? "live" : "test"

  return (
    <ControlPlaneShell name={session.user.name} email={session.user.email} initialMode={env}>
      <main className="mx-auto max-w-6xl animate-rise">
        <DeveloperSdkHub initialSdk={sdk} isStandalonePage={true} />
      </main>
    </ControlPlaneShell>
  )
}
