import fs from "fs"
import path from "path"

const webDir = path.resolve("apps/web")

const ignoredDirs = new Set(["node_modules", ".next", "dist", ".turbo", "coverage"])
const fileList = []

function walk(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (!ignoredDirs.has(entry.name)) {
        walk(path.join(dir, entry.name))
      }
    } else if (/\.(tsx|ts|jsx|js|css)$/.test(entry.name) && !entry.name.endsWith(".d.ts")) {
      fileList.push(path.join(dir, entry.name))
    }
  }
}

walk(path.join(webDir, "app"))
walk(path.join(webDir, "components"))
walk(path.join(webDir, "lib"))

const colorMap = new Map() // color -> [{ file, line, context }]
const shadowMap = new Map() // shadow -> [{ file, line }]
const radiusMap = new Map() // radius -> [{ file, line }]
const arbitrarySpacingMap = new Map() // spacing -> [{ file, line }]

const hexRegex = /#([0-9a-fA-F]{3,8})\b/g
const rgbRegex = /rgba?\([^)]+\)/g
const shadowRegex =
  /(?:shadow-\[[^\]]+\]|shadow-(?:2xs|xs|sm|md|lg|xl|2xl|inner|none)|stripe-card-shadow-[a-z]+)/g
const radiusRegex = /(?:rounded-\[[^\]]+\]|rounded-(?:none|xs|sm|md|lg|xl|2xl|3xl|full|pill))/g
const arbitrarySpacingRegex = /(?:[pm][trblxy]?|gap(?:-[xy])?)-\[(\d+(?:\.\d+)?(?:px|rem|em))\]/g

for (const filePath of fileList) {
  const relPath = path.relative(process.cwd(), filePath).replace(/\\/g, "/")
  const content = fs.readFileSync(filePath, "utf-8")
  const lines = content.split("\n")

  lines.forEach((line, index) => {
    const lineNum = index + 1
    // Skip globals.css when collecting raw hex drift, but we'll inspect it separately
    if (!relPath.endsWith("globals.css") && !relPath.includes("/test/")) {
      let match
      while ((match = hexRegex.exec(line)) !== null) {
        const hex = match[0].toLowerCase()
        if (!colorMap.has(hex)) colorMap.set(hex, [])
        colorMap.get(hex).push({ file: relPath, line: lineNum, text: line.trim() })
      }

      while ((match = rgbRegex.exec(line)) !== null) {
        const val = match[0]
        if (!colorMap.has(val)) colorMap.set(val, [])
        colorMap.get(val).push({ file: relPath, line: lineNum, text: line.trim() })
      }

      while ((match = shadowRegex.exec(line)) !== null) {
        const val = match[0]
        if (!shadowMap.has(val)) shadowMap.set(val, [])
        shadowMap.get(val).push({ file: relPath, line: lineNum })
      }

      while ((match = radiusRegex.exec(line)) !== null) {
        const val = match[0]
        if (!radiusMap.has(val)) radiusMap.set(val, [])
        radiusMap.get(val).push({ file: relPath, line: lineNum })
      }

      while ((match = arbitrarySpacingRegex.exec(line)) !== null) {
        const val = match[0]
        if (!arbitrarySpacingMap.has(val)) arbitrarySpacingMap.set(val, [])
        arbitrarySpacingMap.get(val).push({ file: relPath, line: lineNum })
      }
    }
  })
}

const summary = {
  totalFilesScanned: fileList.length,
  distinctHexOrRgbColors: Array.from(colorMap.keys()).length,
  distinctShadows: Array.from(shadowMap.keys()).length,
  distinctRadii: Array.from(radiusMap.keys()).length,
  distinctArbitrarySpacing: Array.from(arbitrarySpacingMap.keys()).length,
  topColors: Array.from(colorMap.entries())
    .map(([color, occurrences]) => ({ color, count: occurrences.length, sample: occurrences[0] }))
    .sort((a, b) => b.count - a.count),
  shadows: Array.from(shadowMap.entries())
    .map(([shadow, occurrences]) => ({ shadow, count: occurrences.length }))
    .sort((a, b) => b.count - a.count),
  radii: Array.from(radiusMap.entries())
    .map(([radius, occurrences]) => ({ radius, count: occurrences.length }))
    .sort((a, b) => b.count - a.count),
  arbitrarySpacing: Array.from(arbitrarySpacingMap.entries())
    .map(([spacing, occurrences]) => ({ spacing, count: occurrences.length }))
    .sort((a, b) => b.count - a.count),
}

fs.writeFileSync(
  path.resolve("apps/web/scripts/audit-summary.json"),
  JSON.stringify(
    {
      summary,
      colorMap: Object.fromEntries(colorMap),
      shadowMap: Object.fromEntries(shadowMap),
      radiusMap: Object.fromEntries(radiusMap),
      arbitrarySpacingMap: Object.fromEntries(arbitrarySpacingMap),
    },
    null,
    2,
  ),
)

console.log("Audit scan complete:")
console.log(`- Files scanned: ${summary.totalFilesScanned}`)
console.log(`- Distinct raw hex/rgb values: ${summary.distinctHexOrRgbColors}`)
console.log(`- Distinct shadow classes: ${summary.distinctShadows}`)
console.log(`- Distinct radius classes: ${summary.distinctRadii}`)
console.log(`- Distinct arbitrary spacing classes: ${summary.distinctArbitrarySpacing}`)
