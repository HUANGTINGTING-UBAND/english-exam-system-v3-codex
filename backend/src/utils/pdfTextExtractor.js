const pdfParseModule = require('pdf-parse')

const getCallablePdfParser = () => {
  if (typeof pdfParseModule === 'function') {
    return pdfParseModule
  }

  if (typeof pdfParseModule.default === 'function') {
    return pdfParseModule.default
  }

  if (typeof pdfParseModule.pdfParse === 'function') {
    return pdfParseModule.pdfParse
  }

  if (typeof pdfParseModule.parse === 'function') {
    return pdfParseModule.parse
  }

  return null
}

const extractTextWithClassParser = async (buffer) => {
  const ParserClass = pdfParseModule.PDFParse || pdfParseModule.default?.PDFParse

  if (!ParserClass) {
    return null
  }

  const parser = new ParserClass({
    data: buffer,
  })

  try {
    const result = await parser.getText()
    return result?.text || ''
  } finally {
    if (typeof parser.destroy === 'function') {
      await parser.destroy()
    }
  }
}

const extractPdfText = async (buffer) => {
  const callablePdfParser = getCallablePdfParser()

  if (callablePdfParser) {
    const result = await callablePdfParser(buffer)
    return result?.text || ''
  }

  const classParserText = await extractTextWithClassParser(buffer)

  if (classParserText !== null) {
    return classParserText
  }

  throw new Error('当前 pdf-parse 版本不支持已知的文本提取接口')
}

module.exports = {
  extractPdfText,
}
