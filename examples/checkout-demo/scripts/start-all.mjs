import { spawn } from "node:child_process"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

const __dirname = dirname(fileURLToPath(import.meta.url))
const rootDir = join(__dirname, "..")

console.log("\x1b[1m\x1b[37m=======================================================\x1b[0m")
console.log("\x1b[1m\x1b[32m  OpenWrapper Multi-SDK Real Checkout Demo Servers\x1b[0m")
console.log("\x1b[1m\x1b[37m=======================================================\x1b[0m")
console.log("  ⚡ \x1b[32mTypeScript / Node.js\x1b[0m -> http://localhost:4000")
console.log("  🐘 \x1b[35mPHP 8.x             \x1b[0m -> http://localhost:4001")
console.log("  🔷 \x1b[36m.NET 8 / C#         \x1b[0m -> http://localhost:4002")
console.log("\x1b[1m\x1b[37m=======================================================\x1b[0m")
console.log("\x1b[90mPress Ctrl+C to terminate all servers gracefully.\x1b[0m\n")

const services = [
  {
    name: "TypeScript",
    color: "\x1b[32m",
    cmd: "node",
    args: ["server.js"],
    cwd: join(rootDir, "typescript"),
  },
  {
    name: "PHP 8",
    color: "\x1b[35m",
    cmd: "php",
    args: ["-S", "0.0.0.0:4001", "php/server.php"],
    cwd: rootDir,
  },
  {
    name: ".NET 8",
    color: "\x1b[36m",
    cmd: "dotnet",
    args: ["run", "--project", "dotnet/CheckoutDemo.csproj"],
    cwd: rootDir,
  },
]

const children = []

function pipePrefixed(stream, name, color) {
  if (!stream) return
  let buffer = ""
  stream.setEncoding("utf8")
  stream.on("data", (chunk) => {
    buffer += chunk
    const lines = buffer.split("\n")
    buffer = lines.pop() || ""
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}[${name}]\x1b[0m ${line}`)
      }
    }
  })
}

for (const svc of services) {
  try {
    const child = spawn(svc.cmd, svc.args, {
      cwd: svc.cwd,
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
      shell: false,
    })

    pipePrefixed(child.stdout, svc.name, svc.color)
    pipePrefixed(child.stderr, svc.name, "\x1b[31m")

    child.on("error", (err) => {
      console.error(`${svc.color}[${svc.name}]\x1b[31m Failed to start: ${err.message}\x1b[0m`)
    })

    child.on("exit", (code) => {
      console.log(`${svc.color}[${svc.name}]\x1b[0m Exited with code ${code ?? 0}`)
    })

    children.push(child)
  } catch (err) {
    console.error(`Failed to spawn ${svc.name}: ${err.message}`)
  }
}

function cleanup() {
  console.log("\n\x1b[90mShutting down all checkout demo servers...\x1b[0m")
  for (const child of children) {
    try {
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/pid", child.pid.toString(), "/f", "/t"], { stdio: "ignore" })
      } else {
        child.kill("SIGTERM")
      }
    } catch {
      // Ignore cleanup error
    }
  }
  process.exit(0)
}

process.on("SIGINT", cleanup)
process.on("SIGTERM", cleanup)
process.on("exit", cleanup)
