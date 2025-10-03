export interface ZipEntry {
  name: string
  data: Uint8Array
  lastModified?: Date
}

const encoder = new TextEncoder()
const crcTable = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let crc = i
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) !== 0 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1
    }
    table[i] = crc >>> 0
  }
  return table
})()

function crc32(data: Uint8Array): number {
  let crc = 0 ^ -1
  for (let i = 0; i < data.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ data[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}

function getDosDateTime(date: Date) {
  const year = Math.max(1980, date.getFullYear())
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours()
  const minutes = date.getMinutes()
  const seconds = Math.floor(date.getSeconds() / 2)

  const dosDate = ((year - 1980) << 9) | (month << 5) | day
  const dosTime = (hours << 11) | (minutes << 5) | seconds
  return { dosDate, dosTime }
}

export function createZipArchive(entries: ZipEntry[]): Uint8Array {
  const fileData: { header: Uint8Array; data: Uint8Array }[] = []
  const directoryEntries: Uint8Array[] = []
  let offset = 0
  const now = new Date()

  for (const entry of entries) {
    const nameBytes = encoder.encode(entry.name)
    const data = entry.data
    const crc = crc32(data)
    const { dosDate, dosTime } = getDosDateTime(entry.lastModified ?? now)

    const localHeader = new Uint8Array(30 + nameBytes.length)
    const localView = new DataView(localHeader.buffer)
    localView.setUint32(0, 0x04034b50, true)
    localView.setUint16(4, 20, true)
    localView.setUint16(6, 0, true)
    localView.setUint16(8, 0, true)
    localView.setUint16(10, dosTime, true)
    localView.setUint16(12, dosDate, true)
    localView.setUint32(14, crc, true)
    localView.setUint32(18, data.length, true)
    localView.setUint32(22, data.length, true)
    localView.setUint16(26, nameBytes.length, true)
    localView.setUint16(28, 0, true)
    localHeader.set(nameBytes, 30)

    fileData.push({ header: localHeader, data })

    const centralHeader = new Uint8Array(46 + nameBytes.length)
    const centralView = new DataView(centralHeader.buffer)
    centralView.setUint32(0, 0x02014b50, true)
    centralView.setUint16(4, 20, true)
    centralView.setUint16(6, 20, true)
    centralView.setUint16(8, 0, true)
    centralView.setUint16(10, 0, true)
    centralView.setUint16(12, dosTime, true)
    centralView.setUint16(14, dosDate, true)
    centralView.setUint32(16, crc, true)
    centralView.setUint32(20, data.length, true)
    centralView.setUint32(24, data.length, true)
    centralView.setUint16(28, nameBytes.length, true)
    centralView.setUint16(30, 0, true)
    centralView.setUint16(32, 0, true)
    centralView.setUint16(34, 0, true)
    centralView.setUint16(36, 0, true)
    centralView.setUint32(38, 0, true)
    centralView.setUint32(42, offset, true)
    centralHeader.set(nameBytes, 46)
    directoryEntries.push(centralHeader)

    offset += localHeader.length + data.length
  }

  const centralDirectorySize = directoryEntries.reduce((acc, entry) => acc + entry.length, 0)
  const endRecord = new Uint8Array(22)
  const endView = new DataView(endRecord.buffer)
  endView.setUint32(0, 0x06054b50, true)
  endView.setUint16(4, 0, true)
  endView.setUint16(6, 0, true)
  endView.setUint16(8, entries.length, true)
  endView.setUint16(10, entries.length, true)
  endView.setUint32(12, centralDirectorySize, true)
  endView.setUint32(16, offset, true)
  endView.setUint16(20, 0, true)

  const totalSize = offset + centralDirectorySize + endRecord.length
  const output = new Uint8Array(totalSize)
  let cursor = 0

  for (const { header, data } of fileData) {
    output.set(header, cursor)
    cursor += header.length
    output.set(data, cursor)
    cursor += data.length
  }

  for (const entry of directoryEntries) {
    output.set(entry, cursor)
    cursor += entry.length
  }

  output.set(endRecord, cursor)
  return output
}
