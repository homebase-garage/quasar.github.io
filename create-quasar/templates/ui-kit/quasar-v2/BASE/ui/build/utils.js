const
  fs = require('fs'),
  path = require('path'),
  zlib = require('zlib'),
  { green, blue, red, cyan } = require('chalk')

function getSize (code) {
  return (code.length / 1024).toFixed(2) + 'kb'
}

module.exports.createFolder = function (folder) {
  const dir = path.join(__dirname, '..', folder)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
}

module.exports.writeFile = function (dest, code, zip) {
  const banner = dest.includes('.json')
    ? red('[json]')
    : dest.includes('.js')
      ? green('[js]  ')
      : dest.includes('.ts')
        ? cyan('[ts]  ')
        : blue('[css] ')

  return new Promise((resolve, reject) => {
    function report (extra) {
      console.log(`${banner} ${path.relative(process.cwd(), dest).padEnd(41)} ${getSize(code).padStart(8)}${extra || ''}`)
      resolve(code)
    }

    fs.writeFile(dest, code, err => {
      if (err) return reject(err)
      if (zip) {
        zlib.gzip(code, (err, zipped) => {
          if (err) return reject(err)
          report(` (gzipped: ${getSize(zipped).padStart(8)})`)
        })
      }
      else {
        report()
      }
    })
  })
}

module.exports.readFile = function (file) {
  return fs.readFileSync(file, 'utf-8')
}

module.exports.logError = function (err) {
  console.error('\n' + red('[Error]'), err)
  console.log()
}
