#! /usr/bin/env node

const program = require('commander')
const fs = require('fs-extra')
const chalk = require('chalk')

const {
  setVerbose,
  infoMessage,
  errorMessage
} = require('./logger/logger')
const {
  isSupportedVersionOfDetect
} = require('./constants/supported-detect-versions')
const extractor = require('./convert-to-dependencies-reference-structure/extract-dependencies-from-source')
const { getAsyncJsonArrayFromCsv } = require('./file-readers/read-csv-to-json-array.js')
const { hasFileExtension } = require('./file-validators/file-extension-validator')

program
  .version('0.0.1', '-v, --version')
  .option(
    '-i, --input [file]',
    '(mandatory) specifies source.csv filename which contains the dependencies as identified by Synopsis Detect'
  )
  .option('-o, --output [filename]', '(optional) specifies the output filename', 'dependencies_from_source.json')
  .option('-d, --detect [value]', '(mandatory) specifies the version of the synopsis detect tool that was used to generate the input file. Defaults to 5.2.0. One of: 5.2.0, 5.6.1')
  .option('--verbose', 'Verbose output of commands and errors')

  .parse(process.argv)

const { input, output, detect, verbose } = program

const processFiles = async () => {
  setVerbose(verbose)

  infoMessage(
    chalk`extract-from-source\n Program arguments:\n    input: {blue ${input}}\n    output: {blue ${output}}\n    detect: {blue ${detect}}\n    verbose: {blue ${verbose}}`
  )

  if (!input) {
    errorMessage(chalk`{red Mandatory input is missing}; program exits`)
    return
  }

  if (!hasFileExtension({ fileName: input, extension: 'csv' })) {
    errorMessage(chalk`Input file ${input} {red is not a csv file}; program exits`)
    return
  }

  if (!detect) {
    errorMessage(chalk`{yellow Missing parameter detect}; program exits`)
    return
  }

  let versionOfDetect = detect
  if (!isSupportedVersionOfDetect({ versionOfDetect })) {
    errorMessage(chalk`{red unsupported detect version: ${versionOfDetect}}; program exits`)
    return
  }

  const rawDependenciesJsonArray = await getAsyncJsonArrayFromCsv({ csvFileName: input })
  infoMessage(chalk`{blue ${rawDependenciesJsonArray.length}} elements read from the csv file {blue ${input}}\n`)

  const detectDependenciesInReferenceFormat = extractor.extractDependenciesToReferenceFormat({ sourcesJsonArray: rawDependenciesJsonArray, versionOfDetect })

  infoMessage(
    chalk`Writing {blue ${detectDependenciesInReferenceFormat.length}} elements to {blue ${output}}`
  )

  try {
    await fs.writeJSON(output, detectDependenciesInReferenceFormat, { spaces: 2, eol: '\n' })
  } catch (e) {
    errorMessage(chalk`Could not write to {blue ${output}}`, e)
  }

  const exactMatchesFilename = `exactMatches_from_source.json`
  const exactMatchesInOriginalFormat = extractor.filterExactMatchesInOriginalFormat({
    sourcesJsonArray: rawDependenciesJsonArray
  })

  infoMessage(
    chalk`Writing {blue ${exactMatchesInOriginalFormat.length}} elements to {blue ${exactMatchesFilename}}`
  )

  try {
    await fs.writeJSON(exactMatchesFilename, exactMatchesInOriginalFormat, { spaces: 2, eol: '\n' })
  } catch (e) {
    errorMessage(chalk`Could not write to {blue ${exactMatchesFilename}}`, e)
  }
}

processFiles()
