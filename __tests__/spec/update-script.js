/* eslint-env jest */
const child_process = require('child_process') // eslint-disable-line camelcase
const fs = require('fs')
const path = require('path')
const process = require('process')

const _ = require('lodash')

const utils = require('./utils')
const fse = require('fs-extra')

/*
 * Constants
 */

const repoDir = path.resolve(__dirname, '..', '..')
const script = path.join(repoDir, 'update.sh')

// When running tests using Windows GitHub runner, make sure to use gitbash.
// Path is from https://github.com/actions/virtual-environments/blob/win19/20211110.1/images/win/Windows2019-Readme.md
const bash = process.platform === 'win32' ? 'C:\\Program Files\\Git\\bin\\bash.exe' : '/bin/bash'

/*
 * Test helpers
 */

/**
 * Run update.sh, or one of the functions defined in it.
 *
 * runScriptSync([fnName][, options])
 *
 * Examples:
 * runScriptSync()  // runs `update.sh` in current working directory
 * runScriptSync({ testDir: 'example' })  // runs `update.sh` in directory `example`
 * runScriptSync('extract', { testDir: 'example' })  // runs `source update.sh && extract` in directory `example`
 *
 * Returns an object with output of `stdout`, `stderr`, and exit code in `status`.
 *
 * If the option `trace` is true, then the return object will also have an
 * array of strings `trace` which lists the commands called by the scripts (see
 * the bash man page and the option xtrace).
 *
 * Throws an error if the spawn fails, but does not throw an error if the
 * return status of the script or function is non-zero.
 */
function runScriptSync (fnName = undefined, options) {
  if (typeof fnName === 'object') {
    options = fnName
    fnName = undefined
  }

  const opts = {
    ...options,
    cwd: options.testDir,
    encoding: 'utf8',
    env: { LANG: process.env.LANG, PATH: process.env.PATH, ...(options.env || {}) }
  }

  let args

  if (fnName) {
    args = ['-c', `source '${script}' && ${fnName}`]
  } else {
    args = [script]
  }

  if (options.trace) {
    args.unshift('-x')
    opts.env.PS4 = '+xtrace '
  }

  const ret = child_process.spawnSync(bash, args, opts)

  if (options.trace) {
    // split the trace lines out from stderr
    let { stderr, trace } = _.groupBy(
      ret.stderr.split(/(^\++xtrace [^\n]+)\n/m),
      (line) => /^\++xtrace [^\n]+/.test(line) ? 'trace' : 'stderr'
    )
    stderr = stderr.join('')
    trace = trace.map((line) => line.replace(/^(\++)xtrace /, '$1 '))
    ret.stderr = stderr
    ret.trace = trace
  }

  if (ret.error) {
    throw (ret.error)
  }

  return ret
}

function runScriptSyncAndExpectSuccess (fnName = undefined, options) {
  if (typeof fnName === 'object') {
    options = fnName
    fnName = undefined
  }

  const ret = runScriptSync(fnName, options)
  if (ret.status !== 0) {
    throw new Error(`update.sh in ${path.resolve(options.testDir)} failed with status ${ret.status}:\n${ret.stderr}`)
  }
  return ret
}

function runScriptSyncAndExpectError (fnName, options) {
  if (typeof fnName === 'object') {
    options = fnName
    fnName = undefined
  }

  const oldStat = fs.statSync(options.testDir)

  const ret = runScriptSync(fnName, options)

  expect(ret.status).not.toBe(0)
  expect(ret.stderr).toMatch(/ERROR/)

  // tests that no files have been added or removed in test directory
  const newStat = fs.statSync(options.testDir)
  expect(newStat.mtimeMs).toBe(oldStat.mtimeMs)

  return ret
}

function execGitStatusSync (testDir) {
  return child_process.execSync(
    'git status --porcelain', { cwd: testDir, encoding: 'utf8' }
  ).split('\n').slice(0, -1)
}

describe('update.sh', () => {
  const _cwd = process.cwd()

  // Following tests will run in a temporary directory, to avoid messing up the project
  const tmpDir = utils.mkdtempSync()
  const fixtureDir = path.resolve(tmpDir, '__fixtures__')

  /*
   * Fixture helpers
   */

  function mktestDirSync (testDir) {
    fs.mkdirSync(testDir)

    fs.writeFileSync(path.join(testDir, 'package.json'), '{\n  "name": "govuk-prototype-kit"\n}')
    fs.writeFileSync(path.join(testDir, 'VERSION.txt'), '0.0.0')

    return testDir
  }

  // Create a test archive fixture
  function _mktestArchiveSync (archive) {
    const archiveName = path.basename(archive)
    const dirToArchive = path.join(fixtureDir, 'govuk-prototype-kit-foo')

    fs.mkdirSync(dirToArchive)
    fs.writeFileSync(path.join(dirToArchive, 'foo'), '')
    fs.writeFileSync(path.join(dirToArchive, 'VERSION.txt'), '9999.99.99')

    if (process.platform === 'win32') {
      child_process.execSync(`7z a ${archiveName} govuk-prototype-kit-foo`, { cwd: fixtureDir })
    } else {
      child_process.execSync(`zip -r ${archiveName} govuk-prototype-kit-foo`, { cwd: fixtureDir })
    }
  }

  function mktestArchiveSync (testDir) {
    const archive = path.resolve(fixtureDir, 'foo.zip')

    try {
      fs.accessSync(archive)
    } catch (error) {
      _mktestArchiveSync(archive)
    }

    if (testDir) {
      const dest = path.join(testDir, 'update', 'govuk-prototype-kit-foo.zip')
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(archive, path.join(testDir, 'update', 'govuk-prototype-kit-foo.zip'))
      return dest
    } else {
      return archive
    }
  }

  function _mktestPrototypeSync (src) {
    // Create a release archive from the HEAD we are running tests in
    const archivePath = utils.mkReleaseArchiveSync()
    const releaseDir = path.parse(archivePath).name

    utils.mkPrototypeSync(src)

    // Create a git repo from the new release archive so we can see changes.
    child_process.execFileSync('git', ['init'], { cwd: src })
    child_process.execFileSync('git', ['config', 'user.email', 'test@example.com'], { cwd: src })
    child_process.execFileSync('git', ['config', 'user.name', 'Jest Tests'], { cwd: src })

    child_process.execFileSync('git', ['add', '.'], { cwd: src })
    child_process.execFileSync('git', ['commit', '-m', 'Initial commit'], { cwd: src })

    // let's imagine our prototype has been customised slightly
    let config = fs.readFileSync(path.join(src, 'app', 'config.js'), 'utf8')
    config = config.replace('DWP Notifications', 'Jest test service')
    fs.writeFileSync(path.join(src, 'app', 'config.js'), config, 'utf8')

    // and it has been run
    fs.writeFileSync(path.join(src, 'usage-data-config.json'), '{}')

    child_process.execFileSync('git', ['commit', '-m', 'Test', '-a'], { cwd: src })

    // populate the update folder to speed up tests
    child_process.execSync(`unzip -q ${archivePath}`, { cwd: src })
    child_process.execSync(`mv ${releaseDir} update`, { cwd: src })
    fs.copyFileSync(archivePath, path.join(src, 'update', path.basename(archivePath)))
  }

  function mktestPrototypeSync (dest) {
    const src = path.resolve(fixtureDir, 'prototype')
    try {
      fs.accessSync(src)
    } catch (error) {
      _mktestPrototypeSync(src)
    }

    if (dest) {
      child_process.execSync(`cp -r ${src} ${dest}`)
      return dest
    } else {
      return src
    }
  }

  beforeAll(() => {
    process.chdir(tmpDir)
    console.log('Running tests in temporary directory', process.cwd())

    // setup fixtures
    // - running this now saves time later
    // - ensureDirSync is used to prevent a failure where the fixtureDir already exists from a previous test
    fse.ensureDirSync(fixtureDir)
    mktestArchiveSync()
    mktestPrototypeSync()
  })

  /*
   * Tests
   */

  describe('check', () => {
    it('exits with error if run in an empty folder', () => {
      const testDir = 'empty'
      fs.mkdirSync(testDir)

      runScriptSyncAndExpectError({ testDir })
    })

    it('exits with error if folder does not contain a package.json file', () => {
      const testDir = 'no-package-json'
      fs.mkdirSync(testDir)
      fs.writeFileSync(path.join(testDir, 'foo'), 'my important data about govuk-prototype-kit')
      fs.writeFileSync(path.join(testDir, 'bar'), "don't delete my data!")

      runScriptSyncAndExpectError({ testDir })
    })

    it('exits with error if package.json file does not contain string govuk-prototype-kit', () => {
      const testDir = mktestDirSync('no-govuk-prototype-kit')
      fs.writeFileSync(path.join(testDir, 'package.json'), '{\n  "name": "test"\n}')

      runScriptSyncAndExpectError({ testDir })
    })

    it('exits with error if package.json file contains string containing govuk-prototype-kit', () => {
      const testDir = mktestDirSync('name-contains-govuk-prototype-kit')
      fs.writeFileSync(path.join(testDir, 'package.json'), '{\n  "name": "govuk-prototype-kit-test"\n}')

      runScriptSyncAndExpectError({ testDir })
    })
  })

  describe('prepare', () => {
    it('removes existing update folder', () => {
      const testDir = 'prepare'
      fs.mkdirSync(path.join(testDir, 'update'), { recursive: true })
      fs.writeFileSync(path.join(testDir, 'update', 'govuk-prototype-kit-empty.zip'), '')
      const oldStat = fs.statSync(path.join(testDir, 'update'))

      runScriptSyncAndExpectSuccess('prepare', { testDir })

      const newStat = fs.statSync(path.join(testDir, 'update'))

      // tests that update folder _has_ been replaced
      expect(newStat.birthtimeMs).not.toBe(oldStat.birthtimeMs)
      expect(() => {
        fs.accessSync(path.join(testDir, 'update', 'govuk-prototype-kit-empty.zip'))
      }).toThrowError()
    })

    it('does not remove existing update folder if CLEAN=0 is set', () => {
      const testDir = 'prepare-noclean'
      fs.mkdirSync(path.join(testDir, 'update'), { recursive: true })
      fs.writeFileSync(path.join(testDir, 'update', 'govuk-prototype-kit-empty.zip'), '')
      const oldStat = fs.statSync(path.join(testDir, 'update'))

      runScriptSyncAndExpectSuccess('prepare', { testDir, env: { CLEAN: '0' } })

      const newStat = fs.statSync(path.join(testDir, 'update'))

      // tests that update folder has _not_ been replaced
      expect(newStat.birthtimeMs).toBe(oldStat.birthtimeMs)
      expect(() => {
        fs.accessSync(path.join(testDir, 'update', 'govuk-prototype-kit-empty.zip'))
      }).not.toThrowError()
    })

    it('hides the update folder from git', () => {
      const testDir = 'prepare-gitignore'
      fs.mkdirSync(testDir)

      runScriptSyncAndExpectSuccess('prepare', { testDir })

      expect(
        fs.readFileSync(path.join(testDir, 'update', '.gitignore'), 'utf8').trim()
      ).toBe('*')
    })
  })

  describe('fetch', () => {
    it('downloads the latest release of the prototype kit into the update folder', async () => {
      const testDir = 'fetch'
      fs.mkdirSync(path.join(testDir, 'update'), { recursive: true })

      const ret = runScriptSyncAndExpectSuccess('fetch', { testDir, trace: true })

      expect(ret.trace).toEqual(expect.arrayContaining([
        expect.stringMatching('curl( -[LJO]*)? https://govuk-prototype-kit.herokuapp.com/docs/download')
      ]))

      expect(fs.readdirSync(path.join(testDir, 'update'))).toEqual([
        expect.stringMatching(/govuk-prototype-kit-\d+\.\d+\.\d+\.zip/)
      ])
    })
  })

  describe('extract', () => {
    it('extracts the release into the update folder', () => {
      const testDir = 'extract'
      mktestArchiveSync(testDir)

      runScriptSyncAndExpectSuccess('extract', { testDir })

      // note that the extract process should strip 1 leading component from the path,
      // so even though the archive contains:
      //   - ./govuk-prototype-kit-foo/foo
      // what we should end up with is:
      //   - ./foo
      // This is so users don't have to go digging through a complicated
      // directory heirarchy after the script has asked them to manage their config.
      fs.accessSync(path.join(testDir, 'update', 'foo'))
      expect(() => {
        fs.accessSync(path.join(testDir, 'update', 'govuk-prototype-kit-foo', 'foo'))
      }).toThrow()
    })
  })

  describe('copy', () => {
    it('updating an existing up-to-date prototype does nothing', () => {
      const testDir = mktestPrototypeSync('up-to-date')

      runScriptSyncAndExpectSuccess('copy', { testDir })

      // expect that `git status` reports no files added, changed, or removed
      expect(execGitStatusSync(testDir)).toEqual([])
    })

    it('does not remove the analytics consent', () => {
      const testDir = mktestPrototypeSync('usage-data-config')

      const oldStat = fs.statSync(path.join(testDir, 'usage-data-config.json'))

      runScriptSyncAndExpectSuccess('copy', { testDir })

      const newStat = fs.statSync(path.join(testDir, 'usage-data-config.json'))
      expect(newStat.mtimeMs).toBe(oldStat.mtimeMs)
    })

    it('removes files that have been removed from docs, build and lib folders', () => {
      const testDir = mktestPrototypeSync('remove-dangling-files')

      const updateDir = path.join(testDir, 'update')
      fs.unlinkSync(path.join(updateDir, 'lib', 'build', 'config.json'))
      fs.unlinkSync(path.join(updateDir, 'docs', 'documentation', 'session.md'))
      fs.unlinkSync(path.join(updateDir, 'lib', 'v6', 'govuk_template_unbranded.html'))
      fs.rmdirSync(path.join(updateDir, 'lib', 'v6'))

      runScriptSyncAndExpectSuccess('copy', { testDir })

      expect(execGitStatusSync(testDir)).toEqual([
        ' D docs/documentation/session.md',
        ' D lib/build/config.json',
        ' D lib/v6/govuk_template_unbranded.html'
      ])
    })

    it('removes gulp files and adds build files if the release does not contain gulp', () => {
      const testDir = mktestPrototypeSync('remove-gulp-files')

      fs.mkdirSync(path.join(testDir, 'gulp'))
      fs.writeFileSync(path.join(testDir, 'gulp', 'watch.js'), 'foo')
      fs.writeFileSync(path.join(testDir, 'gulpfile.js'), 'bar')
      child_process.execSync('git add gulp/watch.js gulpfile.js', { cwd: testDir })
      child_process.execSync('git rm -r lib/build', { cwd: testDir })
      child_process.execSync('git commit -q -m "Ensure gulp files exist"', { cwd: testDir })

      runScriptSyncAndExpectSuccess('copy', { testDir })

      expect(execGitStatusSync(testDir)).toEqual([
        ' D gulp/watch.js',
        ' D gulpfile.js',
        '?? lib/build/'
      ])
    })

    it('does not change files in apps folder, except for in assets/sass/patterns', () => {
      const testDir = mktestPrototypeSync('preserve-app-folder')

      const updateDir = path.join(testDir, 'update')
      fs.writeFileSync(path.join(updateDir, 'app', 'assets', 'sass', 'patterns', '_task-list.scss'), 'foobar')
      fs.writeFileSync(path.join(updateDir, 'app', 'routes.js'), 'arglebargle')

      runScriptSyncAndExpectSuccess('copy', { testDir })

      expect(execGitStatusSync(testDir)).toEqual([
        ' M app/assets/sass/patterns/_task-list.scss'
      ])
    })

    it('it outputs errors and logs them to a file', () => {
      const testDir = mktestDirSync('error-logging')
      mktestArchiveSync(testDir)

      runScriptSyncAndExpectSuccess('extract', { testDir })
      const ret = runScriptSync('copy', { testDir })

      // we expect this to fail because the test archive doesn't have a docs folder
      expect(ret.status).toBe(1)

      expect(ret.stderr).toMatch(/No such file or directory/)
      expect(ret.stderr).toMatch(/ERROR/)
      expect(
        fs.readFileSync(path.join(testDir, 'update', 'update.log'), 'utf8')
      ).toMatch(/No such file or directory/)
    })

    it('hides the update folder from git', () => {
      const testDir = mktestPrototypeSync('copy-gitignore')

      runScriptSyncAndExpectSuccess('copy', { testDir })

      expect(
        fs.readFileSync(path.join(testDir, 'update', '.gitignore'), 'utf8').trim()
      ).toBe('*')
    })
  })

  it('can be run as a piped script', () => {
    const testDir = mktestPrototypeSync('pipe')

    child_process.execSync(`cat '${script}' | bash`, { cwd: testDir, shell: bash, stdio: 'ignore' })
  })

  it('hides the update folder from git', () => {
    const testDir = mktestPrototypeSync('gitignore')

    runScriptSyncAndExpectSuccess({ testDir })

    expect(execGitStatusSync(testDir)).not.toContain('?? update/')
  })

  it('does nothing if check fails', () => {
    const testDir = mktestPrototypeSync('if-check-fails')
    child_process.execSync('rm -rf update', { cwd: testDir })

    fs.writeFileSync(path.join(testDir, 'package.json'), '{\n  "name": "my-very-customised-prototype" \n}')
    child_process.execSync('git commit -q -m "Customise my prototype" -a', { cwd: testDir })

    runScriptSyncAndExpectError({ testDir })

    expect(execGitStatusSync(testDir)).toEqual([])
  })

  afterAll(() => {
    process.chdir(_cwd)
  })
})
