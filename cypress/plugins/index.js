/// <reference types="cypress" />
// ***********************************************************
// This example plugins/index.js can be used to load plugins
//
// You can change the location of this file or turn off loading
// the plugins file with the 'pluginsFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/plugins-guide
// ***********************************************************

// This function is called when a project is opened or re-opened (e.g. due to
// the project's config changing)
// const spawn = require('child_process').spawn
const fs = require('fs')
const path = require('path')

const waitOn = require('wait-on')
const extract = require('extract-zip')
const { exec } = require('child_process')

const { sleep } = require('../integration/utils')
const { waitUntilFileExists } = require('../../lib/utils')

const createFolderForFile = (filepath) => {
  const dir = filepath.substring(0, filepath.lastIndexOf('/'))
  if (dir && !fs.existsSync(dir)) {
    fs.mkdirSync(dir, {
      recursive: true
    })
  }
}

const validateExtractedVersion = extractFolder => {
  // Retrieve the name and version from the package.json from the extracted zip file
  const data = fs.readFileSync(path.join(extractFolder, 'package.json'))
  const { name, version } = JSON.parse(data)
  // Retrieve the directory name of the extracted files
  const separator = (extractFolder.indexOf('/') > -1) ? '/' : '\\'
  const dirname = extractFolder.substring(extractFolder.lastIndexOf(separator) + 1)
  // Make sure they match
  if (`${name}-${version}` !== dirname) {
    throw new Error(`Extracted folder ${extractFolder} contains wrong version in package.json >> ${name}-${version}`)
  }
}

const waitForDownload = async (filename, previousModified = -1) => {
  return new Promise((resolve) => {
    const exists = fs.existsSync(filename)
    const currentModified = exists ? fs.statSync(filename).mtime.getTime() : previousModified - 1
    if (previousModified !== currentModified) {
      setTimeout(() => waitForDownload(filename, currentModified).then(resolve), 100)
    } else {
      resolve()
    }
  })
}

const performInstall = async ({ folder }) => {
  exec(`cd ${folder} && npm install`, (err, stdout, stderr) => {
    if (err) {
      throw new Error(err.message)
    } else {
    // the *entire* stdout and stderr (buffered)
      console.log(`stdout: ${stdout}`)
      console.log(`stderr: ${stderr}`)
    }
  })
}

/**
 * @type {Cypress.PluginConfig}
 */
// eslint-disable-next-line no-unused-vars
module.exports = (on, config) => {
  // `on` is used to hook into various events Cypress emits
  // `config` is the resolved Cypress config

  config.env.projectFolder = process.env.KIT_TEST_DIR || process.cwd()
  config.env.tempFolder = path.join(__dirname, '..', 'temp')

  const packagePath = path.join(config.env.projectFolder, 'package.json')
  const packageContent = fs.readFileSync(packagePath, 'utf8')
  const packageObject = JSON.parse(packageContent)
  const dependencies = packageObject.dependencies || {}

  if ('govuk-prototype-kit' in dependencies) {
    config.env.packageFolder = path.join(config.env.projectFolder, 'node_modules', 'govuk-prototype-kit')
  }

  const waitUntilAppRestarts = async (timeout) => await waitOn({ delay: 2000, resources: [config.baseUrl], timeout })

  on('task', {
    downloaded: async ({ filename, downloadsFolder }) => {
      try {
        const fullFilename = path.join(downloadsFolder, filename)
        await waitForDownload(fullFilename)
        await extract(fullFilename, { dir: downloadsFolder })
        const extractFolder = fullFilename.substring(0, fullFilename.lastIndexOf('.zip'))
        validateExtractedVersion(extractFolder)
        return Promise.resolve(null)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  })

  on('task', {
    copyFile: async ({ source, target }) => {
      try {
        createFolderForFile(target)
        fs.copyFileSync(source, target)
        // The sleep of 2 seconds allows for the file to be copied completely to prevent
        // it from not existing when the file is needed in a subsequent step
        await sleep(2000) // pause after the copy
        return Promise.resolve(null)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  })

  on('task', {
    installApp: async ({ timeout }) => {
      try {
        const downloadsFolder = path.join('cypress', 'downloads')
        const files = fs.readdirSync(downloadsFolder)
        if (files.length) {
          const folder = path.join(downloadsFolder, files[0])
          await performInstall({ folder })
          const filename = path.join(folder, 'node_modules', 'govuk-frontend', 'package.json')
          await waitUntilFileExists(filename, timeout)
        }
        return Promise.resolve(null)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  })

  on('task', {
    createFile: async ({ filename, data, replace = false }) => {
      try {
        createFolderForFile(filename)
        fs.writeFileSync(filename, data, {
          flag: replace ? 'w' : '' // Flag of w will overwrite
        })
        return Promise.resolve(null)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  })

  on('task', {
    appendFile: async ({ filename, data }) => {
      try {
        fs.appendFileSync(filename, data)
        return Promise.resolve(null)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  })

  on('task', {
    deleteFile: async ({ filename, timeout }) => {
      try {
        fs.unlinkSync(filename)
        await sleep(timeout)
        return Promise.resolve(null)
      } catch (err) {
        if (err.code !== 'ENOENT') {
          return Promise.reject(err)
        }
        return Promise.resolve(null)
      }
    }
  })

  on('task', {
    waitUntilAppRestarts: async (config) => {
      const { timeout = 20000 } = config || {}
      try {
        await waitUntilAppRestarts(timeout)
        return Promise.resolve(null)
      } catch (err) {
        return Promise.reject(err)
      }
    }
  })

  on('task', {
    log (message) {
      console.log(`${new Date().toLocaleTimeString()} => ${message}`)
      return null
    }
  })

  return config
}
