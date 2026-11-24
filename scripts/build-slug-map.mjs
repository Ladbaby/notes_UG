import fs from 'node:fs'
import path from 'node:path'

const root = process.cwd()
const courses = JSON.parse(fs.readFileSync('docs/course-data.json', 'utf8')).courses

// Manual English names for files whose slug would otherwise be lossy.
const FILE_NAME_OVERRIDES = {
  '3_损失函数和最大似然': '3-loss-functions-and-maximum-likelihood',
  '4_深度前馈网络': '4-deep-feedforward-networks',
  '5_卷积神经网络': '5-convolutional-neural-networks',
  '6_循环神经网络': '6-recurrent-neural-networks',
  '7_自编码器': '7-autoencoders',
  '8_深度生成网络': '8-deep-generative-models',
  '9_正则化和优化': '9-regularization-and-optimization',
  'Ch0_前言': 'ch0-preface',
  '特别篇 电场与磁场': 'special-electric-and-magnetic-fields',
  'FA Diagram': 'fa-diagram',
  '1_介绍': '1-introduction',
  '2_IPv6': '2-ipv6',
  '3_高级路由': '3-advanced-routing',
  '4_组播': '4-multicast',
  '5_QoS': '5-qos',
  '6_考试': '6-exam-review',
  '10_路由器基本配置': '10-basic-router-configuration',
  '11_IPv4编址': '11-ipv4-addressing',
  '12_IPv6编址': '12-ipv6-addressing',
  '13_ICMP': '13-icmp',
  '8_网络层': '8-network-layer',
  '9_地址解析': '9-address-resolution',
  '14_路由概念': '14-routing-concepts',
  '15_IP静态路由': '15-ip-static-routing',
  '16_排除静态路由和默认路由故障': '16-troubleshooting-static-and-default-routes',
  '7_DHCPv4': '7-dhcpv4',
  '8_SLAAC和DHCPv6': '8-slaac-and-dhcpv6',
  '1_单区域OSPFv2概念': '1-single-area-ospfv2-concepts',
  '2_单区域OSPFv2配置': '2-single-area-ospfv2-config',
  '9_QoS': '9-qos',
  '1_IR': '1-information-retrieval',
  '2_Link_Analysis': '2-link-analysis',
  '3_LM': '3-language-models',
  '4_Neural_IR': '4-neural-ir',
  '5_Recommendation': '5-recommendation',
  '3_Image_Fundamental': '3-image-fundamentals',
  '4_Basic_Image_Operations': '4-basic-image-operations',
  '5_Low_Level_Feature_Extraction': '5-low-level-feature-extraction',
  '6_Fourier_Analysis': '6-fourier-analysis',
}

function slugify(name) {
  const stem = name.replace(/\.md$/i, '')
  if (FILE_NAME_OVERRIDES[stem]) return FILE_NAME_OVERRIDES[stem]
  return stem
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/['’]/g, '')
    .replace(/;/g, '-')
    .replace(/[_\s]+/g, '-')
    .replace(/\./g, '-')
    .replace(/,/g, '')
    .replace(/[()]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

const map = { files: {}, courses: {} }
const collisions = []
const seen = new Set()

for (const c of courses) {
  const abs = path.join(root, c.src)
  if (!fs.existsSync(abs)) {
    console.error('MISSING COURSE DIR:', c.src)
    process.exitCode = 1
    continue
  }
  map.courses[c.src] = `${c.semester}/${c.slug}`

  // Walk recursively so cisco/CCNA1 subfolders are covered.
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name)
      if (entry.isDirectory()) {
        if (entry.name === 'image') continue
        walk(full)
        continue
      }
      if (!entry.name.toLowerCase().endsWith('.md')) continue

      const relInCourse = path.relative(abs, full).split(path.sep).join('/')
      const dirPart = path.dirname(relInCourse)
      const base = path.basename(relInCourse)

      // Keep cisco/CCNA1 style structure but lowercase the folder names.
      const slugDirs = dirPart === '.' ? '' : dirPart
        .split('/')
        .map((d) => d.toLowerCase())
        .join('/')

      const slugFile = slugify(base) + '.md'
      const newRel = [c.semester, c.slug, slugDirs, slugFile].filter(Boolean).join('/')

      if (seen.has(newRel)) collisions.push(`${newRel}  <- ${relInCourse} (${c.src})`)
      seen.add(newRel)

      map.files[`${c.src}/${relInCourse}`] = newRel
    }
  }
  walk(abs)
}

fs.writeFileSync('scripts/slug-map.json', JSON.stringify(map, null, 2) + '\n')

const fileCount = Object.keys(map.files).length
console.log(`courses mapped : ${Object.keys(map.courses).length}`)
console.log(`md files mapped: ${fileCount}`)
if (collisions.length) {
  console.error('\nSLUG COLLISIONS:')
  collisions.forEach((c) => console.error('  ' + c))
  process.exitCode = 1
} else {
  console.log('no slug collisions')
}
