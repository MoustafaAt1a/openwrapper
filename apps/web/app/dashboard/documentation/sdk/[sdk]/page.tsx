import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { DashboardShell } from "@/components/dashboard-shell"
import { SdkGuideClient } from "@/components/sdk-guide-client"
import { auth } from "@/lib/auth"
import { SDK_DOCS } from "@/lib/sdk-data"

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
  if (!session?.user) redirect("/sign-in")

  return (
    <DashboardShell name={session.user.name} email={session.user.email}>
      <main className="mx-auto max-w-6xl animate-rise">
        <SdkGuideClient initialSdk={sdk} isStandalonePage={true} />
      </main>
    </DashboardShell>
  )
}
